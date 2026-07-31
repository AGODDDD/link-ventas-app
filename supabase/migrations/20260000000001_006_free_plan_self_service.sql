CREATE OR REPLACE FUNCTION public.set_own_plan_free()
RETURNS TABLE(plan TEXT, plan_expires_at TIMESTAMPTZ, active BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.profiles SET plan = 'free', plan_expires_at = NULL, updated_at = now() WHERE id = auth.uid();
  RETURN QUERY SELECT p.plan, p.plan_expires_at, true FROM public.profiles p WHERE p.id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.set_own_plan_free() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_own_plan_free() TO authenticated;
