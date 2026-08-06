-- Correct production contract drift found during the 2026-07-30 audit.

-- Culqi's retired overload refers to a table that no longer exists.  Keep only
-- the Mercado Pago entrypoint, which is the one granted to service_role.
DROP FUNCTION IF EXISTS public.activate_platform_pro_subscription(UUID, TEXT, INTEGER, TEXT);

-- Card checkout has its own explicit method value throughout the application;
-- preserve it in the order record instead of collapsing it into a generic MP
-- value.  Both values are asynchronous card flows and begin pending payment.
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
  IF p_payment_method NOT IN ('mercadopago', 'tarjeta_mercadopago', 'whatsapp', 'transferencia', 'contra_entrega') THEN RAISE EXCEPTION 'Metodo de pago invalido'; END IF;
  IF p_order_type IN ('delivery', 'standard') AND length(trim(COALESCE(p_address, ''))) < 5 THEN RAISE EXCEPTION 'Direccion invalida'; END IF;
  IF p_payment_method = 'transferencia' AND length(trim(COALESCE(p_payment_proof_url, ''))) = 0 THEN RAISE EXCEPTION 'Comprobante requerido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'El carrito no contiene productos'; END IF;
  SELECT name INTO v_store_name FROM public.stores WHERE id = p_store_id AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tienda no disponible'; END IF;
  IF p_order_type = 'delivery' THEN SELECT COALESCE(base_delivery_fee, 0) INTO v_delivery_fee FROM public.delivery_settings WHERE store_id = p_store_id AND delivery_active; v_delivery_fee := COALESCE(v_delivery_fee, 0); END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN v_quantity := (v_item ->> 'quantity')::INTEGER; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Cantidad invalida'; END;
    IF NULLIF(v_item ->> 'product_id', '') IS NULL OR v_quantity NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Producto o cantidad invalida'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'product_id')::UUID AND user_id = p_store_id AND COALESCE(is_active, true) AND COALESCE(is_available, true) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
    v_variant_key := NULLIF(lower(concat_ws('|', v_item -> 'variant_details' ->> 'talla', v_item -> 'variant_details' ->> 'color')), '');
    IF v_variant_key IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.product_variants WHERE product_id = v_product.id AND combination_key = v_variant_key FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'La variante elegida no está disponible para %', v_product.name; END IF;
      IF v_variant.stock IS NOT NULL THEN SELECT COALESCE(sum(quantity), 0) INTO v_reserved FROM public.order_inventory_reservations WHERE variant_id = v_variant.id AND committed_at IS NULL AND released_at IS NULL; IF v_variant.stock - v_reserved < v_quantity THEN RAISE EXCEPTION 'Stock insuficiente para la variante de %', v_product.name; END IF; END IF;
    ELSIF v_product.stock IS NOT NULL THEN
      SELECT COALESCE(sum(quantity), 0) INTO v_reserved FROM public.order_inventory_reservations WHERE product_id = v_product.id AND variant_id IS NULL AND committed_at IS NULL AND released_at IS NULL;
      IF v_product.stock - v_reserved < v_quantity THEN RAISE EXCEPTION 'Stock insuficiente para %', v_product.name; END IF;
    END IF;
    SELECT COALESCE(sum(COALESCE((option_item ->> 'price_modifier')::NUMERIC, 0)), 0) INTO v_modifier_delta FROM jsonb_array_elements(COALESCE(v_product.variants, '[]'::JSONB)) group_item CROSS JOIN LATERAL jsonb_array_elements(COALESCE(group_item -> 'options', '[]'::JSONB)) option_item WHERE jsonb_typeof(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) = 'array' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) selected_option(id) WHERE selected_option.id = option_item ->> 'id');
    v_unit_price := round((v_product.price + COALESCE(v_modifier_delta, 0))::numeric, 2); v_subtotal := v_subtotal + v_unit_price * v_quantity;
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'price', v_unit_price, 'quantity', v_quantity, 'modifiers', NULLIF(v_item -> 'variant_details', 'null'::JSONB), 'variant_id', v_variant.id));
  END LOOP;
  v_total := round(v_subtotal + v_delivery_fee, 2);
  v_status := CASE WHEN p_payment_method IN ('mercadopago', 'tarjeta_mercadopago') THEN 'pendiente_pago' WHEN p_payment_method = 'transferencia' THEN 'pendiente_verificacion' ELSE 'pendiente' END;
  v_payment_status := CASE WHEN p_payment_method IN ('mercadopago', 'tarjeta_mercadopago') THEN 'pending' WHEN p_payment_method = 'transferencia' THEN 'manual_verification' ELSE 'not_required' END;
  v_sequence := public.get_next_order_sequence(p_store_id); v_prefix := coalesce(nullif(regexp_replace(upper(left(v_store_name, 4)), '[^A-Z0-9]', '', 'g'), ''), 'ORDEN'); v_legacy_id := v_prefix || '-' || to_char(timezone('America/Lima', now()), 'DDMMYY') || '-' || lpad(v_sequence::text, 4, '0');
  INSERT INTO public.orders (id, store_id, order_type, status, payment_status, customer_name, customer_phone, customer_email, direccion, referencia, lat, lng, delivery_fee, subtotal, total, metodo_pago, payment_proof_url, estimated_time, legacy_id) VALUES (v_order_id, p_store_id, p_order_type, v_status, v_payment_status, left(trim(p_customer_name),160), left(trim(p_customer_phone),40), nullif(left(trim(coalesce(p_customer_email,'')),254),''), nullif(left(trim(coalesce(p_address,'')),500),''), nullif(left(trim(coalesce(p_reference,'')),500),''), p_lat, p_lng, v_delivery_fee, v_subtotal, v_total, p_payment_method, p_payment_proof_url, CASE WHEN p_order_type = 'delivery' THEN '50 - 60 min' END, v_legacy_id);
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, name, price, quantity, modifiers) VALUES (v_order_id, (v_item ->> 'product_id')::UUID, v_item ->> 'name', (v_item ->> 'price')::numeric, (v_item ->> 'quantity')::integer, nullif(v_item -> 'modifiers', 'null'::JSONB));
    INSERT INTO public.order_inventory_reservations (order_id, product_id, variant_id, quantity) VALUES (v_order_id, (v_item ->> 'product_id')::uuid, nullif(v_item ->> 'variant_id','')::uuid, (v_item ->> 'quantity')::integer);
  END LOOP;
  RETURN QUERY SELECT v_order_id, v_legacy_id, v_subtotal, v_delivery_fee, v_total, v_status;
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) TO service_role;

