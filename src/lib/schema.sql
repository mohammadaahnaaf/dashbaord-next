-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create default users for demo (password: admin123 for both)
-- Admin: admin@example.com / admin123
-- Moderator: moderator@example.com / admin123
-- These will be created automatically on first login if they don't exist

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  base_price_bdt DECIMAL(10, 2) NOT NULL,
  sell_price_bdt DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  source_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Variant groups table (color-based variants with sizes)
CREATE TABLE IF NOT EXISTS variant_groups (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color VARCHAR(100) NOT NULL,
  sizes TEXT[] NOT NULL, -- Array of sizes
  sell_price_override DECIMAL(10, 2),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  zone VARCHAR(100),
  area VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  website TEXT,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  address TEXT NOT NULL,
  delivery_charge_bdt DECIMAL(10, 2) DEFAULT 0,
  advance_bdt DECIMAL(10, 2) DEFAULT 0,
  due_bdt DECIMAL(10, 2) DEFAULT 0,
  pathao_city_name VARCHAR(100),
  pathao_zone_name VARCHAR(100),
  pathao_area_name VARCHAR(100),
  pathao_tracking_code VARCHAR(255),
  pathao_status VARCHAR(100),
  last_synced_at TIMESTAMP,
  total_amount DECIMAL(10, 2) NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name_snapshot VARCHAR(255) NOT NULL,
  image_url_snapshot TEXT,
  color_snapshot VARCHAR(100),
  size_snapshot VARCHAR(50),
  qty INTEGER NOT NULL,
  sell_price_bdt_snapshot DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  note TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch orders junction table
CREATE TABLE IF NOT EXISTS batch_orders (
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, order_id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_variant_groups_product_id ON variant_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_batch_orders_batch_id ON batch_orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_orders_order_id ON batch_orders(order_id);

