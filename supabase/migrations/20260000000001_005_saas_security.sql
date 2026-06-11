-- ============================================================
-- LINKVENTAS - MIGRACION 005: HARDENING SAAS / PLANES
-- ============================================================
-- Objetivo:
-- 1. Evitar que usuarios cambien su propio plan desde el cliente.
-- 2. Enforzar limite real de productos para plan free.
-- 3. Bloquear Culqi para free/inactivo desde la base de datos.
-- 4. Mantener lectura publica de tiendas/productos.
-- ============================================================

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merchant_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS culqi_active BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS culqi_public_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS culqi_secret_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_tiktok TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS yape_image_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plin_image_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'comercio';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS horario TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_order_template TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_lat DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_lng DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_schedule JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_min_viewers INTEGER DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_max_viewers INTEGER DEFAULT 24;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_message TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Perfiles: lectura publica para tiendas.
DROP POLICY IF EXISTS "Acceso publico para tiendas" ON public.profiles;
DROP POLICY IF EXISTS "Acceso público para tiendas" ON public.profiles;
CREATE POLICY "Acceso publico para tiendas"
ON public.profiles
FOR SELECT
USING (true);

-- Quitar UPDATE amplio y reemplazarlo por columnas no sensibles.
DROP POLICY IF EXISTS "Merchants pueden editar su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Merchants pueden editar perfil no sensible" ON public.profiles;

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE SELECT (culqi_secret_key) ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
  slug,
  store_name,
  description,
  avatar_url,
  banner_url,
  primary_color,
  secondary_color,
  social_instagram,
  social_facebook,
  social_tiktok,
  whatsapp_phone,
  yape_image_url,
  plin_image_url,
  template_type,
  horario,
  direccion,
  whatsapp_order_template,
  store_lat,
  store_lng,
  store_address,
  store_schedule,
  fomo_enabled,
  fomo_min_viewers,
  fomo_max_viewers,
  fomo_message,
  updated_at
) ON public.profiles TO authenticated;

CREATE POLICY "Merchants pueden editar perfil no sensible"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
);

-- Productos: separar INSERT/UPDATE/DELETE para poder aplicar limite free.
DROP POLICY IF EXISTS "Productos visibles para todos" ON public.products;
DROP POLICY IF EXISTS "Merchants gestionan sus productos" ON public.products;
DROP POLICY IF EXISTS "Merchants crean productos segun plan" ON public.products;
DROP POLICY IF EXISTS "Merchants actualizan sus productos" ON public.products;
DROP POLICY IF EXISTS "Merchants eliminan sus productos" ON public.products;

CREATE POLICY "Productos visibles para todos"
ON public.products
FOR SELECT
USING (true);

CREATE POLICY "Merchants crean productos segun plan"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.plan IN ('pro', 'trial')
        AND (p.plan_expires_at IS NULL OR p.plan_expires_at > now())
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.plan = 'free'
      )
      AND (
        SELECT count(*)
        FROM public.products existing
        WHERE existing.user_id = auth.uid()
      ) < 10
    )
  )
);

CREATE POLICY "Merchants actualizan sus productos"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants eliminan sus productos"
ON public.products
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_product_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  merchant_plan text;
  merchant_expires_at timestamptz;
  current_count integer;
BEGIN
  SELECT plan, plan_expires_at
  INTO merchant_plan, merchant_expires_at
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF merchant_plan IN ('pro', 'trial')
     AND (merchant_expires_at IS NULL OR merchant_expires_at > now()) THEN
    RETURN NEW;
  END IF;

  IF merchant_plan = 'free' THEN
    SELECT count(*)
    INTO current_count
    FROM public.products
    WHERE user_id = NEW.user_id;

    IF current_count >= 10 THEN
      RAISE EXCEPTION 'El plan free permite como maximo 10 productos';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Tu plan no permite crear productos';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_product_plan_limits ON public.products;
CREATE TRIGGER trg_enforce_product_plan_limits
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_product_plan_limits();

-- Si una cuenta baja a free/inactivo, Culqi queda apagado automaticamente.
CREATE OR REPLACE FUNCTION public.enforce_billing_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IN ('free', 'inactivo') OR NEW.plan IS NULL THEN
    NEW.culqi_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_billing_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_enforce_billing_sensitive_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_billing_sensitive_fields();
