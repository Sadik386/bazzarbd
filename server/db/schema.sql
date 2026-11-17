-- PostgreSQL Schema for Lumina Commerce / BazzarAI
-- Replaces MongoDB collections with typed relational tables + JSONB documents

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  _id VARCHAR(64) PRIMARY KEY,
  name TEXT NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sequence INT DEFAULT 0,
  parent_id VARCHAR(64) REFERENCES categories(_id) ON DELETE SET NULL,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sequence ON categories(sequence);
CREATE INDEX IF NOT EXISTS idx_categories_doc ON categories USING gin(doc jsonb_path_ops);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
  _id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT,
  role VARCHAR(50) DEFAULT 'USER',
  refresh_tokens JSONB DEFAULT '[]',
  reset_password_token TEXT,
  reset_password_expires TIMESTAMPTZ,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_doc ON users USING gin(doc jsonb_path_ops);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  _id VARCHAR(64) PRIMARY KEY,
  category_id VARCHAR(64) REFERENCES categories(_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  base_price NUMERIC NOT NULL,
  traditional_price NUMERIC,
  short_description TEXT,
  long_description TEXT,
  name_bn TEXT,
  short_description_bn TEXT,
  long_description_bn TEXT,
  highlights JSONB DEFAULT '[]',
  seo JSONB DEFAULT '{}',
  social_copy JSONB DEFAULT '{}',
  tech_specs JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  is_recommended BOOLEAN DEFAULT FALSE,
  rating_override NUMERIC,
  review_count_override INT,
  activity JSONB DEFAULT '[]',
  product_variants JSONB DEFAULT '[]',
  product_images JSONB DEFAULT '[]',
  size_chart_id VARCHAR(64),
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_doc ON products USING gin(doc jsonb_path_ops);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  _id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  guest_email TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  total_amount NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  delivery_method TEXT DEFAULT 'Standard',
  coupon_code TEXT,
  shipping_address JSONB DEFAULT '{}',
  phone_number TEXT,
  order_items JSONB DEFAULT '[]',
  payment_method TEXT DEFAULT 'cash_on_delivery',
  courier_name TEXT,
  tracking_id TEXT,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_doc ON orders USING gin(doc jsonb_path_ops);

-- 5. Carts
CREATE TABLE IF NOT EXISTS carts (
  _id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL,
  items JSONB DEFAULT '[]',
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_doc ON carts USING gin(doc jsonb_path_ops);

-- 6. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  _id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  discount_type VARCHAR(50) NOT NULL,
  discount_value NUMERIC NOT NULL,
  min_purchase NUMERIC DEFAULT 0,
  usage_limit INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  expiry_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(upper(code));
CREATE INDEX IF NOT EXISTS idx_coupons_doc ON coupons USING gin(doc jsonb_path_ops);

-- 7. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  _id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name TEXT NOT NULL,
  rating INT NOT NULL,
  comment TEXT NOT NULL,
  is_moderated BOOLEAN DEFAULT FALSE,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_moderated ON reviews(is_moderated);
CREATE INDEX IF NOT EXISTS idx_reviews_doc ON reviews USING gin(doc jsonb_path_ops);

-- 8. Questions
CREATE TABLE IF NOT EXISTS questions (
  _id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT DEFAULT '',
  is_answered BOOLEAN DEFAULT FALSE,
  is_moderated BOOLEAN DEFAULT FALSE,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_questions_product ON questions(product_id);
CREATE INDEX IF NOT EXISTS idx_questions_moderated ON questions(is_moderated);
CREATE INDEX IF NOT EXISTS idx_questions_doc ON questions USING gin(doc jsonb_path_ops);

-- 9. Settings
CREATE TABLE IF NOT EXISTS settings (
  _id VARCHAR(64) PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_doc ON settings USING gin(doc jsonb_path_ops);

-- 10. Size Charts
CREATE TABLE IF NOT EXISTS sizecharts (
  _id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  columns JSONB DEFAULT '[]',
  rows JSONB DEFAULT '[]',
  deviation_note TEXT DEFAULT 'Expected Deviation < 3%',
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sizecharts_name ON sizecharts(name);
CREATE INDEX IF NOT EXISTS idx_sizecharts_doc ON sizecharts USING gin(doc jsonb_path_ops);

-- 11. Support Tickets
CREATE TABLE IF NOT EXISTS supporttickets (
  _id VARCHAR(64) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT 'No Subject',
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  replies JSONB DEFAULT '[]',
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_supporttickets_email ON supporttickets(email);
CREATE INDEX IF NOT EXISTS idx_supporttickets_status ON supporttickets(status);
CREATE INDEX IF NOT EXISTS idx_supporttickets_doc ON supporttickets USING gin(doc jsonb_path_ops);

-- 12. Jobs
CREATE TABLE IF NOT EXISTS jobs (
  _id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  salary_range TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_doc ON jobs USING gin(doc jsonb_path_ops);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  _id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_doc ON notifications USING gin(doc jsonb_path_ops);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS auditlogs (
  _id VARCHAR(64) PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  target_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auditlogs_admin ON auditlogs(admin_id);
CREATE INDEX IF NOT EXISTS idx_auditlogs_action ON auditlogs(action);
CREATE INDEX IF NOT EXISTS idx_auditlogs_created ON auditlogs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditlogs_doc ON auditlogs USING gin(doc jsonb_path_ops);

-- 15. Visits
CREATE TABLE IF NOT EXISTS visits (
  _id VARCHAR(64) PRIMARY KEY,
  ip_address TEXT NOT NULL,
  date TEXT NOT NULL,
  doc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_visits_ip_date UNIQUE(ip_address, date)
);
CREATE INDEX IF NOT EXISTS idx_visits_doc ON visits USING gin(doc jsonb_path_ops);
