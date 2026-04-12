-- ============================================
-- FASE 2: EXTENSIONS
-- Archivo: /migrations/003_extensions.sql
-- ============================================

-- 2A. Solo restaurante — configuración de delivery
CREATE TABLE IF NOT EXISTS delivery_settings (
  store_id          UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  base_delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_delivery_from NUMERIC(10,2),
  max_delivery_km   NUMERIC(5,2),
  delivery_active   BOOLEAN NOT NULL DEFAULT true,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2B. Comercio y Moda — variantes de producto
CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL,  -- FK futura a products
  name        TEXT NOT NULL,  -- 'Talla', 'Color'
  value       TEXT NOT NULL,  -- 'M', 'Rojo'
  stock       INT,
  price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2C. Solo restaurante — categorías del menú
CREATE TABLE IF NOT EXISTS menu_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
