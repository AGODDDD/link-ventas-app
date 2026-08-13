-- Performs the coupled store/profile change in one database transaction.
-- This function is intentionally service-role-only; admin authorization remains
-- enforced by the Next.js route before it invokes the function.
CREATE OR REPLACE FUNCTION public.set_admin_store_suspension(
  p_store_id UUID,
  p_suspend BOOLEAN
)
RETURNS TABLE (
  is_active BOOLEAN,
  plan TEXT,
  plan_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id
  INTO v_owner_id
  FROM public.stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'store_not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.stores
  SET is_active = NOT p_suspend
  WHERE id = p_store_id;

  IF p_suspend THEN
    UPDATE public.profiles
    SET plan = 'inactivo', plan_expires_at = NULL
    WHERE id = v_owner_id;
  END IF;

  RETURN QUERY
  SELECT s.is_active, p.plan, p.plan_expires_at
  FROM public.stores AS s
  JOIN public.profiles AS p ON p.id = s.owner_id
  WHERE s.id = p_store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin_store_suspension(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_store_suspension(UUID, BOOLEAN) TO service_role;
