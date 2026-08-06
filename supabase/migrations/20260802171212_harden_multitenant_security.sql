BEGIN;

-- Security contract: auth.users -> profiles -> stores (one store per account).
-- All browser access is explicit because new Supabase projects no longer
-- auto-expose tables through the Data API.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mercadopago_webhook_secret TEXT;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.idx_reviews_unique;
CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_order_product_unique
  ON public.product_reviews (order_id, product_id)
  WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_store_product_email_unique
  ON public.product_reviews (store_id, product_id, customer_email);
CREATE INDEX IF NOT EXISTS product_reviews_product_created_idx
  ON public.product_reviews (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS products_store_idx ON public.products (user_id);
CREATE INDEX IF NOT EXISTS product_variants_store_idx ON public.product_variants (store_id);
CREATE INDEX IF NOT EXISTS orders_store_created_idx ON public.orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS store_leads_store_created_idx ON public.store_leads (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS abandoned_carts_store_created_idx ON public.abandoned_carts (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS menu_categories_store_idx ON public.menu_categories (store_id);
CREATE INDEX IF NOT EXISTS order_inventory_reservations_variant_idx ON public.order_inventory_reservations (variant_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS platform_billing_payments_user_idx ON public.platform_billing_payments (user_id);

UPDATE public.orders
SET customer_email = lower(trim(customer_email))
WHERE customer_email IS NOT NULL AND customer_email <> lower(trim(customer_email));

-- Repair two historical foreign keys that incorrectly treated a store id as a
-- profile id. Existing production values were verified against stores first.
ALTER TABLE public.store_leads
  DROP CONSTRAINT IF EXISTS store_leads_store_id_fkey;
ALTER TABLE public.store_leads
  ADD CONSTRAINT store_leads_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_store_id_fkey;
ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'profiles', 'stores', 'store_config', 'products', 'product_variants',
        'delivery_settings', 'menu_categories', 'orders', 'order_items',
        'order_inventory_reservations', 'store_leads', 'abandoned_carts',
        'product_reviews', 'delivery_orders', 'orders_legacy', 'order_items_legacy'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END;
$$;

-- Remove every historical policy whose predicate used user/store IDs
-- interchangeably or exposed private profile fields.
DROP POLICY IF EXISTS "Acceso público para tiendas" ON public.profiles;
DROP POLICY IF EXISTS "Merchants pueden editar su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Productos visibles para todos" ON public.products;
DROP POLICY IF EXISTS "Merchants gestionan sus productos" ON public.products;
DROP POLICY IF EXISTS "Merchants ven sus propias órdenes" ON public.orders;
DROP POLICY IF EXISTS "Clientes pueden crear órdenes" ON public.orders;
DROP POLICY IF EXISTS "Permitir tracking publico de pedidos" ON public.orders;
DROP POLICY IF EXISTS "Merchants ven sus propios leads" ON public.store_leads;
DROP POLICY IF EXISTS "Clientes pueden registrar leads" ON public.store_leads;
DROP POLICY IF EXISTS "Merchant can delete own store reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Public can read product reviews" ON public.product_reviews;

-- Least-privilege table and column grants.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.stores FROM anon, authenticated;
REVOKE ALL ON TABLE public.store_config FROM anon, authenticated;
REVOKE ALL ON TABLE public.products FROM anon, authenticated;
REVOKE ALL ON TABLE public.product_variants FROM anon, authenticated;
REVOKE ALL ON TABLE public.delivery_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.menu_categories FROM anon, authenticated;
REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.order_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.order_inventory_reservations FROM anon, authenticated;
REVOKE ALL ON TABLE public.store_leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.abandoned_carts FROM anon, authenticated;
REVOKE ALL ON TABLE public.product_reviews FROM anon, authenticated;
REVOKE ALL ON TABLE public.delivery_orders FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.orders_legacy') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE public.orders_legacy FROM anon, authenticated';
  END IF;
  IF to_regclass('public.order_items_legacy') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE public.order_items_legacy FROM anon, authenticated';
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles, public.stores, public.store_config,
  public.products, public.product_variants, public.delivery_settings,
  public.menu_categories, public.orders, public.order_items,
  public.order_inventory_reservations, public.store_leads,
  public.abandoned_carts, public.product_reviews TO service_role;

GRANT SELECT ON TABLE public.stores, public.store_config, public.products,
  public.product_variants, public.delivery_settings, public.menu_categories TO anon;
GRANT SELECT (id, store_id, product_id, customer_name, rating, comment, verified_purchase, created_at)
  ON TABLE public.product_reviews TO anon;

GRANT SELECT (id, plan, plan_expires_at) ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.stores, public.store_config, public.products,
  public.product_variants, public.delivery_settings, public.menu_categories,
  public.orders, public.order_items, public.store_leads, public.abandoned_carts TO authenticated;
GRANT SELECT (id, store_id, product_id, customer_name, rating, comment, verified_purchase, created_at)
  ON TABLE public.product_reviews TO authenticated;
GRANT UPDATE (name, slug, description, avatar_url, banner_url, template_type, whatsapp_phone, updated_at)
  ON TABLE public.stores TO authenticated;
GRANT UPDATE (primary_color, secondary_color, store_lat, store_lng, store_address,
  store_schedule, hero_image_url, yape_image_url, plin_image_url, social_instagram,
  social_facebook, social_tiktok, horario, direccion, whatsapp_order_template,
  benefits, faqs, promo_title, promo_description, fomo_enabled, operations_config, updated_at)
  ON TABLE public.store_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.products, public.product_variants,
  public.delivery_settings, public.menu_categories TO authenticated;
GRANT DELETE ON TABLE public.store_leads, public.product_reviews TO authenticated;

CREATE POLICY "Profiles readable by owner" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Active stores are public" ON public.stores
  FOR SELECT TO anon, authenticated
  USING (is_active OR owner_id = (SELECT auth.uid()));
CREATE POLICY "Owners update their store" ON public.stores
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Active store config is public" ON public.store_config
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_config.store_id
      AND (s.is_active OR s.owner_id = (SELECT auth.uid()))
  ));
CREATE POLICY "Owners update store config" ON public.store_config
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_config.store_id AND s.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_config.store_id AND s.owner_id = (SELECT auth.uid())));

