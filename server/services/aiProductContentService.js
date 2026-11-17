import { GoogleGenAI } from "@google/genai";
import Category from "../models/Category.js";

/**
 * Fetch remote or local image as base64
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
 * Deterministic mock fallback in case of API failure or missing API key
 */
function generateMockProductContent({ name = "Men's Cotton T-Shirt", price = 650, notes = "" }) {
  const cleanName = name || "Premium Lifestyle Product";
  const numPrice = Number(price) || 650;
  const traditionalPrice = Math.round(numPrice * 1.35 / 50) * 50;

  return {
    title_en: `${cleanName} - Premium Quality`,
    title_bn: `${cleanName} - প্রিমিয়াম কোয়ালিটি`,
    slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    short_description_en: `Experience unmatched all-day comfort and breathability with our premium ${cleanName.toLowerCase()}.`,
    short_description_bn: `সারাদিনের আরাম ও নিখুঁত ফিটিংয়ের জন্য বিজারবিডি নিয়ে এলো প্রিমিয়াম কোয়ালিটির এই পণ্য।`,
    long_description_en: `Crafted from high-grade combed cotton with superior tensile strength, this product offers a soft skin feel, durable stitching, and a tailored silhouette. Designed specifically for tropical and humid climates, it prevents sweat buildup and ensures effortless style whether worn casually or layered.\n\nFeaturing reinforced hems, non-stretch ribbed collar, and reactive dye coloring that resists multiple washes.`,
    long_description_bn: `১০০% প্রিমিয়াম কম্বড ফেব্রিক দ্বারা তৈরি, যা ত্বকের জন্য অত্যন্ত আরামদায়ক ও কোমল। বাংলাদেশের আবহাওয়ার কথা বিবেচনা করে এটি বিশেষ ডায়িং ও ফিনিশিং করা হয়েছে যাতে দীর্ঘস্থায়ী ব্যবহারেও রঙ অক্ষুণ্ণ থাকে। দৈনন্দিন অফিস বা ক্যাজুয়াল আড্ডায় এটি আপনার ব্যক্তিত্বে আনবে আলাদা মাধুর্য।`,
    highlights: [
      "১০০% প্রিমিয়াম কম্বড ফেব্রিক (100% Combed Fabric)",
      "অ্যান্টি-পিলিং ও কালার-ফাস্ট ডায়িং ফিনিশিং",
      "নিখুঁত ডাবল স্টিচড ফিনিশ ও টেকসই সেলাই",
      "ঘামরোধী ও অত্যন্ত আরামদায়ক ব্রেথেবল ম্যাটেরিয়াল",
      "রেগুলার স্মার্ট ফিট যা যেকোনো পোশাকে মানানসই"
    ],
    specifications: (() => {
      const sp = {
        "Fabric / Material": "100% Combed Cotton",
        "Weight / GSM": "180 GSM",
        "Fit Type": "Regular Comfort Fit",
        "Care Instructions": "Machine wash cold with like colors, do not bleach",
        "Country of Origin": "Bangladesh"
      };
      if (notes) {
        const gsmMatch = notes.match(/(\d+)\s*gsm/i);
        if (gsmMatch) sp["Weight / GSM"] = `${gsmMatch[1]} GSM`;
        if (/linen/i.test(notes)) sp["Fabric / Material"] = "100% Pure Linen";
        else if (/silk/i.test(notes)) sp["Fabric / Material"] = "Handloom Raw Silk";
        else if (/denim/i.test(notes)) sp["Fabric / Material"] = "Rigid Indigo Denim";
        else if (/cotton/i.test(notes)) sp["Fabric / Material"] = "100% Premium Combed Cotton";
        if (/slim/i.test(notes)) sp["Fit Type"] = "Slim Fit";
        else if (/oversized/i.test(notes)) sp["Fit Type"] = "Oversized Streetwear Fit";
      }
      return sp;
    })(),
    meta_title: `${cleanName} - Buy Online at Best Price in BD | BazzarBD`,
    meta_description: `Shop genuine ${cleanName.toLowerCase()} at only ৳${numPrice}. Cash on delivery inside and outside Dhaka with easy returns on BazzarBD.`,
    tags: [
      cleanName.toLowerCase(),
      "bazzarbd",
      "bangladesh shopping",
      "mens fashion bd",
      "কটন কালেকশন",
      "অনলাইন শপিং"
    ],
    facebook_post: `🔥 গরমে আরাম আর ট্রেন্ডি স্টাইলের সেরা কম্বিনেশন! 🔥\n\nদৈনন্দিন ব্যবহারের জন্য পারফেক্ট ${cleanName}। প্রিমিয়াম কোয়ালিটির ফেব্রিক ও নজরকাড়া কালার ভ্যারিয়েন্ট নিয়ে এলো BazzarBD।\n\n✨ কেন নিবেন?\n✅ ১০০% আরামদায়ক ও ব্রেথেবল ফেব্রিক\n✅ কালার গ্যারান্টি ও টেকসই সেলাই\n✅ সারা বাংলাদেশে ক্যাশ অন ডেলিভারি\n\n💵 বিশেষ অফার মূল্য: মাত্র ৳${numPrice} (পূর্বে ৳${traditionalPrice})\n\n👉 অর্ডার করতে ইনবক্স করুন অথবা ভিজিট করুন আমাদের ওয়েবসাইটে!\n#BazzarBD #BangladeshiFashion #PremiumWear #OnlineShoppingBD`,
    ad_copy: `🔥 Best Comfort Guarantee! Premium ${cleanName} at only ৳${numPrice}.\n\nLooking for an everyday staple that keeps you cool, fits right, and lasts wash after wash? BazzarBD delivers handcrafted quality straight to your doorstep.\n\n⚡ Highlights:\n• 100% Premium Combed Fabric\n• Non-fading Reactive Dye\n• Nationwide Cash On Delivery & Easy 7-Day Returns\n\n👉 Limited Stock Available! Tap 'Shop Now' to grab yours today.`,
    suggested_category: "Men's Fashion",
    suggested_price_bdt: numPrice,
    suggested_traditional_price_bdt: traditionalPrice
  };
}

