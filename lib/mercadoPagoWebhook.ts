import { createHmac, timingSafeEqual } from 'crypto'

export function hasValidMercadoPagoSignature(
  signature: string | null,
  requestId: string | null,
  paymentId: string,
  secret: string | undefined,
) {
  if (!secret || !signature || !requestId || !paymentId) return false

  const timestamp = signature.match(/(?:^|,)\s*ts=([^,]+)/)?.[1]?.trim()
  const received = signature.match(/(?:^|,)\s*v1=([a-f0-9]+)/i)?.[1]?.toLowerCase()
  if (!timestamp || !received) return false

  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  if (received.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'))
}

