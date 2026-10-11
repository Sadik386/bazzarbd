export interface TechSpecs {
  material: string;
  weight: string;
  fit: string;
  care: string;
  origin?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  priceModifier: number;
  sku: string;
  stockLevel: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  shortDescription: string;
  longDescription: string;
  techSpecs: TechSpecs;
  category: "t-shirts" | "hoodies" | "pants" | "jackets";
  activity: string[];
  isFeatured: boolean;
  images: string[];
  variants: ProductVariant[];
}

export const categories = [
  { id: "all", name: "All Products", slug: "all" },
  { id: "t-shirts", name: "T-Shirts", slug: "t-shirts" },
  { id: "hoodies", name: "Hoodies", slug: "hoodies" },
  { id: "pants", name: "Pants", slug: "pants" },
  { id: "jackets", name: "Jackets", slug: "jackets" },
];

export const activities = ["Casual", "Streetwear", "Loungewear", "Activewear", "Smart Casual", "Everyday", "Outdoor"];

export const products: Product[] = [
  {
    id: "1",
    name: "Essential Cotton Tee",
    slug: "essential-cotton-tee",
    basePrice: 1250,
    shortDescription: "Premium cotton t-shirt with relaxed fit",
    longDescription: "Our essential cotton tee is crafted from 100% organic cotton with a relaxed fit that's perfect for everyday wear. Features reinforced stitching and a durable collar that maintains its shape.",
    techSpecs: {
      material: "100% Organic Cotton",
      weight: "180 GSM",
      fit: "Relaxed",
      care: "Machine wash cold, tumble dry low",
      origin: "Portugal",
    },
    category: "t-shirts",
    activity: ["Casual", "Everyday"],
    isFeatured: true,
    images: [],
    variants: [
      { id: "1a", name: "Small", priceModifier: 0, sku: "ECT-S", stockLevel: 50 },
      { id: "1b", name: "Medium", priceModifier: 0, sku: "ECT-M", stockLevel: 75 },
      { id: "1c", name: "Large", priceModifier: 0, sku: "ECT-L", stockLevel: 60 },
    ],
  },
  {
    id: "2",
    name: "Urban Hoodie",
    slug: "urban-hoodie",
    basePrice: 2850,
    shortDescription: "Heavyweight fleece hoodie for streetwear",
    longDescription: "The Urban Hoodie features heavyweight French terry fleece with an oversized fit. Double-layered hood with adjustable drawstrings and kangaroo pocket.",
    techSpecs: {
      material: "80% Cotton, 20% Polyester",
      weight: "380 GSM",
      fit: "Oversized",
      care: "Machine wash cold, hang dry",
      origin: "Turkey",
    },
    category: "hoodies",
    activity: ["Streetwear", "Loungewear"],
    isFeatured: true,
    images: [],
    variants: [
      { id: "2a", name: "Small", priceModifier: 0, sku: "UH-S", stockLevel: 30 },
      { id: "2b", name: "Medium", priceModifier: 0, sku: "UH-M", stockLevel: 45 },
      { id: "2c", name: "Large", priceModifier: 0, sku: "UH-L", stockLevel: 40 },
    ],
  },
  {
    id: "3",
    name: "Technical Joggers",
    slug: "technical-joggers",
    basePrice: 1850,
    shortDescription: "Performance joggers with zippered pockets",
    longDescription: "Engineered for movement with four-way stretch fabric and moisture-wicking technology. Features zippered pockets and tapered leg with elasticated cuffs.",
    techSpecs: {
      material: "88% Polyester, 12% Elastane",
      weight: "220 GSM",
      fit: "Tapered",
      care: "Machine wash cold, do not iron",
      origin: "Vietnam",
    },
    category: "pants",
    activity: ["Activewear", "Casual"],
    isFeatured: false,
    images: [],
    variants: [
      { id: "3a", name: "Small", priceModifier: 0, sku: "TJ-S", stockLevel: 35 },
      { id: "3b", name: "Medium", priceModifier: 0, sku: "TJ-M", stockLevel: 50 },
      { id: "3c", name: "Large", priceModifier: 0, sku: "TJ-L", stockLevel: 40 },
    ],
  },
  {
    id: "4",
    name: "Shell Jacket",
    slug: "shell-jacket",
    basePrice: 4500,
    shortDescription: "Water-resistant technical shell",
    longDescription: "A versatile shell jacket with waterproof breathable fabric. Features taped seams, adjustable hood, and multiple pockets for outdoor adventures.",
    techSpecs: {
      material: "100% Nylon with DWR coating",
      weight: "150 GSM",
      fit: "Regular",
      care: "Machine wash cold, reproof annually",
      origin: "Japan",
    },
    category: "jackets",
    activity: ["Outdoor", "Streetwear"],
    isFeatured: true,
    images: [],
    variants: [
      { id: "4a", name: "Small", priceModifier: 0, sku: "SJ-S", stockLevel: 20 },
      { id: "4b", name: "Medium", priceModifier: 0, sku: "SJ-M", stockLevel: 30 },
      { id: "4c", name: "Large", priceModifier: 0, sku: "SJ-L", stockLevel: 25 },
    ],
  },
  {
    id: "5",
    name: "Merino Layer Long Sleeve",
    slug: "merino-layer-long-sleeve",
    basePrice: 2250,
    shortDescription: "Temperature regulating merino wool base layer",
    longDescription: "Made from 100% merino wool, this long sleeve base layer naturally regulates temperature and resists odors. Perfect for layering or wearing alone.",
    techSpecs: {
      material: "100% Merino Wool",
      weight: "150 GSM",
      fit: "Slim",
      care: "Hand wash cold, lay flat to dry",
      origin: "New Zealand",
    },
    category: "t-shirts",
    activity: ["Activewear", "Outdoor"],
    isFeatured: false,
    images: [],
    variants: [
      { id: "5a", name: "Small", priceModifier: 0, sku: "MLL-S", stockLevel: 40 },
      { id: "5b", name: "Medium", priceModifier: 0, sku: "MLL-M", stockLevel: 55 },
      { id: "5c", name: "Large", priceModifier: 0, sku: "MLL-L", stockLevel: 45 },
    ],
  },
  {
    id: "6",
    name: "Smart Chinos",
    slug: "smart-chinos",
    basePrice: 2450,
    shortDescription: "Versatile stretch chino pants",
    longDescription: "Tailored chinos with just enough stretch for all-day comfort. Features a modern slim fit with slight taper and hidden flex waistband.",
    techSpecs: {
      material: "97% Cotton, 3% Elastane",
      weight: "240 GSM",
      fit: "Slim Tapered",
      care: "Machine wash cold, iron on medium",
      origin: "Italy",
    },
    category: "pants",
    activity: ["Smart Casual", "Everyday"],
    isFeatured: false,
    images: [],
    variants: [
      { id: "6a", name: "28", priceModifier: 0, sku: "SC-28", stockLevel: 30 },
      { id: "6b", name: "30", priceModifier: 0, sku: "SC-30", stockLevel: 45 },
      { id: "6c", name: "32", priceModifier: 0, sku: "SC-32", stockLevel: 50 },
    ],
  },
];
