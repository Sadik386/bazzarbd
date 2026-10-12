import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { adminAuth } from "../middleware/adminAuth.js";
import { allowRoles } from "../middleware/rbac.js";

const router = Router();

const AUTO_LIST_SYSTEM_PROMPT = `
You are an expert e-commerce merchandise cataloguer for BazzarBD (Lumina Commerce), a premier multi-vendor marketplace in Bangladesh.
Analyze the provided product image and generate professional, high-converting product metadata in BOTH English and natural Bengali (বাংলা).

You MUST output ONLY a valid JSON object matching this schema exactly, with NO markdown formatting, NO backticks, and NO extra commentary:
{
  "name_en": "Descriptive, elegant product title in English (5-10 words)",
  "name_bn": "বাংলায় সুন্দর এবং আকর্ষণীয় পণ্যের নাম",
  "short_description_en": "Compelling 1-sentence sales pitch highlighting the core benefit",
  "short_description_bn": "১ বাক্যের আকর্ষণীয় ও তথ্যবহুল বাংলা সারসংক্ষেপ",
  "long_description_en": "Detailed 2-paragraph description explaining material, craftsmanship, styling advice, and durability",
  "long_description_bn": "বিস্তারিত বাংলা বিবরণী (কাপড়/ম্যাটেরিয়াল, ডিজাইন, ব্যবহার এবং স্থায়িত্ব)",
  "suggested_category": "Best suited category name (e.g. Men's Fashion, Women's Wear, Footwear, Electronics, Lifestyle)",
  "suggested_price_bdt": 1850,
  "seo_tags": ["tag1", "tag2", "ট্যাগ৩", "tag4", "tag5", "tag6"],
  "key_features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"]
}
`;

/**
 * Fetch remote image (e.g. Cloudinary or local uploads) and convert to base64
 */
async function fetchImageAsBase64(imageUrl) {
  let resolvedUrl = imageUrl;
  if (imageUrl.startsWith("/")) {
    resolvedUrl = `http://localhost:${process.env.PORT || 5000}${imageUrl}`;
  }

  const res = await fetch(resolvedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from URL: ${res.statusText}`);
  }

  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await res.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  return { mimeType, base64Data };
}

/**
 * POST /api/ai/auto-list
 * Protected route for merchants/admins to auto-generate listing details from an image.
 */
router.post("/auto-list", adminAuth, allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Product 'imageUrl' is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      console.warn("⚠️ GEMINI_API_KEY not configured. Returning mock auto-generated listing.");
      return res.json({
        success: true,
        data: {
          name_en: "Premium Handcrafted Lifestyle Product",
          name_bn: "প্রিমিয়াম প্রিমিয়াম লাইফস্টাইল পণ্য",
          short_description_en: "Elevate your daily routine with superior craftsmanship and modern style.",
          short_description_bn: "প্রিমিয়াম কোয়ালিটি এবং আধুনিক ডিজাইনের সাথে আপনার স্টাইলকে করুন আরও আকর্ষণীয়।",
          long_description_en: "Designed with modern aesthetics and high-grade materials, this product offers unmatched comfort, exceptional durability, and versatile style suitable for both everyday use and special occasions.\n\nFeaturing meticulous attention to detail, reinforced stitching, and a timeless look.",
          long_description_bn: "উন্নত মানের ম্যাটেরিয়াল এবং নিখুঁত ফিনিশিং দ্বারা তৈরি এই পণ্যটি আপনাকে দেবে দীর্ঘস্থায়ী স্থায়িত্ব এবং সর্বোচ্চ আরাম। যেকোনো অনুষ্ঠানে বা দৈনন্দিন ব্যবহারের জন্য এটি এক অনন্য পছন্দ।",
          suggested_category: "Lifestyle",
          suggested_price_bdt: 1850,
          seo_tags: ["lifestyle", "premium", "bd shopping", "লাইফস্টাইল", "bazzarbd", "new collection"],
          key_features: ["High-grade durable material", "Ergonomic modern fit", "Breathable comfort", "Easy maintenance"],
        },
        notice: "Mock data returned. Set GEMINI_API_KEY in server/.env for live Gemini Vision inference.",
      });
    }

    const { mimeType, base64Data } = await fetchImageAsBase64(imageUrl);

    const ai = new GoogleGenAI({ apiKey });
    const models = ["gemini-3.8-flash", "gemini-3.8-flash-lite"];
    const MAX_RETRIES = 3;

    let response;
    let lastError;

    for (const model of models) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: [
              { text: AUTO_LIST_SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          });
          break; // success
        } catch (err) {
          lastError = err;
          const isRetryable = err.status === 503 || err.status === 429;
          console.warn(`[AI Auto-List] ${model} attempt ${attempt}/${MAX_RETRIES} failed (${err.status || "unknown"})`);
          if (!isRetryable || attempt === MAX_RETRIES) break;
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1))); // 1s, 2s, 4s
        }
      }
      if (response) break;
      console.warn(`[AI Auto-List] ${model} exhausted retries, trying fallback...`);
    }

    if (!response) {
      throw lastError || new Error("All Gemini models unavailable. Please try again later.");
    }

    const rawText = response.text?.trim() || "";

    // Clean any markdown formatting if present
    const cleanedJson = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    let listingData;
    try {
      listingData = JSON.parse(cleanedJson);
    } catch {
      console.error("Failed to parse Gemini output as JSON, raw response:", rawText);
      return res.status(500).json({
        error: "AI response could not be parsed into structured format.",
        raw: rawText,
      });
    }

    res.json({
      success: true,
      data: listingData,
    });
  } catch (error) {
    console.error("Gemini Vision auto-list error:", error);
    res.status(500).json({ error: error.message || "Failed to auto-generate listing." });
  }
});

export default router;
