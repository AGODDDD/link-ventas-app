-- FASE 1: pagos, pedidos y aislamiento de datos.
-- La app nunca debe calcular precios o descontar inventario desde el navegador.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS culqi_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS culqi_paid_at TIMESTAMPTZ;

ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS cart_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS orders_culqi_charge_id_unique
  ON public.orders (culqi_charge_id)
  WHERE culqi_charge_id IS NOT NULL;

-- Los correlativos se asignan únicamente dentro de create_order_from_cart.
ALTER TABLE public.store_sequences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.store_sequences FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_next_order_sequence(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_order_sequence(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_store_id UUID,
  p_order_type TEXT,
  p_payment_method TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_address TEXT,
  p_reference TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_items JSONB,
  p_payment_proof_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  legacy_id TEXT,
  subtotal NUMERIC,
  delivery_fee NUMERIC,
  total NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_name TEXT;
  v_sequence INTEGER;
  v_prefix TEXT;
  v_legacy_id TEXT;
  v_order_id UUID := gen_random_uuid();
  v_subtotal NUMERIC(10,2) := 0;
  v_delivery_fee NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2) := 0;
  v_status TEXT;
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_quantity INTEGER;
  v_modifier_delta NUMERIC(10,2);
  v_unit_price NUMERIC(10,2);
  v_order_items JSONB := '[]'::JSONB;
BEGIN
  IF p_order_type NOT IN ('delivery', 'pickup', 'standard') THEN
    RAISE EXCEPTION 'Tipo de orden invalido';
  END IF;

  IF p_payment_method NOT IN ('culqi', 'tarjeta_culqi', 'whatsapp', 'transferencia', 'contra_entrega') THEN
    RAISE EXCEPTION 'Metodo de pago invalido';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito no contiene productos';
  END IF;

  SELECT name
  INTO v_store_name
  FROM public.stores
  WHERE id = p_store_id
    AND is_active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tienda no disponible';
  END IF;

  IF p_order_type = 'delivery' THEN
    SELECT COALESCE(base_delivery_fee, 0)
    INTO v_delivery_fee
    FROM public.delivery_settings
    WHERE store_id = p_store_id
      AND delivery_active = true;
    v_delivery_fee := COALESCE(v_delivery_fee, 0);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item ->> 'product_id', '') IS NULL THEN
      RAISE EXCEPTION 'Producto invalido';
    END IF;

    BEGIN
      v_quantity := (v_item ->> 'quantity')::INTEGER;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Cantidad invalida';
    END;

    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'Cantidad fuera de rango';
    END IF;

    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = (v_item ->> 'product_id')::UUID
      AND user_id = p_store_id
      AND COALESCE(is_active, true) = true
      AND COALESCE(is_available, true) = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no disponible';
    END IF;

    IF v_product.stock IS NOT NULL AND v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para %', v_product.name;
    END IF;

    SELECT COALESCE(SUM(COALESCE((option_item ->> 'price_modifier')::NUMERIC, 0)), 0)
    INTO v_modifier_delta
    FROM jsonb_array_elements(COALESCE(v_product.variants, '[]'::JSONB)) AS group_item
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(group_item -> 'options', '[]'::JSONB)) AS option_item
    WHERE jsonb_typeof(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) AS selected_option(id)
        WHERE selected_option.id = option_item ->> 'id'
      );

    v_unit_price := ROUND((v_product.price + COALESCE(v_modifier_delta, 0))::NUMERIC, 2);
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);

    IF v_product.stock IS NOT NULL THEN
      UPDATE public.products
      SET stock = stock - v_quantity
      WHERE id = v_product.id;
    END IF;

    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'price', v_unit_price,
      'quantity', v_quantity,
      'modifiers', NULLIF(v_item -> 'variant_details', 'null'::JSONB)
    ));
  END LOOP;

  v_total := ROUND(v_subtotal + v_delivery_fee, 2);
  v_status := CASE
    WHEN p_payment_method IN ('culqi', 'tarjeta_culqi') THEN 'pendiente_pago'
    WHEN p_payment_method = 'transferencia' THEN 'pendiente_verificacion'
    ELSE 'pendiente'
  END;

  v_sequence := public.get_next_order_sequence(p_store_id);
  v_prefix := NULLIF(regexp_replace(upper(left(v_store_name, 4)), '[^A-Z0-9]', '', 'g'), '');
  v_prefix := COALESCE(v_prefix, 'ORDEN');
  v_legacy_id := v_prefix || '-' || to_char(timezone('America/Lima', now()), 'DDMMYY') || '-' || lpad(v_sequence::TEXT, 4, '0');

  INSERT INTO public.orders (
    id, store_id, order_type, status, customer_name, customer_phone, customer_email,
    direccion, referencia, lat, lng, delivery_fee, subtotal, total, metodo_pago,
    payment_proof_url, estimated_time, legacy_id
  ) VALUES (
    v_order_id, p_store_id, p_order_type, v_status, left(trim(p_customer_name), 160),
    left(trim(p_customer_phone), 40), NULLIF(left(trim(COALESCE(p_customer_email, '')), 254), ''),
    NULLIF(left(trim(COALESCE(p_address, '')), 500), ''), NULLIF(left(trim(COALESCE(p_reference, '')), 500), ''),
    p_lat, p_lng, v_delivery_fee, v_subtotal, v_total, p_payment_method,
    p_payment_proof_url, CASE WHEN p_order_type = 'delivery' THEN '50 - 60 min' ELSE NULL END, v_legacy_id
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order_items)
  LOOP
    INSERT INTO public.order_items (order_id, product_id, name, price, quantity, modifiers)
    VALUES (
      v_order_id,
      (v_item ->> 'product_id')::UUID,
      v_item ->> 'name',
      (v_item ->> 'price')::NUMERIC,
      (v_item ->> 'quantity')::INTEGER,
      NULLIF(v_item -> 'modifiers', 'null'::JSONB)
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_legacy_id, v_subtotal, v_delivery_fee, v_total, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) TO service_role;

