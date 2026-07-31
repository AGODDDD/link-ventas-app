-- CREATE OR REPLACE preserves explicit role grants. These RPCs are internal
-- service-role entrypoints and must not be callable through the public Data API.
REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  DOUBLE PRECISION, DOUBLE PRECISION, JSONB, TEXT
) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.activate_platform_pro_subscription(
  UUID, TEXT, NUMERIC, TEXT
) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_abandoned_cart_rate_limit(
  TEXT, INTEGER, INTEGER
) FROM anon, authenticated;
