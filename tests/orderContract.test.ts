import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { normalizeOrderPaymentMethod } from '../lib/orderPayment'

const migration = readFileSync(
  new URL('../supabase/migrations/20260803000000_fix_order_contract_boundaries.sql', import.meta.url),
  'utf8',
)
const hardeningMigration = readFileSync(
  new URL('../supabase/migrations/20260803133601_harden_order_abuse_and_function_paths.sql', import.meta.url),
  'utf8',
)

test('normaliza el alias visual de Mercado Pago al valor canónico', () => {
  assert.equal(normalizeOrderPaymentMethod('tarjeta_mercadopago'), 'mercadopago')
  assert.equal(normalizeOrderPaymentMethod('transferencia'), 'transferencia')
})

test('la migración reinicia la variante por cada línea y permite el alias de tarjeta', () => {
  assert.match(migration, /v_payment_method := CASE WHEN p_payment_method = 'tarjeta_mercadopago'/)
  assert.match(migration, /v_variant_id := NULL;/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.transition_order_status\(UUID, TEXT\) TO authenticated/)
})

test('las funciones privilegiadas cierran el search path', () => {
  assert.match(hardeningMigration, /SECURITY DEFINER SET search_path = ''/)
  assert.match(hardeningMigration, /pg_catalog\.gen_random_uuid\(\)/)
  assert.match(hardeningMigration, /ALTER FUNCTION public\.confirm_mercadopago_order_payment\(UUID, TEXT, TIMESTAMPTZ\) SET search_path = ''/)
  assert.match(hardeningMigration, /FROM public\.orders AS o WHERE o\.id = p_order_id FOR UPDATE/)
  assert.match(hardeningMigration, /NULLIF\(auth\.jwt\(\) ->> 'email', ''\)/)
  assert.doesNotMatch(hardeningMigration, /culqi_active/)
})
