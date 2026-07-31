-- Contrato canónico LinkVentas: una cuenta = una tienda, Mercado Pago,
-- inventario reservado y estados operativos explícitos.

-- Identidad: el producto soporta exactamente una tienda por cuenta.
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_template_type_check;
UPDATE public.stores SET template_type = 'restaurante' WHERE template_type = 'food';
ALTER TABLE public.stores ADD CONSTRAINT stores_template_type_check
  CHECK (template_type IN ('restaurante', 'comercio', 'moda'));
CREATE UNIQUE INDEX IF NOT EXISTS stores_owner_id_unique ON public.stores (owner_id);

-- El catálogo pertenece a una tienda, nunca implícitamente a un usuario.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE public.products
  ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT;
ALTER TABLE public.store_config
  ADD COLUMN IF NOT EXISTS mercadopago_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT,
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
  ADD COLUMN IF NOT EXISTS fomo_enabled BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS public.platform_billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago' CHECK (provider = 'mercadopago'),
  provider_charge_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount = 2500),
  currency TEXT NOT NULL CHECK (currency = 'PEN'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_billing_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_billing_payments FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_platform_pro_subscription(p_user_id UUID, p_payment_id TEXT, p_amount NUMERIC, p_currency TEXT)
RETURNS TABLE(plan TEXT, plan_expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount <> 25 OR p_currency <> 'PEN' OR length(trim(p_payment_id)) = 0 THEN RAISE EXCEPTION 'Pago de suscripcion invalido'; END IF;
  INSERT INTO public.platform_billing_payments (user_id, provider_charge_id, amount, currency) VALUES (p_user_id, p_payment_id, 2500, p_currency) ON CONFLICT (provider_charge_id) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT p.plan, p.plan_expires_at FROM public.profiles p WHERE p.id = p_user_id; RETURN; END IF;
  RETURN QUERY UPDATE public.profiles p SET plan = 'pro', plan_expires_at = greatest(coalesce(p.plan_expires_at, now()), now()) + interval '30 days', updated_at = now() WHERE p.id = p_user_id RETURNING p.plan, p.plan_expires_at;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_platform_pro_subscription(UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_platform_pro_subscription(UUID, TEXT, NUMERIC, TEXT) TO service_role;

-- Se elimina la capa de columnas legacy: orders usa store_id, direccion y total.
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS merchant_id,
  DROP COLUMN IF EXISTS customer_address,
  DROP COLUMN IF EXISTS total_amount;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS inventory_committed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inventory_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_paid_at TIMESTAMPTZ;

UPDATE public.orders SET status = 'pendiente' WHERE status = 'paid';
UPDATE public.orders SET status = 'en_camino' WHERE status = 'shipped';
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pendiente_pago', 'pendiente_verificacion', 'pendiente', 'en_preparacion',
  'alistando', 'en_camino', 'completado', 'cancelado'
));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN (
  'pending', 'approved', 'rejected', 'manual_verification', 'not_required'
));
CREATE UNIQUE INDEX IF NOT EXISTS orders_mercadopago_payment_id_unique
  ON public.orders (mercadopago_payment_id) WHERE mercadopago_payment_id IS NOT NULL;

-- Inventario por combinación de talla/color para Moda.
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS talla TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS combination_key TEXT;
UPDATE public.product_variants
SET combination_key = COALESCE(combination_key, lower(concat_ws('|', talla, color, value)));

DELETE FROM public.product_variants a USING public.product_variants b 
WHERE a.id > b.id AND a.product_id = b.product_id AND a.combination_key = b.combination_key;

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_combination_unique
  ON public.product_variants (product_id, combination_key)
  WHERE combination_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_inventory_reservations (
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  PRIMARY KEY (order_id, product_id, variant_id)
);
CREATE INDEX IF NOT EXISTS order_inventory_reservations_active_idx
  ON public.order_inventory_reservations (product_id, variant_id)
  WHERE committed_at IS NULL AND released_at IS NULL;