CREATE POLICY "Active products are public" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.user_id AND (s.is_active OR s.owner_id = (SELECT auth.uid())))
    AND (COALESCE(products.is_active, true) OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.user_id AND s.owner_id = (SELECT auth.uid())))
  );
CREATE POLICY "Owners insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.user_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners update products" ON public.products
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.user_id AND s.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.user_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners delete products" ON public.products
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.user_id AND s.owner_id = (SELECT auth.uid())));

CREATE POLICY "Visible product variants are public" ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    JOIN public.products p ON p.user_id = s.id
    WHERE p.id = product_variants.product_id
      AND (s.is_active AND COALESCE(p.is_active, true) OR s.owner_id = (SELECT auth.uid()))
  ));
CREATE POLICY "Owners insert product variants" ON public.product_variants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    JOIN public.products p ON p.user_id = s.id
    WHERE s.id = product_variants.store_id
      AND p.id = product_variants.product_id
      AND s.owner_id = (SELECT auth.uid())
  ));
CREATE POLICY "Owners update product variants" ON public.product_variants
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s JOIN public.products p ON p.user_id = s.id
    WHERE s.id = product_variants.store_id AND p.id = product_variants.product_id AND s.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s JOIN public.products p ON p.user_id = s.id
    WHERE s.id = product_variants.store_id AND p.id = product_variants.product_id AND s.owner_id = (SELECT auth.uid())
  ));
CREATE POLICY "Owners delete product variants" ON public.product_variants
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s JOIN public.products p ON p.user_id = s.id
    WHERE s.id = product_variants.store_id
      AND p.id = product_variants.product_id
      AND s.owner_id = (SELECT auth.uid())
  ));

CREATE POLICY "Active delivery settings are public" ON public.delivery_settings
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = delivery_settings.store_id AND (s.is_active OR s.owner_id = (SELECT auth.uid()))));
CREATE POLICY "Owners insert delivery settings" ON public.delivery_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners update delivery settings" ON public.delivery_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners delete delivery settings" ON public.delivery_settings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())));

CREATE POLICY "Active menu categories are public" ON public.menu_categories
  FOR SELECT TO anon, authenticated
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.is_active)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners insert menu categories" ON public.menu_categories
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners update menu categories" ON public.menu_categories
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners delete menu categories" ON public.menu_categories
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())));

CREATE POLICY "Owners read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners read order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o JOIN public.stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id AND s.owner_id = (SELECT auth.uid())
  ));
CREATE POLICY "Owners read abandoned carts" ON public.abandoned_carts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = abandoned_carts.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners read leads" ON public.store_leads
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_leads.store_id AND s.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owners delete leads" ON public.store_leads
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_leads.store_id AND s.owner_id = (SELECT auth.uid())));

CREATE POLICY "Verified reviews are public" ON public.product_reviews
  FOR SELECT TO anon, authenticated
  USING (
    verified_purchase
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = product_reviews.store_id
        AND (s.is_active OR s.owner_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY "Owners delete store reviews" ON public.product_reviews
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = product_reviews.store_id AND s.owner_id = (SELECT auth.uid())));

-- Canonical merchant onboarding. It is safe for existing rows and repairs
-- accounts created while the historical trigger was incomplete.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store_id UUID;
  v_store_name TEXT;
