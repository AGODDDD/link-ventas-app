-- Fuente de verdad para la configuracion comercial: stores + store_config.
-- profiles queda reservado para identidad de Auth, planes y secretos de pasarela.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS promo_title TEXT,
  ADD COLUMN IF NOT EXISTS promo_description TEXT;

ALTER TABLE public.store_config
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS yape_image_url TEXT,
  ADD COLUMN IF NOT EXISTS plin_image_url TEXT,
  ADD COLUMN IF NOT EXISTS social_instagram TEXT,
  ADD COLUMN IF NOT EXISTS social_facebook TEXT,
  ADD COLUMN IF NOT EXISTS social_tiktok TEXT,
  ADD COLUMN IF NOT EXISTS horario TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_order_template TEXT,
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS promo_title TEXT,
  ADD COLUMN IF NOT EXISTS promo_description TEXT,
  ADD COLUMN IF NOT EXISTS fomo_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS culqi_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS culqi_public_key TEXT;

-- Los cambios historicos del dashboard viven en profiles; se toman como snapshot
-- inicial para no perder configuracion al pasar el storefront al Core.
INSERT INTO public.stores (
  id, owner_id, slug, name, description, avatar_url, banner_url,
  template_type, whatsapp_phone, is_active, created_at, updated_at
)
SELECT
  p.id,
  p.id,
  COALESCE(NULLIF(p.slug, ''), 'store-' || left(replace(p.id::TEXT, '-', ''), 8)),
  COALESCE(NULLIF(p.store_name, ''), 'Nueva tienda'),
  p.description,
  p.avatar_url,
  p.banner_url,
  CASE lower(COALESCE(p.template_type, 'comercio'))
    WHEN 'restaurante' THEN 'restaurante'
    WHEN 'restaurant' THEN 'restaurante'
    WHEN 'moda' THEN 'moda'
    ELSE 'comercio'
  END,
  p.whatsapp_phone,
  true,
  COALESCE(p.created_at, now()),
  now()
FROM public.profiles p
ON CONFLICT (id) DO UPDATE SET
  slug = COALESCE(NULLIF(EXCLUDED.slug, ''), public.stores.slug),
  name = COALESCE(NULLIF(EXCLUDED.name, ''), public.stores.name),
  description = COALESCE(EXCLUDED.description, public.stores.description),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.stores.avatar_url),
  banner_url = COALESCE(EXCLUDED.banner_url, public.stores.banner_url),
  template_type = EXCLUDED.template_type,
  whatsapp_phone = COALESCE(EXCLUDED.whatsapp_phone, public.stores.whatsapp_phone),
  updated_at = now();

INSERT INTO public.store_config (
  store_id, primary_color, secondary_color, store_lat, store_lng, store_address,
  store_schedule, hero_image_url, yape_image_url, plin_image_url, social_instagram,
  social_facebook, social_tiktok, horario, direccion, whatsapp_order_template,
  benefits, faqs, promo_title, promo_description, fomo_enabled, culqi_active,
  culqi_public_key, updated_at
)
SELECT
  p.id, p.primary_color, p.secondary_color, p.store_lat, p.store_lng, p.store_address,
  p.store_schedule, p.hero_image_url, p.yape_image_url, p.plin_image_url,
  p.social_instagram, p.social_facebook, p.social_tiktok, p.horario, p.direccion,
  p.whatsapp_order_template, COALESCE(p.benefits, '[]'::JSONB), COALESCE(p.faqs, '[]'::JSONB),
  p.promo_title, p.promo_description, COALESCE(p.fomo_enabled, true),
  COALESCE(p.culqi_active, false), p.culqi_public_key, now()