-- Public tracking is served through /api/orders/status, where the requester
-- must supply the store, order reference, and matching phone.  It does not
-- require direct anonymous SELECT access to orders.
DROP POLICY IF EXISTS "Permitir tracking publico de pedidos" ON public.orders;

DROP POLICY IF EXISTS "Merchant can delete own store reviews" ON public.product_reviews;
CREATE POLICY "Merchant can delete own store reviews" ON public.product_reviews
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = product_reviews.store_id AND s.owner_id = (SELECT auth.uid())));

-- Serverless-safe, atomic rate-limit bucket. It is not exposed through the
-- Data API; the API route invokes the function using service_role only.
CREATE TABLE IF NOT EXISTS public.abandoned_cart_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abandoned_cart_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.abandoned_cart_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_abandoned_cart_rate_limit(p_client_key TEXT, p_limit INTEGER DEFAULT 8, p_window_seconds INTEGER DEFAULT 60)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.abandoned_cart_rate_limits%ROWTYPE;
BEGIN
  IF length(trim(p_client_key)) = 0 OR p_limit < 1 OR p_window_seconds < 1 THEN RAISE EXCEPTION 'Parametros de rate limit invalidos'; END IF;
  INSERT INTO public.abandoned_cart_rate_limits (client_key) VALUES (p_client_key) ON CONFLICT (client_key) DO NOTHING;
  SELECT * INTO v_row FROM public.abandoned_cart_rate_limits WHERE client_key = p_client_key FOR UPDATE;
  IF v_row.window_started_at + make_interval(secs => p_window_seconds) <= now() THEN
    UPDATE public.abandoned_cart_rate_limits SET window_started_at = now(), request_count = 1, updated_at = now() WHERE client_key = p_client_key;
    RETURN TRUE;
  END IF;
  IF v_row.request_count >= p_limit THEN RETURN FALSE; END IF;
  UPDATE public.abandoned_cart_rate_limits SET request_count = request_count + 1, updated_at = now() WHERE client_key = p_client_key;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_abandoned_cart_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_abandoned_cart_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