BEGIN
  v_store_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), NULLIF(split_part(NEW.email, '@', 1), ''), 'Mi tienda');

  INSERT INTO public.profiles (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();

  INSERT INTO public.stores (owner_id, slug, name, template_type)
  VALUES (NEW.id, 'tienda-' || NEW.id::TEXT, left(v_store_name, 160), 'comercio')
  ON CONFLICT (owner_id) DO UPDATE SET owner_id = EXCLUDED.owner_id
  RETURNING id INTO v_store_id;

  INSERT INTO public.store_config (store_id)
  VALUES (v_store_id)
  ON CONFLICT (store_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email, plan)
SELECT u.id, u.email, 'free'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stores (owner_id, slug, name, template_type)
SELECT u.id, 'tienda-' || u.id::TEXT,
  left(COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''), NULLIF(split_part(u.email, '@', 1), ''), 'Mi tienda'), 160),
  'comercio'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.store_config (store_id)
SELECT s.id FROM public.stores s
ON CONFLICT (store_id) DO NOTHING;

-- The old profile trigger created a second, incompatible onboarding path.
DROP TRIGGER IF EXISTS trg_ensure_core_store_for_profile ON public.profiles;
DROP FUNCTION IF EXISTS public.ensure_core_store_for_profile();
DROP FUNCTION IF EXISTS public.project_public_culqi_config_to_profile();

-- Enforce the free-product limit using the canonical stores.owner_id link.
-- The historical function compared products.user_id directly with profiles.id.
CREATE OR REPLACE FUNCTION public.enforce_product_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan TEXT;
  v_expires_at TIMESTAMPTZ;
  v_product_count INTEGER;
BEGIN
  SELECT p.plan, p.plan_expires_at
  INTO v_plan, v_expires_at
  FROM public.stores s
  JOIN public.profiles p ON p.id = s.owner_id
  WHERE s.id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store owner profile not found';
  END IF;

  IF (v_plan = 'pro' AND (v_expires_at IS NULL OR v_expires_at >= now()))
     OR (v_plan = 'trial' AND v_expires_at IS NOT NULL AND v_expires_at >= now()) THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO v_product_count
  FROM public.products p
  WHERE p.user_id = NEW.user_id
    AND (TG_OP = 'INSERT' OR p.id <> NEW.id);

  IF v_product_count >= 10 THEN
    RAISE EXCEPTION 'El plan gratuito permite hasta 10 productos';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_product_plan_limits() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  trigger_row RECORD;
BEGIN
  FOR trigger_row IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE t.tgrelid = 'public.products'::regclass
      AND NOT t.tgisinternal
      AND n.nspname = 'public'
      AND p.proname = 'enforce_product_plan_limits'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.products', trigger_row.tgname);
  END LOOP;
END;
$$;
CREATE TRIGGER trg_enforce_product_plan_limits
  BEFORE INSERT OR UPDATE OF user_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_plan_limits();

-- Harden every privileged RPC explicitly. CREATE OR REPLACE preserves grants,
-- so this migration revokes historical PUBLIC/anon access again.
DO $$
DECLARE
  function_row RECORD;
BEGIN
  FOR function_row IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      function_row.nspname,
      function_row.proname,
      function_row.identity_arguments
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.activate_platform_pro_subscription(UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_platform_pro_subscription(UUID, TEXT, NUMERIC, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.confirm_mercadopago_order_payment(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_mercadopago_order_payment(UUID, TEXT, TIMESTAMPTZ) TO service_role;
REVOKE EXECUTE ON FUNCTION public.commit_order_inventory(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_order_inventory(UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_background_maintenance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_background_maintenance() TO service_role;
REVOKE EXECUTE ON FUNCTION public.consume_abandoned_cart_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_abandoned_cart_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.set_own_plan_free() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_plan_free() TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_next_order_sequence(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_sequence(UUID) TO service_role;
ALTER FUNCTION public.update_delivery_orders_updated_at() SET search_path = '';
CREATE OR REPLACE FUNCTION public.get_next_order_sequence(p_store_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seq INTEGER;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::DATE;
BEGIN
  INSERT INTO public.store_sequences (store_id, date, seq_value)
  VALUES (p_store_id, v_today, 1)
  ON CONFLICT (store_id, date)
  DO UPDATE SET seq_value = public.store_sequences.seq_value + 1
  RETURNING seq_value INTO v_seq;
  RETURN v_seq;
END;
$$;

-- Storage: storefront media is public-readable, writes are isolated by user
-- folder; transfer proofs are private and uploaded only by server routes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('productos', 'productos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('comprobantes', 'comprobantes', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
DECLARE
  policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_row.policyname);
  END LOOP;
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON TABLE storage.objects FROM anon;
GRANT SELECT ON TABLE storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE storage.objects TO authenticated;

CREATE POLICY "Public reads storefront media" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('productos', 'avatars'));

CREATE POLICY "Authenticated upload own storefront media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('productos', 'avatars') AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT);
CREATE POLICY "Authenticated update own storefront media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('productos', 'avatars') AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT)
  WITH CHECK (bucket_id IN ('productos', 'avatars') AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT);
CREATE POLICY "Authenticated delete own storefront media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('productos', 'avatars') AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT);
CREATE POLICY "Merchants read own payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::TEXT = (storage.foldername(name))[1]
      AND s.owner_id = (SELECT auth.uid())
  ));

COMMIT;