/**
 * System prompt enforcing strict output structure and Bangladeshi e-commerce authenticity
 */
const SYSTEM_PROMPT = `
You are the Lead E-Commerce Merchandise Copywriter and SEO Specialist for BazzarBD (Lumina Commerce), a premier multi-vendor marketplace in Bangladesh.
Your task is to generate complete, high-converting, professional product listing metadata.

You understand the culture, fashion trends, and commerce nuances of Bangladesh:
- Currency is always Bangladeshi Taka (৳ BDT).
- Delivery is commonly Cash on Delivery (COD) inside/outside Dhaka.
- Products range from Menswear (Panjabi, T-Shirts, Polos, Denim, Formal Shirts), Womenswear (Sarees, Kurtis, Salwar Kameez, Modest Wear), Footwear, Accessories, to Lifestyle goods.
- Output high quality, natural, elegant Bengali (বাংলা) alongside clear, compelling English.

You MUST output ONLY a valid JSON object matching this schema exactly with NO markdown code-fences, NO backticks, and NO conversational filler:
{
  "title_en": "SEO-friendly, attractive product title in English (5 to 10 words)",
  "title_bn": "বাংলায় আকর্ষণীয় ও মার্জিত পণ্যের নাম",
  "slug": "url-friendly-slug-in-kebab-case",
  "short_description_en": "Compelling 1-2 sentence hook highlighting primary benefit and appeal",
  "short_description_bn": "১-২ বাক্যে আকর্ষণীয় ও তথ্যবহুল বাংলা সারসংক্ষেপ",
  "long_description_en": "Detailed 2-3 paragraph product narrative covering craftsmanship, material texture, styling advice, and durability",
  "long_description_bn": "বিস্তারিত বাংলা বিবরণী (কাপড়/ম্যাটেরিয়াল, ডিজাইন, ব্যবহার, আরাম এবং স্থায়িত্ব)",
  "highlights": [
    "Feature highlight 1 in bilingual or Bengali",
    "Feature highlight 2",
    "Feature highlight 3",
    "Feature highlight 4",
    "Feature highlight 5"
  ],
  "specifications": {
    "Material": "e.g. 100% Combed Cotton / Viscose / Pure Silk",
    "Fit": "e.g. Regular Fit / Slim Fit / Tailored",
    "Care Instructions": "e.g. Hand wash or gentle machine wash",
    "Origin": "Bangladesh"
  },
  "meta_title": "Optimized for Google Search CTR (under 60 characters) | BazzarBD",
  "meta_description": "Compelling Google search snippet with benefit and price callout (under 160 characters)",
  "tags": ["tag1", "tag2", "ট্যাগ৩", "tag4", "tag5", "tag6"],
  "facebook_post": "Engaging organic Facebook post with emojis, key benefits, Cash on Delivery note, price callout, and Bangladeshi hashtags (#BazzarBD #ShoppingBD)",
  "ad_copy": "High-converting direct-response Facebook Ad copy (Hook, Key Benefits, Value proposition, and Call-to-action)",
  "suggested_category": "Best suited category name (e.g. Men's Fashion, Women's Wear, Footwear, Electronics, Lifestyle)",
  "suggested_price_bdt": 650,
  "suggested_traditional_price_bdt": 850
}
`;