FROM public.profiles p
ON CONFLICT (store_id) DO UPDATE SET
  primary_color = COALESCE(EXCLUDED.primary_color, public.store_config.primary_color),
  secondary_color = COALESCE(EXCLUDED.secondary_color, public.store_config.secondary_color),
  store_lat = COALESCE(EXCLUDED.store_lat, public.store_config.store_lat),
  store_lng = COALESCE(EXCLUDED.store_lng, public.store_config.store_lng),
  store_address = COALESCE(EXCLUDED.store_address, public.store_config.store_address),
  store_schedule = COALESCE(EXCLUDED.store_schedule, public.store_config.store_schedule),
  hero_image_url = COALESCE(EXCLUDED.hero_image_url, public.store_config.hero_image_url),
  yape_image_url = COALESCE(EXCLUDED.yape_image_url, public.store_config.yape_image_url),
  plin_image_url = COALESCE(EXCLUDED.plin_image_url, public.store_config.plin_image_url),
  social_instagram = COALESCE(EXCLUDED.social_instagram, public.store_config.social_instagram),
  social_facebook = COALESCE(EXCLUDED.social_facebook, public.store_config.social_facebook),
  social_tiktok = COALESCE(EXCLUDED.social_tiktok, public.store_config.social_tiktok),
  horario = COALESCE(EXCLUDED.horario, public.store_config.horario),
  direccion = COALESCE(EXCLUDED.direccion, public.store_config.direccion),
  whatsapp_order_template = COALESCE(EXCLUDED.whatsapp_order_template, public.store_config.whatsapp_order_template),
  benefits = EXCLUDED.benefits,
  faqs = EXCLUDED.faqs,
  promo_title = COALESCE(EXCLUDED.promo_title, public.store_config.promo_title),
  promo_description = COALESCE(EXCLUDED.promo_description, public.store_config.promo_description),
  fomo_enabled = EXCLUDED.fomo_enabled,
  culqi_active = EXCLUDED.culqi_active,
  culqi_public_key = COALESCE(EXCLUDED.culqi_public_key, public.store_config.culqi_public_key),
  updated_at = now();

-- Una cuenta nueva recibe su identidad Core en el mismo alta de profiles. No copia
-- configuracion en updates: stores/store_config son la autoridad despues del backfill.
CREATE OR REPLACE FUNCTION public.ensure_core_store_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.stores (id, owner_id, slug, name, template_type)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NULLIF(NEW.slug, ''), 'store-' || left(replace(NEW.id::TEXT, '-', ''), 8)),
    COALESCE(NULLIF(NEW.store_name, ''), 'Nueva tienda'),
    CASE lower(COALESCE(NEW.template_type, 'comercio'))
      WHEN 'restaurante' THEN 'restaurante'
      WHEN 'restaurant' THEN 'restaurante'
      WHEN 'moda' THEN 'moda'
      ELSE 'comercio'
    END
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.store_config (store_id)
  VALUES (NEW.id) ON CONFLICT (store_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_core_store_for_profile ON public.profiles;
CREATE TRIGGER trg_ensure_core_store_for_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_core_store_for_profile();

-- Compatibilidad de servidor: Culqi conserva el secreto en profiles, pero el estado
-- y la clave publica se originan en store_config para el storefront.
CREATE OR REPLACE FUNCTION public.project_public_culqi_config_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET culqi_active = NEW.culqi_active,
      culqi_public_key = NEW.culqi_public_key,
      updated_at = now()
  WHERE id = (
    SELECT owner_id FROM public.stores WHERE id = NEW.store_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_public_culqi_config_to_profile ON public.store_config;
CREATE TRIGGER trg_project_public_culqi_config_to_profile
AFTER INSERT OR UPDATE OF culqi_active, culqi_public_key ON public.store_config
FOR EACH ROW EXECUTE FUNCTION public.project_public_culqi_config_to_profile();

DROP POLICY IF EXISTS "Public storefront config" ON public.store_config;
CREATE POLICY "Public storefront config" ON public.store_config
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_config.store_id
      AND (s.is_active = true OR s.owner_id = auth.uid())
  )
);

GRANT SELECT ON TABLE public.stores, public.store_config TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.stores, public.store_config TO authenticated;

-- El storefront ya no debe tener una proyeccion alternativa de profiles.
REVOKE ALL ON TABLE public.storefront_profiles FROM anon, authenticated;
DROP VIEW IF EXISTS public.storefront_profiles;
