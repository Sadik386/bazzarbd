import WebSocket, { WebSocketServer } from "ws";
import mongoose from "../db/mongoCompat.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export function setupLiveVoiceBridge(server) {
  const wss = new WebSocketServer({ server, path: "/api/live-voice" });

  wss.on("connection", (clientWs, req) => {
    console.log("🎙️ Client connected to Live Voice Bridge from:", req.socket.remoteAddress);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ type: "error", error: "GEMINI_API_KEY is not configured on server" }));
      clientWs.close();
      return;
    }

    const geminiWs = new WebSocket(`${GEMINI_WS_URL}?key=${apiKey}`);

    geminiWs.on("open", () => {
      console.log("⚡ Connected to Gemini 3.8 Live WebSocket");

      const setupPayload = {
        setup: {
          model: "models/gemini-3.8-live",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede" // Natural melodious voice
                }
              }
            }
          },
          systemInstruction: {
            parts: [
              {
                text: `You are BazzarAI's friendly, conversational, and energetic AI Voice Salesman in Bangladesh (ভয়েস সেলসম্যান).
Speak naturally and warmly in colloquial Bengali (বাংলা) or English, adapting seamlessly to the user's language.

Interactive Screen & Product Display (সরাসরি স্ক্রিনে ছবি ও প্রোডাক্ট প্রদর্শন):
You are directly connected to the customer's display!
Whenever the customer asks to see products, pictures, photos, or asks what shirts, jackets, pants, hoodies, or items are available (e.g. "ছবি দেখাও", "শার্ট দেখাও", "কি কি শার্ট আছে", "কম দামের প্রোডাক্ট দেখাও", "জ্যাকেট দেখাও", "প্যান্ট দেখাও", "show me pictures", "show me shirts", "কি কি প্রোডাক্ট আছে"):
1. You MUST IMMEDIATELY call the \`searchProducts\` tool with the appropriate query or category (such as "shirt", "t-shirt", "jacket", "pant", "hoodie", "low price", or specific item name).
2. The system will INSTANTLY fetch the real products and HD photos from the database and visually display them on the customer's screen in interactive cards!
3. Confidently and warmly tell the customer in colloquial Bengali that you are displaying them on their screen right now (e.g., "অবশ্যই! আমি আপনার স্ক্রিনে দারুণ কিছু শার্টের ছবি ও কালেকশন দেখাচ্ছি। দেখুন তো কোনটা পছন্দ হয়?").
4. Mention 1 or 2 featured item names and prices warmly in 1-2 spoken sentences.
5. CRITICAL RULE: NEVER say "দুঃখিত, আমি সরাসরি আপনার স্ক্রিনে ছবি দেখাতে পারি না" or "যেহেতু আমি ভয়েস অ্যাসিস্ট্যান্ট, ছবি দেখাতে পারছি না". You CAN and DO display photos and products on their screen via \`searchProducts\`!

Your goals:
1. Help customers find products, discuss prices in BDT (৳), check delivery charges (৳60 in Dhaka, ৳120 outside Dhaka), and answer questions.
2. When a customer wants to place or confirm an order, guide them warmly to provide:
   - Full Name (নাম)
   - 11-digit Phone Number (মোবাইল নম্বর e.g. 01712345678)
   - Delivery Address (ঠিকানা)
   - Confirm which product they want.
3. As soon as you have these details, IMMEDIATELY call the \`createOrder\` function to confirm and save the order in the database.
4. Keep your spoken responses concise, energetic, and natural (1-3 spoken sentences), because this is live spoken dialogue.`
              }
            ]
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "createOrder",
                  description: "Places and confirms an order directly in the database when the customer provides their name, phone number, address, and product name.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      customerName: { type: "STRING", description: "Customer full name" },
                      phoneNumber: { type: "STRING", description: "11-digit Bangladeshi mobile number e.g. 017xxxxxxxx" },
                      deliveryAddress: { type: "STRING", description: "Full street and delivery address with district/city" },
                      productName: { type: "STRING", description: "The product title or search term for the item ordered" },
                      quantity: { type: "INTEGER", description: "Quantity to order (defaults to 1)" },
                      paymentMethod: { type: "STRING", enum: ["cash_on_delivery", "online_payment"], description: "Payment method" }
                    },
                    required: ["customerName", "phoneNumber", "deliveryAddress", "productName"]
                  }
                },
                {
                  name: "searchProducts",
                  description: "Searches the store catalog from database and IMMEDIATELY displays interactive product cards with photos, images, and prices on the customer's screen. Call this whenever the customer asks to see products, pictures, shirts, hoodies, jackets, pants, or asks what items are available.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      query: { type: "STRING", description: "Product name, category, or search keywords e.g. 'shirt', 'jacket', 'pant', 'hoodie', 'low price'" }
                    },
                    required: ["query"]
                  }
                },
                {
                  name: "getOrderStatus",
                  description: "Retrieves status and tracking details for an existing order by short order code (e.g. #ORD-XXXXXX) or phone number.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      orderId: { type: "STRING", description: "Order ID or short code" },
                      phoneNumber: { type: "STRING", description: "Customer phone number" }
                    }
                  }
                },
                {
                  name: "getStorePolicies",
                  description: "Provides delivery times, courier options, shipping fees, and return policies.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      topic: { type: "STRING", description: "delivery, payment, or return" }
                    }
                  }
                }
              ]
            }
          ]
        }
      };

      geminiWs.send(JSON.stringify(setupPayload));
    });

    // Handle messages from Gemini Live
    geminiWs.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.setupComplete) {
          console.log("✅ Gemini 3.8 Live setup complete for client session");
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "ready", model: "gemini-3.8-live" }));
          }
        }

        if (msg.serverContent) {
          const sc = msg.serverContent;

          if (sc.interrupted) {
            console.log("⚠️ Interruption detected from user speech");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }
          }

          if (sc.inputTranscription && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: "transcript",
              role: "user",
              text: sc.inputTranscription.text
            }));
          }

          if (sc.outputTranscription && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: "transcript",
              role: "assistant",
              text: sc.outputTranscription.text
            }));
          }

          if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: "audio",
                  pcm24k: part.inlineData.data
                }));
              }
            }
          }

          if (sc.turnComplete && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "turn_complete" }));
          }
        }

        // Handle Tool Calls from Gemini
        if (msg.toolCall?.functionCalls) {
          const functionResponses = [];

          for (const call of msg.toolCall.functionCalls) {
            console.log("🔧 Live Tool Call:", call.name, call.args);
            let result = null;

            if (call.name === "createOrder") {
              result = await handleCreateOrder(call.args, clientWs);
            } else if (call.name === "searchProducts") {
              result = await handleSearchProducts(call.args, clientWs);
            } else if (call.name === "getOrderStatus") {
              result = await handleGetOrderStatus(call.args);
            } else if (call.name === "getStorePolicies") {
              result = handleGetStorePolicies(call.args);
            } else {
              result = { error: "Unknown tool call" };
            }

            functionResponses.push({
              id: call.id,
              name: call.name,
              response: { output: result }
            });
          }

          // Send toolResponse back to Gemini so it speaks confirmation to the user
          if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(JSON.stringify({
              toolResponse: {
                functionResponses
              }
            }));
          }
        }
      } catch (err) {
        console.error("Error processing Gemini message:", err);
      }
    });

    // Handle messages from Client (Browser)
    clientWs.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString());

        if (payload.type === "audio" && payload.pcm16k) {
          // Send user mic audio chunk to Gemini
          if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: "audio/pcm;rate=16000",
                    data: payload.pcm16k
                  }
                ]
              }
            }));
          }
        } else if (payload.type === "audioStreamEnd") {
          if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(JSON.stringify({
              realtimeInput: {
                audioStreamEnd: true
              }
            }));
          }
        } else if (payload.type === "text" && payload.text) {
          // Support direct text prompt injection
          if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: "user",
                    parts: [{ text: payload.text }]
                  }
                ],
                turnComplete: true
              }
            }));
          }
        }
      } catch (err) {
        console.error("Error parsing client message:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Client disconnected from Live Voice Bridge");
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close();
      }
    });

    geminiWs.on("error", (err) => {
      console.error("Gemini WebSocket error:", err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", error: "Gemini connection error: " + err.message }));
      }
    });

    geminiWs.on("close", (code, reason) => {
      console.log(`Gemini WebSocket closed: ${code} - ${reason}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });
  });

  console.log("🚀 Live Voice WebSocket Server attached at path: /api/live-voice");
}

// ── Database Tool Handlers ───────────────────────────────────────────────────

async function handleCreateOrder(params, clientWs) {
  try {
    const {
      customerName,
      phoneNumber,
      deliveryAddress,
      productName,
      quantity = 1,
      paymentMethod = "cash_on_delivery"
    } = params;

    // Search for matching product in MongoDB catalog
    let product = await Product.findOne({
      $or: [
        { name: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { tags: new RegExp(productName, "i") },
        { description: new RegExp(productName, "i") }
      ]
    }).lean();

    // Fallback: pick featured or recent product if exact match wasn't found
    if (!product) {
      product = await Product.findOne({ is_featured: true }).lean() || await Product.findOne().lean();
    }

    const price = product ? product.base_price : 1250;
    const itemQty = Math.max(1, parseInt(quantity) || 1);
    const subtotal = price * itemQty;

    const isDhaka = /dhaka|ঢাকা/i.test(deliveryAddress);
    const shippingCost = isDhaka ? 60 : 120;
    const totalAmount = subtotal + shippingCost;

    const orderItem = {
      product_id: product ? product._id : new mongoose.Types.ObjectId(),
      variant_id: product?.variants?.[0]?.sku || "DEF-VAR-1",
      quantity: itemQty,
      unit_price: price,
      product_name: product ? product.name : productName,
      variant_name: product?.variants?.[0]?.title || "Standard"
    };

    const newOrder = await Order.create({
      guest_email: null,
      status: "confirmed",
      total_amount: Math.round(totalAmount * 100) / 100,
      shipping_cost: shippingCost,
      delivery_method: isDhaka ? "Express Delivery (Dhaka)" : "Standard Nationwide",
      phone_number: phoneNumber,
      shipping_address: {
        full_name: customerName,
        address: deliveryAddress,
        city: isDhaka ? "Dhaka" : "Outside Dhaka",
        notes: "Live AI Voice Salesman Order"
      },
      order_items: [orderItem],
      payment_method: paymentMethod,
      tracking_id: "TRK-" + Math.floor(100000 + Math.random() * 900000),
      courier_name: isDhaka ? "Pathao Courier" : "Steadfast Courier"
    });

    const shortCode = "#ORD-" + newOrder._id.toString().slice(-6).toUpperCase();

    const orderData = {
      success: true,
      orderId: newOrder._id.toString(),
      orderNumber: shortCode,
      trackingId: newOrder.tracking_id,
      customerName,
      phoneNumber,
      deliveryAddress,
      productName: orderItem.product_name,
      quantity: itemQty,
      price: price,
      subtotal,
      shippingCost,
      totalAmount: newOrder.total_amount,
      paymentMethod: paymentMethod === "cash_on_delivery" ? "Cash on Delivery (ক্যাশ অন ডেলিভারি)" : "Online Payment",
      estimatedDelivery: isDhaka ? "24-48 Hours" : "2-4 Days",
      courier: newOrder.courier_name
    };

    // Notify client in real-time to show interactive order receipt
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: "order_confirmed",
        order: orderData
      }));
    }

    return {
      success: true,
      orderNumber: shortCode,
      productName: orderItem.product_name,
      totalAmount: newOrder.total_amount,
      estimatedDelivery: orderData.estimatedDelivery,
      message: `অর্ডার ${shortCode} সফলভাবে কনফার্ম ও ডাটাবেজে সেভ হয়েছে। মোট বিল ৳${newOrder.total_amount}।`
    };
  } catch (err) {
    console.error("handleCreateOrder error:", err);
    return { success: false, error: "Failed to place order: " + err.message };
  }
}

async function handleSearchProducts({ query }, clientWs = null) {
  try {
    const q = (query || "").toLowerCase().trim();
    const isLowPrice = /কম\s*দাম|কমদামি|সস্তা|কমদামে|বাজেট|budget|cheap|low\s*price/i.test(q);
    const isHighPrice = /বেশি\s*দাম|দামি|premium|expensive|high\s*price/i.test(q);

    let cleaned = q.replace(/ছবি|ফটো|পিকচার|পিক|দেখাও|দেখা|দেখতে\s*চাই|আছে\s*কি|কি\s*কি|কী\s*কী|প্লিজ|এর\s*দাম|প্রোডাক্ট|পণ্য|কালেকশন|show|photo|picture|image|products?|please/gi, "").trim();

    let searchTerm = cleaned;
    if (/টি[- ]?শার্ট|টিশার্ট|শার্ট|shirt|t-shirt/i.test(q)) {
      searchTerm = "shirt";
    } else if (/প্যান্ট|প্যান্টস|pant|pants|trouser/i.test(q)) {
      searchTerm = "pant";
    } else if (/জ্যাকেট|কোট|jacket|coat/i.test(q)) {
      searchTerm = "jacket";
    } else if (/হুডি|hoodie/i.test(q)) {
      searchTerm = "hoodie";
    }

    const sortOption = isLowPrice ? { base_price: 1 } : (isHighPrice ? { base_price: -1 } : { is_featured: -1, createdAt: -1 });

    let filter = {};
    if (searchTerm && searchTerm.length > 1) {
      filter = {
        $or: [
          { name: new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { description: new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { tags: new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }
        ]
      };
    }

    let products = await Product.find(filter)
      .sort(sortOption)
      .limit(6)
      .select("name base_price slug total_stock product_images short_description")
      .lean();

    if (!products || products.length === 0) {
      products = await Product.find({})
        .sort(sortOption)
        .limit(6)
        .select("name base_price slug total_stock product_images short_description")
        .lean();
    }

    const formattedProducts = products.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      price: p.base_price,
      slug: p.slug || p._id.toString(),
      inStock: (p.total_stock || 10) > 0,
      image: p.product_images?.[0]?.url || null,
      description: p.short_description || ""
    }));

    // Broadcast event to client to display on screen
    if (clientWs && clientWs.readyState === WebSocket.OPEN && formattedProducts.length > 0) {
      clientWs.send(JSON.stringify({
        type: "products_displayed",
        query: query,
        products: formattedProducts
      }));
    }

    return {
      found: formattedProducts.length > 0,
      count: formattedProducts.length,
      products: formattedProducts
    };
  } catch (err) {
    console.error("handleSearchProducts error:", err);
    return { error: "Failed to search products" };
  }
}

async function handleGetOrderStatus({ orderId, phoneNumber }) {
  try {
    let order = null;
    if (orderId) {
      const clean = orderId.replace(/^#/, "").replace(/^ORD-/, "").trim();
      if (mongoose.Types.ObjectId.isValid(clean)) {
        order = await Order.findById(clean).lean();
      }
      if (!order && clean.length === 6) {
        order = await Order.findOne({
          $expr: { $eq: [{ $substrCP: [{ $toString: "$_id" }, 18, 6] }, clean.toLowerCase()] }
        }).lean();
      }
    }
    if (!order && phoneNumber) {
      order = await Order.findOne({ phone_number: phoneNumber }).sort({ createdAt: -1 }).lean();
    }
    if (!order) {
      return { found: false, message: "কোন অর্ডার পাওয়া যায়নি।" };
    }
    return {
      found: true,
      orderNumber: "#ORD-" + order._id.toString().slice(-6).toUpperCase(),
      status: order.status,
      totalAmount: order.total_amount,
      trackingId: order.tracking_id || "TRK-Pending",
      courier: order.courier_name || "Pathao / Steadfast"
    };
  } catch (err) {
    return { error: "Failed to check order status" };
  }
}

function handleGetStorePolicies({ topic }) {
  return {
    delivery: {
      insideDhaka: "৳60, Delivered within 24-48 hours",
      outsideDhaka: "৳120, Delivered in 2-4 business days across Bangladesh"
    },
    payment: "Cash on Delivery (ক্যাশ অন ডেলিভারি) available nationwide, plus bKash & Cards.",
    returnPolicy: "7-day hassle-free replacement or refund guarantee."
  };
}