/**
 * Generate full product content using Gemini
 */
export async function generateProductContent({
  name = "",
  price = "",
  notes = "",
  imageUrl = "",
  tone = "Refined & High-Converting",
  language = "Bilingual (English & Bengali)",
  categoryHint = ""
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("⚠️ GEMINI_API_KEY not configured. Returning deterministic mock product listing.");
    return generateMockProductContent({ name, price, notes });
  }

  // Fetch categories from DB for reference if possible
  let categoryNames = "";
  try {
    const cats = await Category.find({}, "name").lean();
    if (cats && cats.length > 0) {
      categoryNames = cats.map((c) => c.name).join(", ");
    }
  } catch {
    // Ignore error if DB call fails
  }

  const promptContent = `
PRODUCT INPUT DETAILS:
- Product Name / Concept: ${name || "Unspecified (Infer from image or notes)"}
- Price Target: ${price ? `${price} BDT` : "Estimate a competitive BDT market price"}
- Additional Notes / Specs / Attributes: ${notes || "None provided"}
- Tone / Style: ${tone}
- Language: ${language}
${categoryHint ? `- Suggested Category Preference: ${categoryHint}` : ""}
${categoryNames ? `- Available Store Categories: ${categoryNames}` : ""}

Please analyze these details (and the image if attached) and create a complete, high-converting product listing adhering strictly to the required JSON schema.
`;

  const ai = new GoogleGenAI({ apiKey });
  const modelCandidates = [
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];

  let imagePart = null;
  if (imageUrl) {
    try {
      const { mimeType, base64Data } = await fetchImageAsBase64(imageUrl);
      imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };
    } catch (err) {
      console.warn("[aiProductContentService] Failed to load image URL, falling back to text prompt:", err.message);
    }
  }

  let lastError = null;
  let responseText = null;

  for (const model of modelCandidates) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const contents = [
          { text: SYSTEM_PROMPT },
          { text: promptContent }
        ];
        if (imagePart) {
          contents.push(imagePart);
        }

        const res = await ai.models.generateContent({
          model,
          contents,
        });

        if (res && res.text) {
          responseText = res.text.trim();
          break;
        }
      } catch (err) {
        lastError = err;
        const status = err.status || err.code;
        console.warn(`[aiProductContentService] Model ${model} attempt ${attempt} error (${status}): ${err.message}`);
        // If 404 (not found) or 400, break attempt loop and try next model
        if (status === 404 || status === 400) break;
        // Exponential backoff for 503 / 429
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    if (responseText) break;
  }

  if (!responseText) {
    console.error("[aiProductContentService] All Gemini models exhausted. Serving mock fallback. Error:", lastError);
    return generateMockProductContent({ name, price, notes });
  }

  try {
    const cleanedJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);

    // Ensure fallback safety for required fields
    if (!parsed.slug && parsed.title_en) {
      parsed.slug = parsed.title_en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (!parsed.specifications || typeof parsed.specifications !== "object") {
      parsed.specifications = {
        Material: "Premium Fabric",
        Origin: "Bangladesh"
      };
    }
    if (!Array.isArray(parsed.highlights) || parsed.highlights.length === 0) {
      parsed.highlights = [
        "Premium quality material and craftsmanship",
        "Breathable and durable construction",
        "Nationwide Cash on Delivery available"
      ];
    }
    if (!Array.isArray(parsed.tags)) {
      parsed.tags = ["bazzarbd", "fashion", "bangladesh"];
    }

    return parsed;
  } catch (parseError) {
    console.error("[aiProductContentService] JSON parse error on Gemini output:", parseError, "Raw output:", responseText);
    return generateMockProductContent({ name, price, notes });
  }
}
