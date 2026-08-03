import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { hasValidMercadoPagoSignature } from '../lib/mercadoPagoWebhook'

test('rejects Mercado Pago webhooks when the secret or required headers are missing', () => {
  assert.equal(hasValidMercadoPagoSignature('ts=1,v1=abc', 'request-1', '123', undefined), false)
  assert.equal(hasValidMercadoPagoSignature(null, 'request-1', '123', 'secret'), false)
  assert.equal(hasValidMercadoPagoSignature('ts=1,v1=abc', null, '123', 'secret'), false)
})

test('accepts only the exact Mercado Pago HMAC signature', () => {
  const secret = 'webhook-secret'
  const paymentId = '123456'
  const requestId = 'request-1'
  const timestamp = '1785686400'
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`
  const digest = createHmac('sha256', secret).update(manifest).digest('hex')

  assert.equal(
    hasValidMercadoPagoSignature(`ts=${timestamp},v1=${digest}`, requestId, paymentId, secret),
    true,
  )
  assert.equal(
    hasValidMercadoPagoSignature(`ts=${timestamp},v1=${'0'.repeat(64)}`, requestId, paymentId, secret),
    false,
  )
})

