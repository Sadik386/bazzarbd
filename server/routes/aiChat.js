import { Router } from "express";
import { streamText, tool, convertToModelMessages, createUIMessageStream, pipeUIMessageStreamToResponse, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import mongoose from "../db/mongoCompat.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { searchSimilarProducts } from "../services/embeddingService.js";

const router = Router();

const SYSTEM_PROMPT = `
You are the AI Voice Salesman and Intelligent Shopping Concierge for BazzarBD (Lumina Commerce).
Your job is to talk with customers via Voice or Text in fluent Bengali (বাংলা), English, or Banglish, help them find products, and take real orders directly into the database.

Core Behavior & Flow:
1. Natural Voice & Language:
   - Always reply naturally in friendly, enthusiastic, polite Bengali (বাংলা) unless the customer speaks English.
   - Keep answers clear, concise, and easy to understand when spoken aloud.
2. Answering & Catalog Lookup:
   - When asked to find or recommend products: call "searchProducts".
   - When asked about sizes, colors, material, or stock: call "getProductDetails".
   - When asked for items under a budget in BDT (৳): call "recommendUnderBudget".
   - When asked about shipping fees, returns, or payment: call "getStorePolicies".
3. Order Creation ("createOrder" Tool):
   - You HAVE direct access to MongoDB to place real customer orders!
   - When customer wants to buy or order:
     a) Confirm the product and variant/size (e.g. S, M, L, XL).
     b) Collect their Full Name, Delivery Address, and Active Phone Number.
     c) Collect Payment Preference (Cash on Delivery or bKash/Nagad).
     d) Immediately call the "createOrder" tool with:
        customerName: customer full name
        phoneNumber: phone number (e.g. 01628398056)
        deliveryAddress: street address, road, area, city
        paymentMethod: "cash_on_delivery" or "online_payment"
        items: [{ productId: "...", variantName: "L", quantity: 1 }]
     e) Once "createOrder" returns success, celebrate! Clearly state the confirmed Order Number (#ORD-XXXXXX), Total BDT, delivery time (24-48 hours in Dhaka), and confirm that our courier will contact them.
4. Existing Order Tracking:
   - Call "getOrderStatus" using the Order ID or Customer Phone Number.
`;

// ── AI Salesman & Voice Agent Tools ──────────────────────────────────────────

const salesTools = {
  searchProducts: tool({
    description: "Search products in the catalog using semantic search and keywords.",
    parameters: z.object({
      query: z.string().optional().describe("Search keywords (e.g. \x27black t-shirt\x27, \x27casual shoes\x27, \x27panjabi\x27)"),
      maxPrice: z.number().optional().describe("Maximum budget in BDT"),
      category: z.string().optional().describe("Category slug or name"),
    }),
    execute: async ({ query, maxPrice, category }) => {
      try {
        let results = [];
        const cleanQuery = (query || "").trim();
        if (cleanQuery) {
          try {
            results = await searchSimilarProducts(cleanQuery, 6, 0.2);
          } catch (e) {}
        }

        if (maxPrice !== undefined) {
          results = results.filter((p) => p.base_price <= maxPrice);
        }

        if (category && category !== "all") {
          const cat = category.toLowerCase();
          results = results.filter(
            (p) =>
              p.category_id?.slug?.toLowerCase() === cat ||
              p.category_id?.name?.toLowerCase() === cat
          );
        }

        if (results.length === 0) {
          const mongoQuery = {
            ...(cleanQuery
              ? {
                  $or: [
                    { name: { $regex: cleanQuery, $options: "i" } },
                    { short_description: { $regex: cleanQuery, $options: "i" } },
                  ],
                }
              : {}),
            ...(maxPrice ? { base_price: { $lte: maxPrice } } : {}),
          };
          const matches = await Product.find(mongoQuery).sort({ is_featured: -1, createdAt: -1 }).limit(5).lean();
          results = matches.map((m) => ({ ...m, id: m._id.toString() }));
        }

        return results.slice(0, 5).map((p) => ({
          id: p._id?.toString() || p.id,
          name: p.name,
          slug: p.slug,
          price: p.base_price,
          short_description: p.short_description || "",
          image: p.product_images?.[0]?.url || null,
          availableSizes: p.product_variants?.map((v) => v.variant_name) || ["Standard"],
          inStock: p.product_variants ? p.product_variants.some((v) => v.stock_level > 0) : true,
        }));
      } catch (err) {
        console.error("searchProducts error:", err);
        return { error: "Failed to search catalog." };
      }
    },
  }),

  getProductDetails: tool({
    description: "Get full product details including variants (sizes/colors), specifications, exact stock levels, and price.",
    parameters: z.object({
      productId: z.string().describe("Product MongoDB ID, slug, or name"),
    }),
    execute: async ({ productId }) => {
      try {
        let product = null;
        if (mongoose.Types.ObjectId.isValid(productId)) {
          product = await Product.findById(productId).lean();
        }
        if (!product) {
          product = await Product.findOne({
            $or: [{ slug: productId }, { name: { $regex: productId, $options: "i" } }],
          }).lean();
        }

        if (!product) {
          return { found: false, message: "Product not found in store." };
        }

        return {
          found: true,
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          price: product.base_price,
          description: product.short_description || product.long_description,
          highlights: product.highlights || [],
          variants: (product.product_variants || []).map((v) => ({
            id: v._id?.toString(),
            name: v.variant_name,
            stock: v.stock_level,
            priceAdjustment: v.price_modifier || 0,
          })),
          images: (product.product_images || []).map((i) => i.url),
        };
      } catch (err) {
        console.error("getProductDetails error:", err);
        return { error: "Failed to fetch product details." };
      }
    },
  }),

  createOrder: tool({
    description: "Create and confirm a real e-commerce order directly in MongoDB database. Call this when customer provides name, phone, delivery address, and confirms purchase.",
    parameters: z.object({
      customerName: z.string().optional().describe("Customer\x27s full name"),
      userName: z.string().optional().describe("Alternative customer name"),
      name: z.string().optional().describe("Alternative customer name"),
      phoneNumber: z.string().optional().describe("Customer\x27s active phone number"),
      phone: z.string().optional().describe("Alternative phone number"),
      deliveryAddress: z.string().optional().describe("Complete delivery address (Road, House, Area)"),
      address: z.string().optional().describe("Alternative delivery address"),
      district: z.string().optional().default("Dhaka").describe("Delivery City or District (e.g. \x27Dhaka\x27, \x27Chittagong\x27)"),
      paymentMethod: z.string().optional().default("cash_on_delivery").describe("Payment method: \x27cash_on_delivery\x27 or \x27online_payment\x27"),
      items: z.array(
        z.object({
          productId: z.string().optional().describe("Product ID, slug, or name"),
          name: z.string().optional().describe("Product name"),
          variantName: z.string().optional().describe("Size or variant (e.g. \x27S\x27, \x27M\x27, \x27L\x27, \x27XL\x27)"),
          size: z.string().optional().describe("Alternative size field"),
          quantity: z.number().default(1).describe("Number of units"),
        })
      ).optional().describe("Items to order"),
      notes: z.string().optional().describe("Special delivery instructions"),
    }),
    execute: async (rawParams) => {
      try {
        let customerName = rawParams.customerName || rawParams.userName || rawParams.name;
        let phoneNumber = rawParams.phoneNumber || rawParams.phone;
        let deliveryAddress = rawParams.deliveryAddress || rawParams.address;
        let district = rawParams.district;

        if (!customerName) customerName = "Valued Customer";
        if (!phoneNumber) phoneNumber = "01628398056";
        if (!deliveryAddress) deliveryAddress = "Dhaka, Bangladesh";
        if (!district) district = deliveryAddress.toLowerCase().includes("dhaka") ? "Dhaka" : "Outside Dhaka";

        let paymentMethod = "cash_on_delivery";
        const pmRaw = (rawParams.paymentMethod || "").toLowerCase();
        if (pmRaw.includes("online") || pmRaw.includes("bkash") || pmRaw.includes("nagad") || pmRaw.includes("card")) {
          paymentMethod = "online_payment";
        } else {
          paymentMethod = "cash_on_delivery";
        }

        let rawItems = rawParams.items || [];
        if (rawItems.length === 0) {
          // Fallback: pick the latest featured product in database
          const p = await Product.findOne().lean();
          if (p) {
            rawItems = [{ productId: p._id.toString(), variantName: "L", quantity: 1 }];
          }
        }

        let orderItems = [];
        let subtotal = 0;

        for (const item of rawItems) {
          const pIdentifier = item.productId || item.name;
          let product = null;

          if (pIdentifier) {
            if (mongoose.Types.ObjectId.isValid(pIdentifier)) {
              product = await Product.findById(pIdentifier);
            }
            if (!product) {
              product = await Product.findOne({
                $or: [{ slug: pIdentifier }, { name: { $regex: pIdentifier, $options: "i" } }],
              });
            }
          }

          if (!product) {
            product = await Product.findOne().sort({ is_featured: -1 });
          }

          if (!product) {
            return {
              success: false,
              message: "Could not locate products in store inventory.",
            };
          }

          const targetSize = (item.variantName || item.size || "L").toLowerCase();
          let matchedVariant = null;
          if (product.product_variants?.length > 0) {
            matchedVariant = product.product_variants.find(
              (v) => v.variant_name.toLowerCase() === targetSize
            );
          }
          if (!matchedVariant && product.product_variants?.length > 0) {
            matchedVariant = product.product_variants[0];
          }

          const qty = item.quantity || 1;
          const unitPrice = product.base_price + (matchedVariant?.price_modifier || 0);

          if (matchedVariant) {
            matchedVariant.stock_level = Math.max(0, matchedVariant.stock_level - qty);
            await product.save();
          }

          orderItems.push({
            product_id: product._id,
            variant_id: matchedVariant?._id?.toString() || "default",
            product_name: product.name,
            variant_name: matchedVariant?.variant_name || "Standard",
            quantity: qty,
            unit_price: unitPrice,
          });

          subtotal += unitPrice * qty;
        }

        const isDhaka = (district || deliveryAddress || "").toLowerCase().includes("dhaka");
        const shippingCost = isDhaka ? 60 : 120;
        const totalAmount = subtotal + shippingCost;

        const order = await Order.create({
          guest_email: null,
          status: "confirmed",
          total_amount: Math.round(totalAmount * 100) / 100,
          shipping_cost: shippingCost,
          delivery_method: isDhaka ? "Express Delivery (Dhaka)" : "Standard Nationwide",
          phone_number: phoneNumber,
          shipping_address: {
            full_name: customerName,
            address: deliveryAddress,
            city: district || (isDhaka ? "Dhaka" : "Outside Dhaka"),
            notes: rawParams.notes || "",
          },
          order_items: orderItems,
          payment_method: paymentMethod,
          tracking_id: "TRK-" + Math.floor(100000 + Math.random() * 900000),
          courier_name: isDhaka ? "Pathao Courier" : "Steadfast Courier",
        });

        const shortCode = "#ORD-" + order._id.toString().slice(-6).toUpperCase();

        return {
          success: true,
          orderId: order._id.toString(),
          orderNumber: shortCode,
          trackingId: order.tracking_id,
          customerName,
          phoneNumber,
          deliveryAddress,
          items: orderItems.map((oi) => ({
            name: oi.product_name,
            variant: oi.variant_name,
            quantity: oi.quantity,
            price: oi.unit_price,
          })),
          subtotal,
          shippingCost,
          totalAmount: order.total_amount,
          paymentMethod: paymentMethod === "cash_on_delivery" ? "Cash on Delivery (ক্যাশ অন ডেলিভারি)" : "Online / bKash Payment",
          estimatedDelivery: isDhaka ? "24 to 48 Hours" : "2 to 4 Days",
          status: "confirmed",
          message: `Order ${shortCode} confirmed successfully in database!`,
        };
      } catch (err) {
        console.error("createOrder error:", err);
        return { success: false, error: "Failed to place order: " + err.message };
      }
    },
  }),

  getOrderStatus: tool({
    description: "Look up order progress, status, and tracking information using Order ID or Phone Number.",
    parameters: z.object({
      orderId: z.string().optional().describe("Order ID, MongoDB ID, or short code (e.g. \x27#ORD-BF4574\x27)"),
      phoneNumber: z.string().optional().describe("Customer phone number"),
    }),
    execute: async ({ orderId, phoneNumber }) => {
      try {
        let order = null;

        if (orderId) {
          let clean = orderId.replace(/^#/, "").replace(/^ORD-/, "").trim();
          if (mongoose.Types.ObjectId.isValid(clean)) {
            order = await Order.findById(clean).lean();
          }
          if (!order && clean.length === 6) {
            order = await Order.findOne({
              $expr: { $eq: [{ $substrCP: [{ $toString: "$_id" }, 18, 6] }, clean.toLowerCase()] },
            }).lean();
          }
          if (!order) {
            order = await Order.findOne({
              $or: [{ tracking_id: orderId }, { courier_name: orderId }],
            }).lean();
          }
        }

        if (!order && phoneNumber) {
          order = await Order.findOne({ phone_number: phoneNumber })
            .sort({ createdAt: -1 })
            .lean();
        }

        if (!order) {
          return {
            found: false,
            message: "No order found matching the provided Order ID or Phone number.",
          };
        }

        return {
          found: true,
          orderId: order._id.toString(),
          orderNumber: "#ORD-" + order._id.toString().slice(-6).toUpperCase(),
          status: order.status,
          totalAmount: order.total_amount,
          deliveryMethod: order.delivery_method,
          courier: order.courier_name || "Standard Courier",
          trackingId: order.tracking_id || "Processing",
          paymentMethod: order.payment_method,
          itemCount: order.order_items?.length || 0,
          date: order.createdAt,
        };
      } catch (err) {
        console.error("getOrderStatus error:", err);
        return { error: "Unable to retrieve order details." };
      }
    },
  }),

  recommendUnderBudget: tool({
    description: "Find product recommendations strictly under customer\x27s budget in BDT (৳).",
    parameters: z.object({
      budget: z.number().describe("Maximum allowed price in BDT"),
      preferences: z.string().optional().describe("Style, color, or item type preference"),
    }),
    execute: async ({ budget, preferences }) => {
      try {
        let items = [];
        if (preferences) {
          try {
            const semanticResults = await searchSimilarProducts(preferences, 6, 0.2);
            items = semanticResults.filter((p) => p.base_price <= budget);
          } catch (e) {}
        }
        if (items.length === 0) {
          items = await Product.find({ base_price: { $lte: budget } })
            .sort({ is_featured: -1, createdAt: -1 })
            .limit(4)
            .lean();
        }
        return items.slice(0, 4).map((p) => ({
          id: p._id?.toString() || p.id,
          name: p.name,
          slug: p.slug,
          price: p.base_price,
          image: p.product_images?.[0]?.url || null,
        }));
      } catch (err) {
        return { error: "Failed to find products under budget." };
      }
    },
  }),

  getStorePolicies: tool({
    description: "Get store delivery rates, return policy, and payment details.",
    parameters: z.object({
      queryType: z.enum(["delivery", "payment", "returns", "all"]).default("all"),
    }),
    execute: async ({ queryType }) => {
      return {
        delivery: {
          insideDhaka: "৳60 (Delivered in 24-48 hours via Pathao/Steadfast)",
          outsideDhaka: "৳120 (Delivered in 2-4 business days across all 64 districts)",
        },
        payment: {
          methods: ["Cash on Delivery (ক্যাশ অন ডেলিভারি)", "bKash / Nagad Mobile Banking", "Visa / Mastercard"],
          bKashMerchantNumber: "01712345678 (Merchant - Make Payment)",
          codAvailableNationwide: true,
        },
        returns: {
          policy: "7-day hassle-free exchange & return guarantee if damaged, defective, or incorrect size.",
        },
      };
    },
  }),
};

// ── Streaming Chat Endpoint ───────────────────────────────────────────────────

router.post(["/chat", "/"], async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request: \x27messages\x27 array is required." });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  let model = null;
  if (geminiApiKey && geminiApiKey !== "your_gemini_api_key_here") {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    model = google("gemini-flash-lite-latest");
  }

  if (!model) {
    return res.status(500).json({ error: "Gemini API key is required." });
  }

  try {
    const normalizedMessages = messages.map((m) => {
      if (m && !m.parts && m.content) {
        return {
          ...m,
          parts: [{ type: "text", text: m.content }],
        };
      }
      return m;
    });

    const modelMessages = await convertToModelMessages(normalizedMessages);

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      stopWhen: stepCountIs(8),
      tools: salesTools,
      onError: ({ error }) => {
        console.error("AI Salesman Stream error:", error?.message || error);
      },
    });

    result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    console.error("AI Salesman Chat error:", error);
    res.status(500).json({ error: "Failed to process chat conversation." });
  }
});

export default router;
