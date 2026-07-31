-- Culqi was removed from the billing model. This legacy trigger still assigned
-- NEW.culqi_active during profile inserts, aborting auth.users signups because
-- that column no longer exists.
DROP TRIGGER IF EXISTS trg_enforce_billing_sensitive_fields ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_billing_sensitive_fields();
