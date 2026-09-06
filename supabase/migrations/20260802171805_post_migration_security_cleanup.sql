BEGIN;

-- Eliminate the remaining mutable search paths reported by the advisor.
ALTER FUNCTION public.update_delivery_orders_updated_at() SET search_path = '';
CREATE OR REPLACE FUNCTION public.get_next_order_sequence(p_store_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seq INTEGER;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::DATE;
BEGIN
  INSERT INTO public.store_sequences (store_id, date, seq_value)
  VALUES (p_store_id, v_today, 1)
  ON CONFLICT (store_id, date)
  DO UPDATE SET seq_value = public.store_sequences.seq_value + 1
  RETURNING seq_value INTO v_seq;
  RETURN v_seq;
END;
$$;

-- Browser clients now call authenticated server routes; only the service role
-- may execute privileged state-changing functions.
REVOKE EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_own_plan_free() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_own_plan_free() TO service_role;

-- Keep a single canonical review uniqueness index.
DROP INDEX IF EXISTS public.idx_reviews_unique;

-- Cover active foreign keys used by joins and cascades.
CREATE INDEX IF NOT EXISTS menu_categories_store_idx
  ON public.menu_categories (store_id);
CREATE INDEX IF NOT EXISTS order_inventory_reservations_variant_idx
  ON public.order_inventory_reservations (variant_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS platform_billing_payments_user_idx
  ON public.platform_billing_payments (user_id);

-- FOR ALL generated a second authenticated SELECT policy. Split mutations so
-- each role/action has a single permissive policy.
DROP POLICY IF EXISTS "Owners manage delivery settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "Owners insert delivery settings" ON public.delivery_settings;
CREATE POLICY "Owners insert delivery settings" ON public.delivery_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Owners update delivery settings" ON public.delivery_settings;
CREATE POLICY "Owners update delivery settings" ON public.delivery_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Owners delete delivery settings" ON public.delivery_settings;
CREATE POLICY "Owners delete delivery settings" ON public.delivery_settings
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = delivery_settings.store_id AND s.owner_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Owners manage menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners insert menu categories" ON public.menu_categories;
CREATE POLICY "Owners insert menu categories" ON public.menu_categories
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Owners update menu categories" ON public.menu_categories;
CREATE POLICY "Owners update menu categories" ON public.menu_categories
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "Owners delete menu categories" ON public.menu_categories;
CREATE POLICY "Owners delete menu categories" ON public.menu_categories
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = menu_categories.store_id AND s.owner_id = (SELECT auth.uid())
  ));

COMMIT;
