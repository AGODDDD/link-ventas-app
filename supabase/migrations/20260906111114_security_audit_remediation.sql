BEGIN;

ALTER TABLE public.order_inventory_reservations ADD CONSTRAINT order_inventory_reservations_order_product_variant_unique
  UNIQUE USING INDEX order_inventory_reservations_order_product_variant_unique;

-- Existing invalid colors are safely replaced before enforcing the write contract.
UPDATE public.store_config SET primary_color = NULL WHERE primary_color IS NOT NULL AND primary_color !~ '^#[0-9a-fA-F]{6}$';
UPDATE public.store_config SET secondary_color = NULL WHERE secondary_color IS NOT NULL AND secondary_color !~ '^#[0-9a-fA-F]{6}$';
ALTER TABLE public.store_config ADD CONSTRAINT store_config_primary_color_safe CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE public.store_config ADD CONSTRAINT store_config_secondary_color_safe CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9a-fA-F]{6}$');

ALTER TABLE public.orders ADD COLUMN reservation_expires_at timestamptz;
UPDATE public.orders SET reservation_expires_at = created_at + CASE WHEN metodo_pago IN ('whatsapp','contra_entrega') THEN interval '2 hours' ELSE interval '24 hours' END
WHERE inventory_committed_at IS NULL AND status IN ('pendiente', 'pendiente_pago', 'pendiente_verificacion');
CREATE INDEX orders_reservation_expiry_idx ON public.orders(store_id, reservation_expires_at) WHERE inventory_committed_at IS NULL AND status IN ('pendiente','pendiente_pago','pendiente_verificacion');

