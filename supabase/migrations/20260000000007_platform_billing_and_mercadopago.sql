-- Facturacion de LinkVentas y reemplazo de la pasarela de cada comercio.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT;

ALTER TABLE public.store_config
  ADD COLUMN IF NOT EXISTS mercadopago_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_paid_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_mercadopago_payment_id_unique
  ON public.orders (mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.platform_billing_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'culqi'),
  provider_charge_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount = 2500),
  currency TEXT NOT NULL CHECK (currency = 'PEN'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_billing_charges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_billing_charges FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_platform_pro_subscription(
  p_user_id UUID,
  p_charge_id TEXT,
  p_amount INTEGER,
  p_currency TEXT
)
RETURNS TABLE(plan TEXT, plan_expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_amount <> 2500 OR p_currency <> 'PEN' OR length(trim(p_charge_id)) = 0 THEN
    RAISE EXCEPTION 'Cobro de suscripcion invalido';
  END IF;

  INSERT INTO public.platform_billing_charges (user_id, provider, provider_charge_id, amount, currency)
  VALUES (p_user_id, 'culqi', p_charge_id, p_amount, p_currency)
  ON CONFLICT (provider_charge_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN QUERY SELECT p.plan, p.plan_expires_at FROM public.profiles p WHERE p.id = p_user_id;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET plan = 'pro',
      plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + interval '30 days',
      updated_at = now()
  WHERE id = p_user_id
  RETURNING profiles.plan, profiles.plan_expires_at INTO plan, plan_expires_at;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_platform_pro_subscription(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_platform_pro_subscription(UUID, TEXT, INTEGER, TEXT) TO service_role;