ALTER TABLE public.order_inventory_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_inventory_reservations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_store_id UUID, p_order_type TEXT, p_payment_method TEXT,
  p_customer_name TEXT, p_customer_phone TEXT, p_customer_email TEXT,
  p_address TEXT, p_reference TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION,
  p_items JSONB, p_payment_proof_url TEXT DEFAULT NULL
)
RETURNS TABLE (order_id UUID, legacy_id TEXT, subtotal NUMERIC, delivery_fee NUMERIC, total NUMERIC, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_name TEXT; v_sequence INTEGER; v_prefix TEXT; v_legacy_id TEXT;
  v_order_id UUID := gen_random_uuid(); v_subtotal NUMERIC(10,2) := 0;
  v_delivery_fee NUMERIC(10,2) := 0; v_total NUMERIC(10,2) := 0; v_status TEXT; v_payment_status TEXT;
  v_item JSONB; v_product public.products%ROWTYPE; v_variant public.product_variants%ROWTYPE;
  v_quantity INTEGER; v_modifier_delta NUMERIC(10,2); v_unit_price NUMERIC(10,2);
  v_reserved INTEGER; v_variant_key TEXT; v_order_items JSONB := '[]'::JSONB;
BEGIN
  IF p_order_type NOT IN ('delivery', 'pickup', 'standard') THEN RAISE EXCEPTION 'Tipo de orden invalido'; END IF;
  IF p_payment_method NOT IN ('mercadopago', 'whatsapp', 'transferencia', 'contra_entrega') THEN RAISE EXCEPTION 'Metodo de pago invalido'; END IF;
  IF p_order_type IN ('delivery', 'standard') AND length(trim(COALESCE(p_address, ''))) < 5 THEN RAISE EXCEPTION 'Direccion invalida'; END IF;
  IF p_payment_method = 'transferencia' AND length(trim(COALESCE(p_payment_proof_url, ''))) = 0 THEN RAISE EXCEPTION 'Comprobante requerido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'El carrito no contiene productos'; END IF;

  SELECT name INTO v_store_name FROM public.stores WHERE id = p_store_id AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tienda no disponible'; END IF;
  IF p_order_type = 'delivery' THEN
    SELECT COALESCE(base_delivery_fee, 0) INTO v_delivery_fee FROM public.delivery_settings WHERE store_id = p_store_id AND delivery_active;
    v_delivery_fee := COALESCE(v_delivery_fee, 0);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN v_quantity := (v_item ->> 'quantity')::INTEGER; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Cantidad invalida'; END;
    IF NULLIF(v_item ->> 'product_id', '') IS NULL OR v_quantity NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Producto o cantidad invalida'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'product_id')::UUID AND user_id = p_store_id AND COALESCE(is_active, true) AND COALESCE(is_available, true) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;

    v_variant_key := NULLIF(lower(concat_ws('|', v_item -> 'variant_details' ->> 'talla', v_item -> 'variant_details' ->> 'color')), '');
    IF v_variant_key IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.product_variants WHERE product_id = v_product.id AND combination_key = v_variant_key FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'La variante elegida no está disponible para %', v_product.name; END IF;
      IF v_variant.stock IS NOT NULL THEN
        SELECT COALESCE(sum(quantity), 0) INTO v_reserved FROM public.order_inventory_reservations WHERE variant_id = v_variant.id AND committed_at IS NULL AND released_at IS NULL;
        IF v_variant.stock - v_reserved < v_quantity THEN RAISE EXCEPTION 'Stock insuficiente para la variante de %', v_product.name; END IF;
      END IF;
    ELSIF v_product.stock IS NOT NULL THEN
      SELECT COALESCE(sum(quantity), 0) INTO v_reserved FROM public.order_inventory_reservations WHERE product_id = v_product.id AND variant_id IS NULL AND committed_at IS NULL AND released_at IS NULL;
      IF v_product.stock - v_reserved < v_quantity THEN RAISE EXCEPTION 'Stock insuficiente para %', v_product.name; END IF;
    END IF;

    SELECT COALESCE(sum(COALESCE((option_item ->> 'price_modifier')::NUMERIC, 0)), 0) INTO v_modifier_delta
    FROM jsonb_array_elements(COALESCE(v_product.variants, '[]'::JSONB)) group_item
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(group_item -> 'options', '[]'::JSONB)) option_item
    WHERE jsonb_typeof(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) = 'array'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) selected_option(id) WHERE selected_option.id = option_item ->> 'id');
    v_unit_price := round((v_product.price + COALESCE(v_modifier_delta, 0))::numeric, 2);
    v_subtotal := v_subtotal + v_unit_price * v_quantity;
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'price', v_unit_price, 'quantity', v_quantity, 'modifiers', NULLIF(v_item -> 'variant_details', 'null'::JSONB), 'variant_id', v_variant.id));
  END LOOP;

  v_total := round(v_subtotal + v_delivery_fee, 2);
  v_status := CASE WHEN p_payment_method = 'mercadopago' THEN 'pendiente_pago' WHEN p_payment_method = 'transferencia' THEN 'pendiente_verificacion' ELSE 'pendiente' END;
  v_payment_status := CASE WHEN p_payment_method = 'mercadopago' THEN 'pending' WHEN p_payment_method = 'transferencia' THEN 'manual_verification' ELSE 'not_required' END;
  v_sequence := public.get_next_order_sequence(p_store_id);
  v_prefix := coalesce(nullif(regexp_replace(upper(left(v_store_name, 4)), '[^A-Z0-9]', '', 'g'), ''), 'ORDEN');
  v_legacy_id := v_prefix || '-' || to_char(timezone('America/Lima', now()), 'DDMMYY') || '-' || lpad(v_sequence::text, 4, '0');
  INSERT INTO public.orders (id, store_id, order_type, status, payment_status, customer_name, customer_phone, customer_email, direccion, referencia, lat, lng, delivery_fee, subtotal, total, metodo_pago, payment_proof_url, estimated_time, legacy_id)
  VALUES (v_order_id, p_store_id, p_order_type, v_status, v_payment_status, left(trim(p_customer_name),160), left(trim(p_customer_phone),40), nullif(left(trim(coalesce(p_customer_email,'')),254),''), nullif(left(trim(coalesce(p_address,'')),500),''), nullif(left(trim(coalesce(p_reference,'')),500),''), p_lat, p_lng, v_delivery_fee, v_subtotal, v_total, p_payment_method, p_payment_proof_url, CASE WHEN p_order_type = 'delivery' THEN '50 - 60 min' END, v_legacy_id);
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, name, price, quantity, modifiers) VALUES (v_order_id, (v_item ->> 'product_id')::UUID, v_item ->> 'name', (v_item ->> 'price')::numeric, (v_item ->> 'quantity')::integer, nullif(v_item -> 'modifiers', 'null'::JSONB));
    INSERT INTO public.order_inventory_reservations (order_id, product_id, variant_id, quantity) VALUES (v_order_id, (v_item ->> 'product_id')::uuid, nullif(v_item ->> 'variant_id','')::uuid, (v_item ->> 'quantity')::integer);
  END LOOP;
  RETURN QUERY SELECT v_order_id, v_legacy_id, v_subtotal, v_delivery_fee, v_total, v_status;
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.commit_order_inventory(p_order_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row record;
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND inventory_committed_at IS NOT NULL) THEN RETURN; END IF;
  FOR v_row IN SELECT * FROM public.order_inventory_reservations WHERE order_id = p_order_id AND committed_at IS NULL AND released_at IS NULL FOR UPDATE LOOP
    IF v_row.variant_id IS NULL THEN UPDATE public.products SET stock = stock - v_row.quantity WHERE id = v_row.product_id AND (stock IS NULL OR stock >= v_row.quantity); IF NOT FOUND THEN RAISE EXCEPTION 'Stock ya no disponible'; END IF;
    ELSE UPDATE public.product_variants SET stock = stock - v_row.quantity WHERE id = v_row.variant_id AND (stock IS NULL OR stock >= v_row.quantity); IF NOT FOUND THEN RAISE EXCEPTION 'Stock de variante ya no disponible'; END IF; END IF;
    UPDATE public.order_inventory_reservations SET committed_at = now() WHERE order_id = p_order_id AND product_id = v_row.product_id AND variant_id IS NOT DISTINCT FROM v_row.variant_id;
  END LOOP;
  UPDATE public.orders SET inventory_committed_at = now(), updated_at = now() WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_order_status(p_order_id UUID, p_next_status TEXT)