CREATE FUNCTION public.expire_order_reservations(p_store_id uuid DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count bigint;
BEGIN
  WITH expired AS (
    UPDATE public.orders SET status = 'cancelado', inventory_released_at = now(), updated_at = now()
    WHERE (p_store_id IS NULL OR store_id = p_store_id) AND reservation_expires_at <= now()
      AND inventory_committed_at IS NULL AND status IN ('pendiente','pendiente_pago','pendiente_verificacion')
    RETURNING id
  ), released AS (
    UPDATE public.order_inventory_reservations r SET released_at = now() FROM expired e
    WHERE r.order_id = e.id AND r.committed_at IS NULL AND r.released_at IS NULL RETURNING r.id
  ) SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_order_reservations(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_order_reservations(uuid) TO service_role;

-- The browser may select known IDs and provide a bounded note; names/prices are server-owned.
CREATE FUNCTION public.validate_order_options(p_product_id uuid, p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_product public.products%ROWTYPE; v_details jsonb := COALESCE(NULLIF(p_details, 'null'::jsonb), '{}'::jsonb);
  v_options jsonb; v_group jsonb; v_selected jsonb; v_key text; v_count integer;
  v_result jsonb; v_has_variants boolean;
BEGIN
  SELECT * INTO STRICT v_product FROM public.products WHERE id = p_product_id;
  IF jsonb_typeof(v_details) <> 'object' THEN RAISE EXCEPTION 'Opciones invalidas'; END IF;
  v_options := COALESCE(v_details->'options', '{}'::jsonb);
  IF jsonb_typeof(v_options) <> 'object' THEN RAISE EXCEPTION 'Opciones invalidas'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.product_variants WHERE product_id = p_product_id) INTO v_has_variants;
  IF v_has_variants AND (COALESCE(v_details->>'talla','') = '' OR COALESCE(v_details->>'color','') = '') THEN RAISE EXCEPTION 'Selecciona talla y color'; END IF;
  FOR v_key IN SELECT jsonb_object_keys(v_options) LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(v_product.variants,'[]'::jsonb)) g WHERE g->>'id' = v_key AND jsonb_typeof(g->'options') = 'array') THEN RAISE EXCEPTION 'Grupo desconocido'; END IF;
  END LOOP;
  FOR v_group IN SELECT value FROM jsonb_array_elements(COALESCE(v_product.variants,'[]'::jsonb)) WHERE jsonb_typeof(value->'options') = 'array' LOOP
    v_selected := COALESCE(v_options->(v_group->>'id'), '[]'::jsonb);
    IF jsonb_typeof(v_selected) <> 'array' THEN RAISE EXCEPTION 'Seleccion invalida'; END IF;
    v_count := jsonb_array_length(v_selected);
    IF v_count > COALESCE((v_group->>'max_selections')::integer,1)
      OR (COALESCE((v_group->>'required')::boolean,false) AND v_count < greatest(1,COALESCE((v_group->>'min_selections')::integer,1)))
      OR (v_count > 0 AND v_count < COALESCE((v_group->>'min_selections')::integer,0)) THEN RAISE EXCEPTION 'Cantidad de opciones invalida'; END IF;
    IF v_count <> (SELECT count(DISTINCT value) FROM jsonb_array_elements(v_selected)) THEN RAISE EXCEPTION 'Opciones duplicadas'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_selected) s WHERE jsonb_typeof(s) <> 'string'
      OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_group->'options') o WHERE o->>'id' = s#>>'{}')) THEN RAISE EXCEPTION 'Opcion desconocida'; END IF;
  END LOOP;
  v_result := jsonb_build_object('options',v_options);
  IF v_details ? 'notes' THEN v_result := v_result || jsonb_build_object('notes',left(v_details->>'notes',500)); END IF;
  IF v_has_variants OR v_details ? 'talla' OR v_details ? 'color' THEN
    v_result := v_result || jsonb_build_object('talla',v_details->>'talla','color',v_details->>'color');
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_order_options(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_order_options(uuid,jsonb) TO service_role;

-- Quotas reserve the bucket's maximum bytes per object, including uploads in progress.
-- This deliberately avoids trusting client-supplied metadata.size, which can be absent.
CREATE FUNCTION public.can_upload_store_media(p_bucket text, p_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid(); v_pro boolean; v_used bigint; v_limit bigint;
BEGIN
  IF v_user IS NULL OR p_bucket NOT IN ('productos','avatars') OR split_part(p_name,'/',1) <> v_user::text THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 810));
  SELECT p.plan IN ('pro','trial') AND (p.plan_expires_at IS NULL OR p.plan_expires_at >= now()) INTO v_pro
    FROM public.stores s JOIN public.profiles p ON p.id = s.owner_id
    WHERE s.owner_id = v_user AND s.is_active AND p.plan <> 'inactivo';
  IF NOT FOUND OR EXISTS(SELECT 1 FROM public.account_deletion_requests WHERE user_id = v_user AND status IN ('in_review','completed')) THEN RETURN false; END IF;
  v_limit := CASE WHEN v_pro THEN 2147483648 ELSE 209715200 END;
  SELECT COALESCE(sum(CASE WHEN bucket_id = 'productos' THEN 10485760 ELSE 5242880 END),0) INTO v_used
    FROM storage.objects WHERE bucket_id IN ('productos','avatars') AND split_part(name,'/',1) = v_user::text
      AND NOT (bucket_id = p_bucket AND name = p_name);
  RETURN v_used + CASE WHEN p_bucket = 'productos' THEN 10485760 ELSE 5242880 END <= v_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.can_upload_store_media(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_upload_store_media(text,text) TO authenticated;
ALTER POLICY "Authenticated upload own storefront media" ON storage.objects
  WITH CHECK (public.can_upload_store_media(bucket_id,name));
ALTER POLICY "Authenticated update own storefront media" ON storage.objects
  WITH CHECK (public.can_upload_store_media(bucket_id,name));

CREATE TABLE public.payment_proof_uploads (
  path text PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
ALTER TABLE public.payment_proof_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_proof_uploads FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_proof_uploads TO service_role;
CREATE INDEX payment_proof_uploads_store_idx ON public.payment_proof_uploads(store_id,created_at);
CREATE FUNCTION public.reserve_payment_proof_upload(p_store_id uuid,p_path text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_store_id::text,811));
  IF split_part(p_path,'/',1) <> p_store_id::text
    OR NOT EXISTS(SELECT 1 FROM public.stores s WHERE s.id = p_store_id AND s.is_active
      AND NOT EXISTS(SELECT 1 FROM public.account_deletion_requests d WHERE d.user_id = s.owner_id AND d.status IN ('in_review','completed'))) THEN RETURN false; END IF;
  IF (SELECT count(*) FROM public.payment_proof_uploads WHERE store_id = p_store_id AND created_at > now()-interval '1 day') >= 100
    OR (SELECT count(*) FROM public.payment_proof_uploads WHERE store_id = p_store_id) >= 1000 THEN RETURN false; END IF;
  INSERT INTO public.payment_proof_uploads(path,store_id) VALUES(p_path,p_store_id);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_payment_proof_upload(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_payment_proof_upload(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_store_id UUID, p_order_type TEXT, p_payment_method TEXT,
  p_customer_name TEXT, p_customer_phone TEXT, p_customer_email TEXT,
  p_address TEXT, p_reference TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION,
  p_items JSONB, p_payment_proof_url TEXT DEFAULT NULL
)
RETURNS TABLE (order_id UUID, legacy_id TEXT, subtotal NUMERIC, delivery_fee NUMERIC, total NUMERIC, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_store_name TEXT; v_sequence INTEGER; v_prefix TEXT; v_legacy_id TEXT;
  v_order_id UUID := pg_catalog.gen_random_uuid(); v_subtotal NUMERIC(10,2) := 0;
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
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'El carrito no contiene productos'; END IF;

  IF (SELECT COALESCE(sum((value->>'quantity')::integer),0) FROM jsonb_array_elements(p_items)) > 100 THEN RAISE EXCEPTION 'Demasiadas unidades'; END IF;
  PERFORM public.expire_order_reservations(p_store_id);
  IF v_payment_method = 'transferencia' THEN
    UPDATE public.payment_proof_uploads SET claimed_at = now()
    WHERE path = p_payment_proof_url AND store_id = p_store_id AND claimed_at IS NULL AND created_at > now()-interval '1 day'
      AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id = 'comprobantes' AND name = p_payment_proof_url);
    IF NOT FOUND THEN RAISE EXCEPTION 'Comprobante no disponible'; END IF;
  END IF;
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

    v_item := jsonb_set(v_item,'{variant_details}', public.validate_order_options(v_product.id,v_item->'variant_details'));
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
  UPDATE public.orders SET reservation_expires_at = now() + CASE WHEN v_payment_method IN ('whatsapp','contra_entrega') THEN interval '2 hours' ELSE interval '24 hours' END WHERE id = v_order_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, name, price, quantity, modifiers) VALUES (v_order_id, (v_item ->> 'product_id')::UUID, v_item ->> 'name', (v_item ->> 'price')::numeric, (v_item ->> 'quantity')::integer, nullif(v_item -> 'modifiers', 'null'::JSONB));
    INSERT INTO public.order_inventory_reservations (order_id, product_id, variant_id, quantity) VALUES (v_order_id, (v_item ->> 'product_id')::uuid, nullif(v_item ->> 'variant_id','')::uuid, (v_item ->> 'quantity')::integer)
    ON CONFLICT ON CONSTRAINT order_inventory_reservations_order_product_variant_unique DO UPDATE SET quantity = public.order_inventory_reservations.quantity + EXCLUDED.quantity;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM public.order_inventory_reservations r JOIN public.products p ON p.id = r.product_id
    LEFT JOIN public.product_variants v ON v.id = r.variant_id
    WHERE r.order_id = v_order_id AND (
      SELECT sum(a.quantity) FROM public.order_inventory_reservations a
      WHERE a.product_id = r.product_id AND a.variant_id IS NOT DISTINCT FROM r.variant_id
        AND a.released_at IS NULL AND a.committed_at IS NULL
    ) > CASE WHEN r.variant_id IS NULL THEN p.stock ELSE v.stock END
  ) THEN RAISE EXCEPTION 'Stock insuficiente'; END IF;
  RETURN QUERY SELECT v_order_id, v_legacy_id, v_subtotal, v_delivery_fee, v_total, v_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT) TO service_role;


