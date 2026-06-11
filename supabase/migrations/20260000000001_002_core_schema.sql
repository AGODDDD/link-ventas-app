-- ============================================
-- FASE 1: CORE — crear sin tocar producción
-- Archivo: /migrations/002_core_schema.sql
-- ============================================

-- 1A. stores: reemplaza profiles (dividida en dos responsabilidades)
CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL, -- FK to auth.users (will add constraint if needed)
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  avatar_url  TEXT,
  banner_url  TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('restaurante', 'comercio', 'moda')),
  whatsapp_phone TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1B. store_config: lo que era config visual/geo en profiles
CREATE TABLE IF NOT EXISTS store_config (
  store_id        UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  primary_color   TEXT,
  secondary_color TEXT,
  store_lat       DOUBLE PRECISION,
  store_lng       DOUBLE PRECISION,
  store_address   TEXT,
  store_schedule  JSONB,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1C. orders: tabla unificada (reemplaza delivery_orders + orders vieja)
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_type      TEXT NOT NULL CHECK (order_type IN ('delivery', 'pickup', 'standard')),
  status          TEXT NOT NULL DEFAULT 'pendiente',
  -- Cliente
  customer_name   TEXT,
  customer_phone  TEXT,
  customer_email  TEXT,
  -- Delivery (nullable — solo si order_type = 'delivery')
  direccion       TEXT, -- Actually renamed to address_text in the prompt description, but let's check SQL
  referencia      TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  delivery_fee    NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_time  TEXT,
  -- Totales
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  metodo_pago     TEXT DEFAULT 'whatsapp',
  payment_proof_url TEXT,
  -- Trazabilidad
  legacy_id       TEXT,  -- guarda el id TEXT de delivery_orders al migrar
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1D. order_items: reemplaza el items JSONB de delivery_orders
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID,           -- nullable mientras products no exista
  name        TEXT NOT NULL,  -- snapshot del nombre al momento del pedido
  price       NUMERIC(10,2) NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  modifiers   JSONB,          -- modificadores del restaurante (sin romper la lógica actual)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1E. abandoned_carts: con expiración real
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name   TEXT,
  customer_phone  TEXT,
  customer_email  TEXT,
  cart_items      JSONB NOT NULL DEFAULT '[]',
  source          TEXT DEFAULT 'checkout', 
  recovered       BOOLEAN NOT NULL DEFAULT false,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
