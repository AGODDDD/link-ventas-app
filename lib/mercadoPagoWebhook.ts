import { createHmac, timingSafeEqual } from 'crypto'

export function hasValidMercadoPagoSignature(
  signature: string | null,
  requestId: string | null,
  paymentId: string,
  secret: string | undefined,
  now = Date.now(),
) {
  if (!secret || !signature || !requestId || !paymentId) return false

  const timestamp = signature.match(/(?:^|,)\s*ts=([^,]+)/)?.[1]?.trim()
  const received = signature.match(/(?:^|,)\s*v1=([a-f0-9]+)/i)?.[1]?.toLowerCase()
  if (!timestamp || !received || !/^\d{10}(?:\d{3})?$/.test(timestamp)) return false
  // Accept seconds and milliseconds. Keep the provider's delayed delivery/retry
  // window, but never accept arbitrarily old or future-dated notifications.
  const signedAt = Number(timestamp) * (timestamp.length === 10 ? 1000 : 1)
  if (signedAt > now + 5 * 60_000 || signedAt < now - 72 * 60 * 60_000) return false

  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  if (received.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'))
}

