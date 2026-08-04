-- Mercado Pago Subscriptions: the provider is the source of truth for every
-- recurring charge. This table is server-only and is never exposed to clients.
BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago' CHECK (provider = 'mercadopago'),
  provider_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'authorized', 'paused', 'cancelled')),
  checkout_url TEXT,
  next_payment_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_billing_subscriptions_user_idx
  ON public.platform_billing_subscriptions (user_id, created_at DESC);

ALTER TABLE public.platform_billing_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_billing_subscriptions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_platform_pro_subscription_charge(
  p_user_id UUID,
  p_subscription_id TEXT,
  p_invoice_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_paid_at TIMESTAMPTZ
)
RETURNS TABLE(plan TEXT, plan_expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_subscription public.platform_billing_subscriptions%ROWTYPE;
BEGIN
  IF p_amount <> 25 OR p_currency <> 'PEN'
    OR length(trim(p_subscription_id)) = 0 OR length(trim(p_invoice_id)) = 0 THEN
    RAISE EXCEPTION 'Cobro de suscripcion invalido';
  END IF;

  SELECT * INTO v_subscription
  FROM public.platform_billing_subscriptions AS s
  WHERE s.user_id = p_user_id
    AND s.provider_subscription_id = p_subscription_id
    AND s.status IN ('pending', 'authorized')
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Suscripcion no autorizada'; END IF;

  INSERT INTO public.platform_billing_payments (user_id, provider_charge_id, amount, currency)
  VALUES (p_user_id, p_invoice_id, 2500, p_currency)
  ON CONFLICT (provider_charge_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN QUERY SELECT p.plan, p.plan_expires_at FROM public.profiles AS p WHERE p.id = p_user_id;
    RETURN;
  END IF;

  UPDATE public.platform_billing_subscriptions AS s
  SET status = 'authorized', updated_at = now()
  WHERE s.id = v_subscription.id;

  RETURN QUERY
  UPDATE public.profiles AS p
  SET plan = 'pro',
      plan_expires_at = greatest(coalesce(p.plan_expires_at, p_paid_at), p_paid_at) + interval '30 days',
      updated_at = now()
  WHERE p.id = p_user_id
  RETURNING p.plan, p.plan_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.record_platform_pro_subscription_charge(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_platform_pro_subscription_charge(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) TO service_role;

COMMIT;
