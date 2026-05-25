-- Hace idempotente el downgrade a free.
-- Si un usuario autenticado existe en auth.users pero aun no tiene fila en profiles,
-- se crea el perfil minimo y se deja en Plan Emprendedor.

CREATE OR REPLACE FUNCTION public.set_own_plan_free()
RETURNS TABLE(plan text, plan_expires_at timestamptz, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_email text;
BEGIN
  current_user_id := auth.uid();
  current_email := COALESCE(auth.jwt() ->> 'email', '');

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    plan,
    plan_expires_at,
    culqi_active,
    updated_at
  )
  VALUES (
    current_user_id,
    current_email,
    'free',
    NULL,
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
    plan = 'free',
    plan_expires_at = NULL,
    culqi_active = false,
    updated_at = now();

  RETURN QUERY
  SELECT
    p.plan,
    p.plan_expires_at,
    true
  FROM public.profiles p
  WHERE p.id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_plan_free() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_own_plan_free() TO authenticated;
