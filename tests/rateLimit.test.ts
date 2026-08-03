import assert from 'node:assert/strict'
import test from 'node:test'
import { getClientAddress, getRateLimitKey } from '../lib/rateLimit'

test('prioriza la dirección confiable entregada por Vercel', () => {
  const request = new Request('https://example.test', {
    headers: {
      'x-forwarded-for': 'direccion-falsificada, proxy',
      'x-vercel-forwarded-for': '203.0.113.11',
    },
  })

  assert.equal(getClientAddress(request), '203.0.113.11')
})

test('la clave de rate limit queda aislada por alcance', () => {
  const request = new Request('https://example.test', { headers: { 'x-vercel-forwarded-for': '203.0.113.11' } })
  assert.notEqual(getRateLimitKey(request, 'order-create'), getRateLimitKey(request, 'order-tracking'))
})
