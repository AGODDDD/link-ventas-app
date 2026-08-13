BEGIN;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'rejected', 'completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  resolution_note TEXT,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_status_due_idx
  ON public.account_deletion_requests (status, due_at);
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_open_user_idx
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('pending', 'in_review');

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_deletion_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.anonymize_account_for_deletion(
  p_request_id UUID,
  p_reviewer_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_store_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.account_deletion_requests
  WHERE id = p_request_id
    AND status = 'in_review'
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Solicitud de eliminación no disponible';
  END IF;

  FOR v_store_id IN
    SELECT id FROM public.stores WHERE owner_id = v_user_id
  LOOP
    UPDATE public.orders
    SET customer_name = NULL,
        customer_phone = NULL,
        customer_email = NULL,
        direccion = NULL,
        referencia = NULL,
        lat = NULL,
        lng = NULL,
        payment_proof_url = NULL,
        updated_at = now()
    WHERE store_id = v_store_id;

    UPDATE public.delivery_orders
    SET customer_name = NULL,
        customer_phone = NULL,
        customer_email = NULL,
        direccion = NULL,
        referencia = NULL,
        lat = NULL,
        lng = NULL
    WHERE store_id = v_store_id;

    DELETE FROM public.store_leads WHERE store_id = v_store_id;
    DELETE FROM public.abandoned_carts WHERE store_id = v_store_id;
    DELETE FROM public.product_reviews WHERE store_id = v_store_id;
    DELETE FROM public.order_inventory_reservations
      WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);
    DELETE FROM public.order_items
      WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);
    DELETE FROM public.product_variants WHERE store_id = v_store_id;
    DELETE FROM public.products WHERE user_id = v_store_id;
    DELETE FROM public.menu_categories WHERE store_id = v_store_id;
    DELETE FROM public.delivery_settings WHERE store_id = v_store_id;
    DELETE FROM public.store_config WHERE store_id = v_store_id;

    UPDATE public.stores
    SET name = 'Cuenta eliminada',
        slug = 'cuenta-eliminada-' || replace(v_store_id::text, '-', ''),
        description = NULL,
        avatar_url = NULL,
        banner_url = NULL,
        whatsapp_phone = NULL,
        is_active = false,
        updated_at = now()
    WHERE id = v_store_id;
  END LOOP;

  UPDATE public.account_deletion_requests
  SET status = 'completed',
      reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      completed_at = now(),
      resolution_note = 'Datos personales anonimizados y cuenta desactivada.'
  WHERE id = p_request_id;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_account_for_deletion(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_account_for_deletion(UUID, UUID) TO service_role;

COMMIT;