RETURNS TABLE(id UUID, status TEXT, payment_status TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_allowed boolean := false;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.stores WHERE id = v_order.store_id AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  v_allowed := (v_order.status = 'pendiente_pago' AND p_next_status = 'cancelado')
    OR (v_order.status = 'pendiente_verificacion' AND p_next_status IN ('pendiente','cancelado'))
    OR (v_order.status = 'pendiente' AND p_next_status IN ('en_preparacion','cancelado'))
    OR (v_order.status = 'en_preparacion' AND p_next_status IN ('alistando','cancelado'))
    OR (v_order.status = 'alistando' AND p_next_status IN ('en_camino','completado','cancelado'))
    OR (v_order.status = 'en_camino' AND p_next_status IN ('completado','cancelado'));
  IF NOT v_allowed THEN RAISE EXCEPTION 'Transicion de estado invalida'; END IF;
  IF p_next_status = 'pendiente' AND v_order.status = 'pendiente_verificacion' THEN UPDATE public.orders SET payment_status = 'approved' WHERE id = p_order_id; PERFORM public.commit_order_inventory(p_order_id); END IF;
  IF p_next_status = 'en_preparacion' THEN PERFORM public.commit_order_inventory(p_order_id); END IF;
  IF p_next_status = 'cancelado' THEN UPDATE public.order_inventory_reservations SET released_at = now() WHERE order_id = p_order_id AND committed_at IS NULL AND released_at IS NULL; UPDATE public.orders SET inventory_released_at = now() WHERE id = p_order_id; END IF;
  RETURN QUERY UPDATE public.orders SET status = p_next_status, updated_at = now() WHERE id = p_order_id RETURNING orders.id, orders.status, orders.payment_status;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_order_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_mercadopago_order_payment(p_order_id UUID, p_payment_id TEXT, p_paid_at TIMESTAMPTZ DEFAULT now())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET payment_status = 'approved', mercadopago_payment_id = p_payment_id, mercadopago_paid_at = p_paid_at, payment_proof_url = 'MERCADOPAGO_AUTOMATIC', status = 'pendiente', updated_at = now()
  WHERE id = p_order_id AND status = 'pendiente_pago' AND mercadopago_payment_id IS NULL;
  IF FOUND THEN PERFORM public.commit_order_inventory(p_order_id); END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_mercadopago_order_payment(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_mercadopago_order_payment(UUID, TEXT, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.run_background_maintenance()
RETURNS TABLE(cancelled_orders BIGINT, recovered_carts BIGINT, expired_carts BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cancelled BIGINT; v_recovered BIGINT; v_expired BIGINT;
BEGIN
  WITH cancelled AS (UPDATE public.orders SET status = 'cancelado', inventory_released_at = now(), updated_at = now() WHERE created_at < now() - interval '24 hours' AND status IN ('pendiente_pago','pendiente_verificacion') RETURNING id), released AS (UPDATE public.order_inventory_reservations r SET released_at = now() FROM cancelled c WHERE r.order_id = c.id AND r.committed_at IS NULL AND r.released_at IS NULL RETURNING r.order_id) SELECT count(*) INTO v_cancelled FROM cancelled;
  WITH updated AS (UPDATE public.abandoned_carts cart SET recovered = true, processing_status = 'recovered', processed_at = now() WHERE cart.recovered = false AND cart.processing_status = 'pending' AND EXISTS (SELECT 1 FROM public.orders o WHERE o.store_id = cart.store_id AND o.customer_phone = cart.customer_phone AND o.created_at >= cart.created_at AND o.status <> 'cancelado') RETURNING cart.id) SELECT count(*) INTO v_recovered FROM updated;
  WITH updated AS (UPDATE public.abandoned_carts SET processing_status = 'expired', processed_at = now() WHERE recovered = false AND processing_status = 'pending' AND expires_at <= now() RETURNING id) SELECT count(*) INTO v_expired FROM updated;
  RETURN QUERY SELECT v_cancelled, v_recovered, v_expired;
END;
$$;