CREATE OR REPLACE FUNCTION public.transition_order_status(p_order_id UUID, p_next_status TEXT)
RETURNS TABLE(id UUID, status TEXT, payment_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_allowed BOOLEAN := false;
BEGIN
  SELECT * INTO v_order FROM public.orders AS o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.stores AS s WHERE s.id = v_order.store_id AND s.owner_id = auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF v_order.reservation_expires_at <= now() AND v_order.inventory_committed_at IS NULL AND p_next_status <> 'cancelado' THEN RAISE EXCEPTION 'Reserva vencida'; END IF;
  v_allowed := (v_order.status = 'pendiente_pago' AND p_next_status = 'cancelado')
    OR (v_order.status = 'pendiente_verificacion' AND p_next_status IN ('pendiente','cancelado'))
    OR (v_order.status = 'pendiente' AND p_next_status IN ('en_preparacion','cancelado'))
    OR (v_order.status = 'en_preparacion' AND p_next_status IN ('alistando','cancelado'))
    OR (v_order.status = 'alistando' AND p_next_status IN ('en_camino','completado','cancelado'))
    OR (v_order.status = 'en_camino' AND p_next_status IN ('completado','cancelado'));
  IF NOT v_allowed THEN RAISE EXCEPTION 'Transicion de estado invalida'; END IF;
  IF p_next_status = 'pendiente' AND v_order.status = 'pendiente_verificacion' THEN
    UPDATE public.orders AS o SET payment_status = 'approved' WHERE o.id = p_order_id;
    PERFORM public.commit_order_inventory(p_order_id);
  END IF;
  IF p_next_status = 'en_preparacion' THEN PERFORM public.commit_order_inventory(p_order_id); END IF;
  IF p_next_status = 'cancelado' THEN
    UPDATE public.order_inventory_reservations AS r SET released_at = now() WHERE r.order_id = p_order_id AND r.committed_at IS NULL AND r.released_at IS NULL;
    UPDATE public.orders AS o SET inventory_released_at = now() WHERE o.id = p_order_id;
  END IF;
  RETURN QUERY UPDATE public.orders AS o SET status = p_next_status, updated_at = now() WHERE o.id = p_order_id RETURNING o.id, o.status, o.payment_status;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.run_background_maintenance()
RETURNS TABLE(cancelled_orders BIGINT, recovered_carts BIGINT, expired_carts BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_cancelled BIGINT; v_recovered BIGINT; v_expired BIGINT;
BEGIN
  v_cancelled := public.expire_order_reservations(NULL);
  WITH updated AS (UPDATE public.abandoned_carts cart SET recovered = true, processing_status = 'recovered', processed_at = now() WHERE cart.recovered = false AND cart.processing_status = 'pending' AND EXISTS (SELECT 1 FROM public.orders o WHERE o.store_id = cart.store_id AND o.customer_phone = cart.customer_phone AND o.created_at >= cart.created_at AND o.status <> 'cancelado') RETURNING cart.id) SELECT count(*) INTO v_recovered FROM updated;
  WITH updated AS (UPDATE public.abandoned_carts SET processing_status = 'expired', processed_at = now() WHERE recovered = false AND processing_status = 'pending' AND expires_at <= now() RETURNING id) SELECT count(*) INTO v_expired FROM updated;
  DELETE FROM public.abandoned_cart_rate_limits WHERE updated_at < now()-interval '7 days';
  DELETE FROM public.webhook_deliveries WHERE claimed_at < now()-interval '7 days';
  RETURN QUERY SELECT v_cancelled, v_recovered, v_expired;
END;
$$;

REVOKE ALL ON FUNCTION public.run_background_maintenance() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.run_background_maintenance() TO service_role;
CREATE TABLE public.webhook_deliveries (
  delivery_key text PRIMARY KEY,
  claim_token uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.webhook_deliveries FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
CREATE FUNCTION public.claim_webhook_delivery(p_key text,p_token uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.webhook_deliveries(delivery_key,claim_token) VALUES(p_key,p_token)
  ON CONFLICT(delivery_key) DO UPDATE SET claim_token=EXCLUDED.claim_token,claimed_at=now()
    WHERE public.webhook_deliveries.completed_at IS NULL AND public.webhook_deliveries.claimed_at < now()-interval '2 minutes';
  IF FOUND THEN RETURN 'claimed'; END IF;
  IF EXISTS(SELECT 1 FROM public.webhook_deliveries WHERE delivery_key=p_key AND completed_at IS NOT NULL) THEN RETURN 'done'; END IF;
  RETURN 'busy';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_webhook_delivery(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_delivery(text,uuid) TO service_role;
COMMIT;
