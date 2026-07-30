-- Las variantes de moda forman parte de la identidad de la prenda: nunca se
-- aceptan como texto libre ni se deja que el navegador omita una selección.
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
  v_delivery_fee NUMERIC(10,2) := 0; v_total NUMERIC(10,2) := 0; v_status TEXT;
  v_item JSONB; v_product public.products%ROWTYPE; v_quantity INTEGER;
  v_modifier_delta NUMERIC(10,2); v_unit_price NUMERIC(10,2); v_order_items JSONB := '[]'::JSONB;
BEGIN
  IF p_order_type NOT IN ('delivery', 'pickup', 'standard') THEN RAISE EXCEPTION 'Tipo de orden invalido'; END IF;
  IF p_payment_method NOT IN ('mercadopago', 'tarjeta_mercadopago', 'whatsapp', 'transferencia', 'contra_entrega') THEN RAISE EXCEPTION 'Metodo de pago invalido'; END IF;
  IF p_order_type IN ('delivery', 'standard') AND length(trim(COALESCE(p_address, ''))) < 5 THEN RAISE EXCEPTION 'Direccion invalida'; END IF;
  IF p_payment_method = 'transferencia' AND length(trim(COALESCE(p_payment_proof_url, ''))) = 0 THEN RAISE EXCEPTION 'Comprobante requerido'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'El carrito no contiene productos'; END IF;

  SELECT name INTO v_store_name FROM public.stores WHERE id = p_store_id AND is_active = true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tienda no disponible'; END IF;
  IF p_order_type = 'delivery' THEN
    SELECT COALESCE(base_delivery_fee, 0) INTO v_delivery_fee FROM public.delivery_settings WHERE store_id = p_store_id AND delivery_active = true;
    v_delivery_fee := COALESCE(v_delivery_fee, 0);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF NULLIF(v_item ->> 'product_id', '') IS NULL THEN RAISE EXCEPTION 'Producto invalido'; END IF;
    BEGIN v_quantity := (v_item ->> 'quantity')::INTEGER; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Cantidad invalida'; END;
    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 100 THEN RAISE EXCEPTION 'Cantidad fuera de rango'; END IF;
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item ->> 'product_id')::UUID AND user_id = p_store_id
        AND COALESCE(is_active, true) = true AND COALESCE(is_available, true) = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
    IF v_product.stock IS NOT NULL AND v_product.stock < v_quantity THEN RAISE EXCEPTION 'Stock insuficiente para %', v_product.name; END IF;

    -- Sólo se activa para la forma de variantes de Moda, no para modificadores de restaurante.
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(v_product.variants, '[]'::JSONB)) variant WHERE variant ? 'talla' OR variant ? 'color') THEN
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_product.variants) variant WHERE NULLIF(variant ->> 'talla', '') IS NOT NULL)
         AND NULLIF(trim(v_item -> 'variant_details' ->> 'talla'), '') IS NULL THEN RAISE EXCEPTION 'Selecciona una talla para %', v_product.name; END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_product.variants) variant WHERE NULLIF(variant ->> 'color', '') IS NOT NULL)
         AND NULLIF(trim(v_item -> 'variant_details' ->> 'color'), '') IS NULL THEN RAISE EXCEPTION 'Selecciona un color para %', v_product.name; END IF;
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_product.variants) variant
        WHERE (NULLIF(variant ->> 'talla', '') IS NULL OR lower(variant ->> 'talla') = lower(v_item -> 'variant_details' ->> 'talla'))
          AND (NULLIF(variant ->> 'color', '') IS NULL OR lower(variant ->> 'color') = lower(v_item -> 'variant_details' ->> 'color'))
      ) THEN RAISE EXCEPTION 'La variante elegida no está disponible para %', v_product.name; END IF;
    END IF;

    SELECT COALESCE(SUM(COALESCE((option_item ->> 'price_modifier')::NUMERIC, 0)), 0) INTO v_modifier_delta
      FROM jsonb_array_elements(COALESCE(v_product.variants, '[]'::JSONB)) group_item
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(group_item -> 'options', '[]'::JSONB)) option_item
      WHERE jsonb_typeof(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) = 'array'
        AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_item -> 'variant_details' -> 'options' -> (group_item ->> 'id')) selected_option(id) WHERE selected_option.id = option_item ->> 'id');
    v_unit_price := ROUND((v_product.price + COALESCE(v_modifier_delta, 0))::NUMERIC, 2);
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    IF v_product.stock IS NOT NULL THEN UPDATE public.products SET stock = stock - v_quantity WHERE id = v_product.id; END IF;
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'price', v_unit_price, 'quantity', v_quantity, 'modifiers', NULLIF(v_item -> 'variant_details', 'null'::JSONB)));
  END LOOP;

  v_total := ROUND(v_subtotal + v_delivery_fee, 2);
  v_status := CASE WHEN p_payment_method IN ('mercadopago', 'tarjeta_mercadopago') THEN 'pendiente_pago' WHEN p_payment_method = 'transferencia' THEN 'pendiente_verificacion' ELSE 'pendiente' END;
  v_sequence := public.get_next_order_sequence(p_store_id);
  v_prefix := COALESCE(NULLIF(regexp_replace(upper(left(v_store_name, 4)), '[^A-Z0-9]', '', 'g'), ''), 'ORDEN');
  v_legacy_id := v_prefix || '-' || to_char(timezone('America/Lima', now()), 'DDMMYY') || '-' || lpad(v_sequence::TEXT, 4, '0');
  INSERT INTO public.orders (id, store_id, order_type, status, customer_name, customer_phone, customer_email, direccion, referencia, lat, lng, delivery_fee, subtotal, total, metodo_pago, payment_proof_url, estimated_time, legacy_id)
    VALUES (v_order_id, p_store_id, p_order_type, v_status, left(trim(p_customer_name),160), left(trim(p_customer_phone),40), NULLIF(left(trim(COALESCE(p_customer_email,'')),254),''), NULLIF(left(trim(COALESCE(p_address,'')),500),''), NULLIF(left(trim(COALESCE(p_reference,'')),500),''), p_lat, p_lng, v_delivery_fee, v_subtotal, v_total, p_payment_method, p_payment_proof_url, CASE WHEN p_order_type = 'delivery' THEN '50 - 60 min' ELSE NULL END, v_legacy_id);
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, name, price, quantity, modifiers)
      VALUES (v_order_id, (v_item ->> 'product_id')::UUID, v_item ->> 'name', (v_item ->> 'price')::NUMERIC, (v_item ->> 'quantity')::INTEGER, NULLIF(v_item -> 'modifiers', 'null'::JSONB));
  END LOOP;
  RETURN QUERY SELECT v_order_id, v_legacy_id, v_subtotal, v_delivery_fee, v_total, v_status;
END;
$$;
