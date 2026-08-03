-- Repair the contract shared by the Moda storefront and the order RPC.
-- Legacy Moda products kept their talla/color combinations only in products.variants,
-- while product_variants contained incomplete size-only rows. The checkout validates
-- the JSON combination but the RPC reserves against product_variants, so purchases
-- could never be created.

BEGIN;

-- Remove only malformed relational rows for products that clearly use Moda's
-- talla/color JSON format. Properly normalized rows (both fields present) remain.
DELETE FROM public.product_variants AS pv
USING public.products AS p
WHERE p.id = pv.product_id
  AND jsonb_typeof(COALESCE(p.variants, '[]'::jsonb)) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.variants) AS item
    WHERE item ? 'talla' AND item ? 'color'
  )
  AND (pv.talla IS NULL OR pv.color IS NULL);

-- Backfill every declared talla/color combination. This is idempotent and also
-- keeps the relational representation aligned with the JSON used by the UI.
INSERT INTO public.product_variants (
  store_id,
  product_id,
  name,
  value,
  stock,
  price_delta,
  talla,
  color,
  combination_key
)
SELECT
  p.user_id,
  p.id,
  concat(item ->> 'talla', ' / ', item ->> 'color'),
  item ->> 'talla',
  CASE
    WHEN (item ->> 'stock') ~ '^[0-9]+$' THEN (item ->> 'stock')::integer
    ELSE NULL
  END,
  0,
  item ->> 'talla',
  item ->> 'color',
  lower(concat_ws('|', item ->> 'talla', item ->> 'color'))
FROM public.products AS p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants, '[]'::jsonb)) AS item
WHERE item ? 'talla'
  AND item ? 'color'
ON CONFLICT (product_id, combination_key) WHERE combination_key IS NOT NULL
DO UPDATE SET
  store_id = EXCLUDED.store_id,
  name = EXCLUDED.name,
  value = EXCLUDED.value,
  talla = EXCLUDED.talla,
  color = EXCLUDED.color,
  stock = COALESCE(EXCLUDED.stock, public.product_variants.stock);

-- A primary key makes every participating column NOT NULL. Reservations for a
-- standard product intentionally have no variant_id, so use a surrogate primary
-- key and preserve the natural uniqueness with NULLS NOT DISTINCT.
ALTER TABLE public.order_inventory_reservations
  DROP CONSTRAINT IF EXISTS order_inventory_reservations_pkey;

ALTER TABLE public.order_inventory_reservations
  ALTER COLUMN variant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE public.order_inventory_reservations
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.order_inventory_reservations
  ALTER COLUMN id SET NOT NULL,
  ADD CONSTRAINT order_inventory_reservations_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS order_inventory_reservations_order_product_variant_unique
  ON public.order_inventory_reservations (order_id, product_id, variant_id) NULLS NOT DISTINCT;

COMMIT;
