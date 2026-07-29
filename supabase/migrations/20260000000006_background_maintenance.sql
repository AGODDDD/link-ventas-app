-- La ejecución se agenda desde Vercel, pero los cambios viven juntos en PostgreSQL.
ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

ALTER TABLE public.abandoned_carts
  DROP CONSTRAINT IF EXISTS abandoned_carts_processing_status_check;

ALTER TABLE public.abandoned_carts
  ADD CONSTRAINT abandoned_carts_processing_status_check
  CHECK (processing_status IN ('pending', 'recovered', 'expired'));

UPDATE public.abandoned_carts
SET processing_status = CASE WHEN recovered THEN 'recovered' ELSE 'pending' END
WHERE processing_status IS NULL OR (recovered AND processing_status = 'pending');

CREATE INDEX IF NOT EXISTS abandoned_carts_maintenance_idx
  ON public.abandoned_carts (processing_status, expires_at)
  WHERE recovered = false;

CREATE OR REPLACE FUNCTION public.run_background_maintenance()
RETURNS TABLE (
  cancelled_orders BIGINT,
  recovered_carts BIGINT,
  expired_carts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled_orders BIGINT := 0;
  v_recovered_carts BIGINT := 0;
  v_expired_carts BIGINT := 0;
BEGIN
  -- Solo las órdenes pendientes de pago, o de WhatsApp sin confirmar, vencen a las 24 h.
  WITH updated AS (
    UPDATE public.orders
    SET status = 'cancelado'
    WHERE created_at < now() - interval '24 hours'
      AND (
        status = 'pendiente_pago'
        OR (status = 'pendiente' AND metodo_pago = 'whatsapp')
      )
    RETURNING id
  )
  SELECT count(*) INTO v_cancelled_orders FROM updated;

  -- Una orden posterior del mismo comercio y teléfono convierte el carrito en recuperado.
  WITH updated AS (
    UPDATE public.abandoned_carts AS cart
    SET recovered = true,
        processing_status = 'recovered',
        processed_at = now()
    WHERE cart.recovered = false
      AND cart.processing_status = 'pending'
      AND EXISTS (
        SELECT 1
        FROM public.orders AS order_record
        WHERE order_record.store_id = cart.store_id
          AND order_record.customer_phone = cart.customer_phone
          AND order_record.created_at >= cart.created_at
          AND order_record.status <> 'cancelado'
      )
    RETURNING cart.id
  )
  SELECT count(*) INTO v_recovered_carts FROM updated;

  -- El carrito pendiente que supera su ventana de recuperación se cierra explícitamente.
  WITH updated AS (
    UPDATE public.abandoned_carts
    SET processing_status = 'expired',
        processed_at = now()
    WHERE recovered = false
      AND processing_status = 'pending'
      AND expires_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_expired_carts FROM updated;

  RETURN QUERY SELECT v_cancelled_orders, v_recovered_carts, v_expired_carts;
END;
$$;

REVOKE ALL ON FUNCTION public.run_background_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_background_maintenance() TO service_role;
