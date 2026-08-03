import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL('../supabase/migrations/20260802163740_harden_multitenant_security.sql', import.meta.url),
  'utf8',
)
const webhookRoute = readFileSync(
  new URL('../app/api/webhooks/mercadopago/route.ts', import.meta.url),
  'utf8',
)
const ordersRoute = readFileSync(
  new URL('../app/api/orders/route.ts', import.meta.url),
  'utf8',
)
const trackingRoute = readFileSync(
  new URL('../app/api/orders/status/route.ts', import.meta.url),
  'utf8',
)

test('security migration removes public profile access and legacy order policies', () => {
  assert.match(migration, /REVOKE ALL ON TABLE public\.profiles FROM anon, authenticated/)
  assert.match(migration, /GRANT SELECT \(id, plan, plan_expires_at\) ON TABLE public\.profiles TO authenticated/)
  assert.match(migration, /DROP POLICY IF EXISTS "Merchants ven sus propias órdenes"/)
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+auth\.uid\(\)\s*=\s*merchant_id/s)
})

test('payment signatures are isolated between platform and merchant applications', () => {
  assert.match(migration, /mercadopago_webhook_secret TEXT/)
  assert.match(webhookRoute, /scope === 'platform'/)
  assert.match(webhookRoute, /process\.env\.MP_WEBHOOK_SECRET/)
  assert.match(webhookRoute, /decryptText\(profile\.mercadopago_webhook_secret\)/)
})

test('privileged RPCs are explicitly denied to public roles', () => {
  for (const fn of [
    'create_order_from_cart',
    'activate_platform_pro_subscription',
    'confirm_mercadopago_order_payment',
    'commit_order_inventory',
    'run_background_maintenance',
  ]) {
    assert.match(migration, new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${fn}\\([^;]+FROM PUBLIC, anon, authenticated`))
  }
})

test('merchant policies resolve ownership through stores.owner_id', () => {
  assert.match(migration, /s\.owner_id = \(SELECT auth\.uid\(\)\)/)
  assert.match(migration, /CREATE POLICY "Owners read orders"/)
  assert.match(migration, /CREATE POLICY "Owners update products"/)
})

test('public order creation and tracking are rate limited before privileged access', () => {
  assert.match(ordersRoute, /getRateLimitKey\(req, 'order-create', \[storeId\]\)/)
  assert.match(ordersRoute, /p_limit: 5/)
  assert.match(trackingRoute, /getRateLimitKey\(req, 'order-tracking', \[storeId\]\)/)
})
