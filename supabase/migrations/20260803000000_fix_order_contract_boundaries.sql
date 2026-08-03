-- Repair the application/database boundaries found during the production-readiness audit.
-- Mercado Pago keeps one canonical database value, while the UI alias is accepted
-- at the RPC boundary. The variant id is reset for every cart line so a previous
-- line can never leak its inventory identity into the next one.

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
  v_payment_method TEXT;
  v_item JSONB; v_product public.products%ROWTYPE;
  v_quantity INTEGER; v_modifier_delta NUMERIC(10,2); v_unit_price NUMERIC(10,2);
  v_reserved INTEGER; v_variant_key TEXT; v_variant_id UUID; v_variant_stock INTEGER;
  v_order_items JSONB := '[]'::JSONB;
BEGIN
  v_payment_method := CASE WHEN p_payment_method = 'tarjeta_mercadopago' THEN 'mercadopago' ELSE p_payment_method END;
  IF p_order_type NOT IN ('delivery', 'pickup', 'standard') THEN RAISE EXCEPTION 'Tipo de orden invalido'; END IF;
  IF v_payment_method NOT IN ('mercadopago', 'whatsapp', 'transferencia', 'contra_entrega') THEN RAISE EXCEPTION 'Metodo de pago invalido'; END IF;
  IF p_order_type IN ('delivery', 'standard') AND length(trim(COALESCE(p_address, ''))) < 5 THEN RAISE EXCEPTION 'Direccion invalida'; END IF;
  IF v_payment_method = 'transferencia' AND length(trim(COALESCE(p_payment_proof_url, ''))) = 0 THEN RAISE EXCEPTION 'Comprobante requerido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'El carrito no contiene productos'; END IF;

  SELECT name INTO v_store_name FROM public.stores WHERE id = p_store_id AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tienda no disponible'; END IF;
  IF p_order_type = 'delivery' THEN
    SELECT COALESCE(base_delivery_fee, 0) INTO v_delivery_fee FROM public.delivery_settings WHERE store_id = p_store_id AND delivery_active;
    v_delivery_fee := COALESCE(v_delivery_fee, 0);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_variant_id := NULL;
    v_variant_stock := NULL;
    BEGIN v_quantity := (v_item ->> 'quantity')::INTEGER; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Cantidad invalida'; END;
    IF NULLIF(v_item ->> 'product_id', '') IS NULL OR v_quantity NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Producto o cantidad invalida'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'product_id')::UUID AND user_id = p_store_id AND COALESCE(is_active, true) AND COALESCE(is_available, true) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;

    v_variant_key := NULLIF(lower(concat_ws('|', v_item -> 'variant_details' ->> 'talla', v_item -> 'variant_details' ->> 'color')), '');
    IF v_variant_key IS NOT NULL THEN
      SELECT id, stock INTO v_variant_id, v_variant_stock FROM public.product_variants WHERE product_id = v_product.id AND combination_key = v_variant_key FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'La variante elegida no está disponible para %', v_product.name; END IF;
      IF v_variant_stock IS NOT NULL THEN
        SELECT COALESCE(sum(quantity), 0) INTO v_reserved FROM public.order_inventory_reservations WHERE variant_id = v_variant_id AND committed_at IS NULL AND released_at IS NULL;
        IF v_variant_stock - v_reserved < v_quantity THEN RAISE EXCEPTION 'Stock insuficiente para la variante de %', v_product.name; END IF;
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
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'price', v_unit_price, 'quantity', v_quantity, 'modifiers', NULLIF(v_item -> 'variant_details', 'null'::JSONB), 'variant_id', v_variant_id));
  END LOOP;

  v_total := round(v_subtotal + v_delivery_fee, 2);
  v_status := CASE WHEN v_payment_method = 'mercadopago' THEN 'pendiente_pago' WHEN v_payment_method = 'transferencia' THEN 'pendiente_verificacion' ELSE 'pendiente' END;
  v_payment_status := CASE WHEN v_payment_method = 'mercadopago' THEN 'pending' WHEN v_payment_method = 'transferencia' THEN 'manual_verification' ELSE 'not_required' END;
  v_sequence := public.get_next_order_sequence(p_store_id);
  v_prefix := coalesce(nullif(regexp_replace(upper(left(v_store_name, 4)), '[^A-Z0-9]', '', 'g'), ''), 'ORDEN');
  v_legacy_id := v_prefix || '-' || to_char(timezone('America/Lima', now()), 'DDMMYY') || '-' || lpad(v_sequence::text, 4, '0');
  INSERT INTO public.orders (id, store_id, order_type, status, payment_status, customer_name, customer_phone, customer_email, direccion, referencia, lat, lng, delivery_fee, subtotal, total, metodo_pago, payment_proof_url, estimated_time, legacy_id)
  VALUES (v_order_id, p_store_id, p_order_type, v_status, v_payment_status, left(trim(p_customer_name),160), left(trim(p_customer_phone),40), nullif(left(trim(coalesce(p_customer_email,'')),254),''), nullif(left(trim(coalesce(p_address,'')),500),''), nullif(left(trim(coalesce(p_reference,'')),500),''), p_lat, p_lng, v_delivery_fee, v_subtotal, v_total, v_payment_method, p_payment_proof_url, CASE WHEN p_order_type = 'delivery' THEN '50 - 60 min' END, v_legacy_id);
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, name, price, quantity, modifiers) VALUES (v_order_id, (v_item ->> 'product_id')::UUID, v_item ->> 'name', (v_item ->> 'price')::numeric, (v_item ->> 'quantity')::integer, nullif(v_item -> 'modifiers', 'null'::JSONB));
    INSERT INTO public.order_inventory_reservations (order_id, product_id, variant_id, quantity) VALUES (v_order_id, (v_item ->> 'product_id')::uuid, nullif(v_item ->> 'variant_id','')::uuid, (v_item ->> 'quantity')::integer);
  END LOOP;
  RETURN QUERY SELECT v_order_id, v_legacy_id, v_subtotal, v_delivery_fee, v_total, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) TO service_role;

-- The API verifies the merchant JWT and forwards it to this function, so the
-- function can keep its owner check through auth.uid().
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) TO authenticated;
