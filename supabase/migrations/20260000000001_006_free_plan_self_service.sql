-- Permite que un usuario autenticado cambie solamente su propio plan a free.
-- Evita depender de SUPABASE_SERVICE_ROLE_KEY para el CTA publico de downgrade.

CREATE OR REPLACE FUNCTION public.set_own_plan_free()
RETURNS TABLE(plan text, plan_expires_at timestamptz, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.profiles
  SET
    plan = 'free',
    plan_expires_at = NULL,
    culqi_active = false,
    updated_at = now()
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

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