-- El storefront usa una proyeccion deliberadamente limitada, no profiles completo.
DROP POLICY IF EXISTS "Acceso publico para tiendas" ON public.profiles;
DROP POLICY IF EXISTS "Acceso público para tiendas" ON public.profiles;
DROP POLICY IF EXISTS "Profiles own select" ON public.profiles;
CREATE POLICY "Profiles own select"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.storefront_profiles
WITH (security_barrier = true)
AS
SELECT
  id, slug, store_name, description, avatar_url, banner_url, primary_color, secondary_color,
  social_instagram, social_facebook, social_tiktok, whatsapp_phone, yape_image_url, plin_image_url,
  template_type, horario, direccion, whatsapp_order_template, store_lat, store_lng, store_address,
  store_schedule, fomo_enabled, fomo_min_viewers, fomo_max_viewers, fomo_message,
  culqi_active, culqi_public_key
FROM public.profiles;

REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.storefront_profiles TO anon, authenticated;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public stores" ON public.stores;
DROP POLICY IF EXISTS "Owners manage stores" ON public.stores;
CREATE POLICY "Public stores" ON public.stores FOR SELECT TO anon, authenticated USING (is_active = true OR owner_id = auth.uid());
CREATE POLICY "Owners manage stores" ON public.stores FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Merchant orders select" ON public.orders;
DROP POLICY IF EXISTS "Merchant orders update" ON public.orders;
DROP POLICY IF EXISTS "Merchants ven sus propias órdenes" ON public.orders;
DROP POLICY IF EXISTS "Clientes pueden crear órdenes" ON public.orders;
CREATE POLICY "Merchant orders select" ON public.orders FOR SELECT TO authenticated
USING (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "Merchant orders update" ON public.orders FOR UPDATE TO authenticated
USING (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = auth.uid()))
WITH CHECK (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_order_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.store_id IS DISTINCT FROM OLD.store_id
      OR NEW.total IS DISTINCT FROM OLD.total
      OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
      OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
      OR NEW.culqi_charge_id IS DISTINCT FROM OLD.culqi_charge_id
      OR NEW.culqi_paid_at IS DISTINCT FROM OLD.culqi_paid_at THEN
      RAISE EXCEPTION 'Los campos financieros de una orden no pueden cambiarse desde el cliente';
    END IF;

    IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Solo el conciliador de pagos puede marcar una orden como pagada';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_financial_fields ON public.orders;
CREATE TRIGGER trg_guard_order_financial_fields
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_financial_fields();

DROP POLICY IF EXISTS "Merchant order items select" ON public.order_items;
CREATE POLICY "Merchant order items select" ON public.order_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id
    AND (o.store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = o.store_id AND s.owner_id = auth.uid()))
));

DROP POLICY IF EXISTS "Merchant abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Merchant abandoned carts" ON public.abandoned_carts FOR SELECT TO authenticated
USING (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = abandoned_carts.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchant store config" ON public.store_config;
CREATE POLICY "Merchant store config" ON public.store_config FOR ALL TO authenticated
USING (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_config.store_id AND s.owner_id = auth.uid()))
WITH CHECK (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_config.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchant delivery settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "Public delivery settings" ON public.delivery_settings;
CREATE POLICY "Public delivery settings" ON public.delivery_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Merchant delivery settings" ON public.delivery_settings FOR ALL TO authenticated
USING (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = delivery_settings.store_id AND s.owner_id = auth.uid()))
WITH CHECK (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = delivery_settings.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchant product variants" ON public.product_variants;
CREATE POLICY "Merchant product variants" ON public.product_variants FOR ALL TO authenticated
USING (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = product_variants.store_id AND s.owner_id = auth.uid()))
WITH CHECK (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = product_variants.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchant menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Public menu categories" ON public.menu_categories;
CREATE POLICY "Public menu categories" ON public.menu_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Merchant menu categories" ON public.menu_categories FOR ALL TO authenticated
USING (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.owner_id = auth.uid()))
WITH CHECK (store_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = menu_categories.store_id AND s.owner_id = auth.uid()));

REVOKE ALL ON TABLE public.orders, public.order_items, public.abandoned_carts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders, public.order_items, public.abandoned_carts FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items, public.abandoned_carts TO authenticated;
