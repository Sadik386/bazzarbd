export type UserRole =
  | "USER"
  | "SUPPORT_AGENT"
  | "CONTENT_MANAGER"
  | "ORDER_MANAGER"
  | "SUPER_ADMIN";

export interface User {
  id: string;
  _id?: string;
  email: string;
  display_name?: string;
  role: UserRole | string;
}

export interface ProductVariant {
  id?: string;
  _id?: string;
  variant_name: string;
  price_modifier: number;
  sku?: string;
  stock_level: number;
}

export interface ProductImage {
  id?: string;
  _id?: string;
  url: string;
  alt_text?: string;
  display_order?: number;
}

export interface Category {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sequence?: number;
  parent_id?: string | null;
}

export interface SizeChartRow {
  size: string;
  values_inch: string[];
  values_cm: string[];
}

export interface SizeChart {
  id?: string;
  _id?: string;
  name: string;
  columns: string[];
  rows: SizeChartRow[];
  deviation_note?: string;
}

export interface Product {
  id?: string;
  _id?: string;
  category_id?: string | Category | null;
  categories?: { id: string; name: string; slug: string } | null;
  size_chart_id?: string | null;
  size_chart?: SizeChart | null;
  name: string;
  slug: string;
  base_price: number;
  traditional_price?: number | null;
  short_description?: string;
  long_description?: string;
  name_bn?: string | null;
  short_description_bn?: string | null;
  long_description_bn?: string | null;
  highlights?: string[];
  seo?: {
    meta_title?: string;
    meta_description?: string;
    tags?: string[];
  } | null;
  social_copy?: {
    facebook_post?: string;
    ad_copy?: string;
  } | null;
  tech_specs?: Record<string, string>;
  is_featured?: boolean;
  is_recommended?: boolean;
  rating_override?: number | null;
  review_count_override?: number | null;
  activity?: string[];
  product_variants: ProductVariant[];
  product_images: ProductImage[];
  total_stock?: number;
  similarity?: number;
  reason?: string;
  createdAt?: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationInfo;
}

export interface BundleResponse {
  baseProduct: Product;
  addOns: Product[];
  bundlePricing: {
    totalPrice: number;
    discountPercent: number;
    discountAmount: number;
    finalPrice: number;
  };
}

export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantName: string;
  basePrice: number;
  priceModifier: number;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  maxStock?: number;
}

export interface ShippingAddress {
  full_name?: string;
  firstName?: string;
  lastName?: string;
  address: string;
  city: string;
  area?: string;
  delivery_zone?: "inside_dhaka" | "outside_dhaka";
  notes?: string;
}

export interface OrderItem {
  id?: string;
  _id?: string;
  product_id?: string | { _id: string; product_images?: ProductImage[] };
  variant_id?: string;
  product_name?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  products?: { name?: string; slug?: string };
  product_variants?: { variant_name?: string };
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id?: string;
  _id?: string;
  user_id?: { _id?: string; display_name?: string; email?: string } | string | null;
  guest_email?: string | null;
  phone_number: string;
  shipping_address: ShippingAddress | string;
  payment_method: "cash_on_delivery" | "online_payment" | string;
  status: OrderStatus | string;
  total_amount: number;
  discount_amount?: number;
  shipping_cost?: number;
  delivery_method?: string;
  coupon_code?: string | null;
  courier_name?: string | null;
  tracking_id?: string | null;
  order_items: OrderItem[];
  created_at?: string;
  createdAt?: string;
}

export interface Review {
  _id?: string;
  id?: string;
  product_id: string;
  user_id?: string;
  user_name: string;
  rating: number;
  comment: string;
  is_moderated: boolean;
  is_verified_purchase: boolean;
  createdAt: string;
}

export interface Question {
  _id?: string;
  id?: string;
  product_id: string;
  user_id?: string;
  user_name: string;
  question: string;
  answer?: string;
  is_answered: boolean;
  is_moderated: boolean;
  createdAt: string;
}

export interface Coupon {
  _id?: string;
  id?: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase?: number;
  usage_limit?: number | null;
  used_count?: number;
  expiry_date?: string;
  is_active: boolean;
  createdAt?: string;
}

export interface SupportTicketReply {
  _id?: string;
  message: string;
  repliedBy: string;
  createdAt: string;
}

export interface SupportTicket {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "replied" | "closed";
  replies: SupportTicketReply[];
  createdAt: string;
}

export interface Job {
  _id?: string;
  id?: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string;
  salaryRange?: string;
  is_active: boolean;
  createdAt?: string;
}

export interface AdminStats {
  totals: {
    orders: number;
    users: number;
    products: number;
    revenue: number;
    recentRevenue: number;
    todayVisitors: number;
  };
  ordersByStatus: Array<{ _id: string; count: number }>;
  lowStockProducts: Product[];
}

export interface AdminAnalytics {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  dispatchRate: number;
  uniqueVisitors: number;
  revenueChart: Array<{ date: string; amount: number }>;
}

export interface AdminUser {
  _id: string;
  email: string;
  display_name?: string;
  role: string;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalInventoryUnits: number;
  totalInventoryValue: number;
  outOfStockCount: number;
  criticalStockCount: number;
  moderateStockCount: number;
  healthyStockCount: number;
  fastMovingCount: number;
  overstockedCount: number;
  deadStockCount: number;
  deadStockCapital: number;
  totalRestockNeededCount: number;
  totalRestockUnits: number;
}

export interface InventoryVariantAnalysis {
  variant_id: string;
  variant_name: string;
  sku: string;
  stock_level: number;
  price_modifier: number;
  sold_30d: number;
  sold_7d: number;
  daily_velocity: number;
  days_remaining: number | null;
  needs_reorder: boolean;
  recommended_reorder_qty: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  category_name: string;
  base_price: number;
  total_stock: number;
  sold_30d: number;
  sold_7d: number;
  daily_velocity: number;
  days_of_supply: number | null;
  stockout_risk: "OUT_OF_STOCK" | "CRITICAL" | "MODERATE" | "HEALTHY" | "OVERSTOCKED" | "DEAD_STOCK";
  needs_reorder: boolean;
  recommended_reorder_qty: number;
  tied_up_capital: number;
  variant_analysis: InventoryVariantAnalysis[];
}

export interface InventoryForecast {
  ai_powered: boolean;
  timestamp: string;
  highlights: string[];
  seasonal_advice: string;
  restock_strategy: string;
  clearance_strategy: string;
}

export interface VacationSetting {
  enabled: boolean;
  message: string;
}
