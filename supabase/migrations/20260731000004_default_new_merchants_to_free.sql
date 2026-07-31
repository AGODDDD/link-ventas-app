-- New merchants must be able to access the free dashboard immediately.
-- Keep existing inactive accounts unchanged; this only affects new profile rows.
ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name, whatsapp_number, plan)
  VALUES (NEW.id, 'Mi Nuevo Negocio', '', 'free');
  RETURN NEW;
END;
$$;
