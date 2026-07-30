-- Mercado Pago es la unica pasarela activa para la plataforma y sus comercios.
DO $$
DECLARE
  v_oid OID;
  v_definition TEXT;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'create_order_from_cart'
  LIMIT 1;

  IF v_oid IS NOT NULL THEN
    v_definition := pg_get_functiondef(v_oid);
    v_definition := replace(v_definition, '''culqi'', ''tarjeta_culqi'',', '''mercadopago'', ''tarjeta_mercadopago'',');
    v_definition := replace(v_definition, 'p_payment_method IN (''culqi'', ''tarjeta_culqi'')', 'p_payment_method IN (''mercadopago'', ''tarjeta_mercadopago'')');
    EXECUTE v_definition;
  END IF;
END;
$$;

ALTER TABLE public.platform_billing_charges RENAME TO platform_billing_payments;
ALTER TABLE public.platform_billing_payments DROP CONSTRAINT IF EXISTS platform_billing_charges_provider_check;
ALTER TABLE public.platform_billing_payments DROP CONSTRAINT IF EXISTS platform_billing_charges_amount_check;
ALTER TABLE public.platform_billing_payments ADD CONSTRAINT platform_billing_payments_provider_check CHECK (provider IN ('mercadopago', 'legacy'));
ALTER TABLE public.platform_billing_payments ADD CONSTRAINT platform_billing_payments_amount_check CHECK (amount = 2500 OR provider = 'legacy');
UPDATE public.platform_billing_payments SET provider = 'legacy' WHERE provider <> 'mercadopago';
ALTER TABLE public.platform_billing_payments ALTER COLUMN provider SET DEFAULT 'mercadopago';

CREATE OR REPLACE FUNCTION public.activate_platform_pro_subscription(
  p_user_id UUID,
  p_payment_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT
)
RETURNS TABLE(plan TEXT, plan_expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <> 25 OR p_currency <> 'PEN' OR length(trim(p_payment_id)) = 0 THEN
    RAISE EXCEPTION 'Pago de suscripcion invalido';
  END IF;

  INSERT INTO public.platform_billing_payments (user_id, provider, provider_charge_id, amount, currency)
  VALUES (p_user_id, 'mercadopago', p_payment_id, 2500, p_currency)
  ON CONFLICT (provider_charge_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN QUERY SELECT p.plan, p.plan_expires_at FROM public.profiles p WHERE p.id = p_user_id;
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.profiles p
  SET plan = 'pro', plan_expires_at = GREATEST(COALESCE(p.plan_expires_at, now()), now()) + interval '30 days', updated_at = now()
  WHERE p.id = p_user_id
  RETURNING p.plan, p.plan_expires_at;
END;
$$;

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
      OR NEW.mercadopago_payment_id IS DISTINCT FROM OLD.mercadopago_payment_id
      OR NEW.mercadopago_paid_at IS DISTINCT FROM OLD.mercadopago_paid_at THEN
      RAISE EXCEPTION 'Los campos financieros de una orden no pueden cambiarse desde el cliente';
    END IF;
    IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Solo el conciliador de pagos puede marcar una orden como pagada';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP INDEX IF EXISTS public.orders_culqi_charge_id_unique;
ALTER TABLE public.orders DROP COLUMN IF EXISTS culqi_charge_id, DROP COLUMN IF EXISTS culqi_paid_at;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS culqi_active CASCADE, DROP COLUMN IF EXISTS culqi_public_key CASCADE, DROP COLUMN IF EXISTS culqi_secret_key CASCADE;
ALTER TABLE public.store_config DROP COLUMN IF EXISTS culqi_active CASCADE, DROP COLUMN IF EXISTS culqi_public_key CASCADE;
