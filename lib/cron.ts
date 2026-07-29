import { timingSafeEqual } from 'crypto'

export function isAuthorizedCronRequest(authorization: string | null, secret: string | undefined) {
  if (!secret || !authorization?.startsWith('Bearer ')) return false

  const token = authorization.slice('Bearer '.length).trim()
  const expected = Buffer.from(secret)
  const received = Buffer.from(token)

  return expected.length === received.length && timingSafeEqual(expected, received)
}
