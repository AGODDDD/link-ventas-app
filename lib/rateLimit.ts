import { createHash } from 'crypto'

export function getClientAddress(request: Request) {
  // Vercel sets this header at its edge. Only use the generic forwarding
  // headers as development fallbacks, where no provider header exists.
  return request.headers.get('x-vercel-forwarded-for')?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    || 'unknown'
}

export function getRateLimitKey(request: Request, scope: string, dimensions: string[] = []) {
  const ip = getClientAddress(request)
  return createHash('sha256')
    .update([scope, ip, ...dimensions].join(':'))
    .digest('hex')
}
