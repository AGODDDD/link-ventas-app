-- Bootstrap para un entorno nuevo.
-- Las primeras migraciones historicas alteraban estas tablas antes de crearlas.
-- Todo es idempotente para que aplicarlo sobre produccion existente sea inocuo.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('restaurante', 'comercio', 'moda')),
  whatsapp_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  brand TEXT,
  original_price NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'pickup', 'standard')),
  status TEXT NOT NULL DEFAULT 'pendiente',
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  direccion TEXT,
  referencia TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_time TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  metodo_pago TEXT DEFAULT 'whatsapp',
  payment_proof_url TEXT,
  legacy_id TEXT,
  merchant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  modifiers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  cart_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  source TEXT DEFAULT 'checkout',
  recovered BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id TEXT PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente_pago'
    CHECK (status IN ('pendiente_pago', 'pendiente', 'en_preparacion', 'alistando', 'en_camino', 'completado')),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  direccion TEXT,
  referencia TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  metodo_pago TEXT DEFAULT 'whatsapp',
  estimated_time TEXT DEFAULT '50 - 60 min',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
