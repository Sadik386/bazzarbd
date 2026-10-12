import { Router } from "express";
import { streamText, tool, convertToModelMessages, createUIMessageStream, pipeUIMessageStreamToResponse, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { searchSimilarProducts } from "../services/embeddingService.js";

const router = Router();

const SYSTEM_PROMPT = `
You are the AI Salesman and intelligent shopping concierge for BazzarBD (Lumina Commerce).
Your job is to delight customers, help them discover items, track their packages, and recommend products that fit their budget.

Core Principles:
1. Languages: You understand and naturally reply in English, Bangla (বাংলা), or Banglish according to customer preference.
2. Currency: All prices are in Bangladeshi Taka (BDT / ৳).
3. Accuracy: NEVER invent fake products or prices. ALWAYS call 'searchProducts' or 'recommendUnderBudget' to look up products in the real catalog.
4. Tool Usage:
   - When asked to find products, look for gifts, or browse: call 'searchProducts'.
   - When asked for items under a specific price/budget: call 'recommendUnderBudget'.
   - When asked about delivery, order tracking, or parcel status: ask for their Order ID or phone number and call 'getOrderStatus'.
5. Tone: Polite, enthusiastic, warm, concise, and helpful like a high-end personal concierge.
`;

// ── AI Salesman Tools ─────────────────────────────────────────────────────────

const salesTools = {
  searchProducts: tool({
    description: "Search the real store catalog using semantic vector search and natural language queries.",
    parameters: z.object({
      query: z.string().describe("Search term or description (e.g. 'casual black sneakers', 'summer cotton panjabi')"),
      maxPrice: z.number().optional().describe("Maximum price in BDT"),
      category: z.string().optional().describe("Category name or slug"),
    }),
    execute: async ({ query, maxPrice, category }) => {
      try {
        let results = await searchSimilarProducts(query, 5, 0.2);

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

        // If semantic search found few items, fallback to MongoDB text search
        if (results.length === 0) {
          const mongoMatches = await Product.find({
            $text: { $search: query },
            ...(maxPrice ? { base_price: { $lte: maxPrice } } : {}),
          })
            .limit(4)
            .lean();
          results = mongoMatches.map((m) => ({ ...m, id: m._id.toString() }));
        }

        return results.slice(0, 4).map((p) => ({
          id: p._id?.toString() || p.id,
          name: p.name,
          slug: p.slug,
          price: p.base_price,
          short_description: p.short_description || "",
          image: p.product_images?.[0]?.url || null,
          is_featured: !!p.is_featured,
        }));
      } catch (err) {
        console.error("Tool searchProducts error:", err);
        return { error: "Failed to search products in catalog." };
      }
    },
  }),

  getOrderStatus: tool({
    description: "Look up order progress, status, and tracking information using Order ID or Phone Number.",
    parameters: z.object({
      orderId: z.string().optional().describe("Order ID, MongoDB ID, or tracking code"),
      phoneNumber: z.string().optional().describe("Customer phone number"),
    }),
    execute: async ({ orderId, phoneNumber }) => {
      try {
        let order = null;

        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
          order = await Order.findById(orderId).lean();
        }

        if (!order && orderId) {
          order = await Order.findOne({
            $or: [{ tracking_id: orderId }, { courier_name: orderId }],
          }).lean();
        }

        if (!order && phoneNumber) {
          order = await Order.findOne({ phone_number: phoneNumber })
            .sort({ createdAt: -1 })
            .lean();
        }

        if (!order) {
          return {
            found: false,
            message: "No order found matching the provided Order ID or Phone number. Please check the digits and try again.",
          };
        }

        return {
          found: true,
          orderId: order._id.toString(),
          status: order.status,
          totalAmount: order.total_amount,
          deliveryMethod: order.delivery_method,
          courier: order.courier_name || "Standard Courier",
          trackingId: order.tracking_id || "Processing Assignment",
          paymentMethod: order.payment_method,
          itemCount: order.order_items?.length || 0,
          date: order.createdAt,
        };
      } catch (err) {
        console.error("Tool getOrderStatus error:", err);
        return { error: "Unable to retrieve order details." };
      }
    },
  }),

  recommendUnderBudget: tool({
    description: "Find the best recommendations that strictly fit under the customer's budget in BDT (৳).",
    parameters: z.object({
      budget: z.number().describe("Maximum allowed price in BDT (Taka)"),
      category: z.string().optional().describe("Optional category constraint"),
      preferences: z.string().optional().describe("Any style, color, or usage preference"),
    }),
    execute: async ({ budget, category, preferences }) => {
      try {
        let queryFilter = { base_price: { $lte: budget } };

        if (preferences) {
          const semanticResults = await searchSimilarProducts(preferences, 6, 0.2);
          const filtered = semanticResults.filter((p) => p.base_price <= budget);
          if (filtered.length > 0) {
            return filtered.slice(0, 4).map((p) => ({
              id: p._id?.toString() || p.id,
              name: p.name,
              slug: p.slug,
              price: p.base_price,
              image: p.product_images?.[0]?.url || null,
              rating: p.rating_override || 4.8,
            }));
          }
        }

        // Fallback to highest rated or featured items under budget
        const items = await Product.find(queryFilter)
          .sort({ is_featured: -1, createdAt: -1 })
          .limit(4)
          .lean();

        return items.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          slug: p.slug,
          price: p.base_price,
          image: p.product_images?.[0]?.url || null,
          rating: p.rating_override || 4.8,
        }));
      } catch (err) {
        console.error("Tool recommendUnderBudget error:", err);
        return { error: "Failed to find products under budget." };
      }
    },
  }),
};

// ── Streaming Chat Endpoint ───────────────────────────────────────────────────

router.post("/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request: 'messages' array is required." });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  let model = null;
  if (geminiApiKey && geminiApiKey !== "your_gemini_api_key_here") {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    model = google("gemini-3.1-flash-lite");
  } else if (openaiApiKey && openaiApiKey !== "your_openai_api_key_here") {
    model = openai("gpt-4o-mini");
  }

  if (!model) {
    // Graceful simulated SSE streaming when API key is not yet set
    const fallbackReply =
      "Hello! I am your BazzarBD AI Salesman. 🛍️\n\nTo enable full real-time AI streaming and live AI tool-calling, please set `GEMINI_API_KEY` or `OPENAI_API_KEY` in your `server/.env` file. You can still test browsing the catalog and our semantic search!";

    const words = fallbackReply.split(" ");
    let i = 0;
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const interval = setInterval(() => {
          if (i < words.length) {
            writer.write({
              type: "text-delta",
              textDelta: words[i] + (i < words.length - 1 ? " " : ""),
            });
            i++;
          } else {
            clearInterval(interval);
            writer.write({ type: "finish" });
          }
        }, 30);

        req.on("close", () => clearInterval(interval));
      },
    });

    return pipeUIMessageStreamToResponse({ response: res, stream });
  }

  try {
    let modelMessages;
    if (messages.some((m) => m && Array.isArray(m.parts))) {
      modelMessages = await convertToModelMessages(messages);
    } else if (messages.some((m) => m && m.content !== undefined)) {
      modelMessages = messages;
    } else {
      modelMessages = await convertToModelMessages(messages);
    }

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      stopWhen: stepCountIs(5),
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
