export function storefrontCsp(nonce: string, development: boolean) {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    `connect-src 'self' https: wss:${development ? ' http://localhost:* http://127.0.0.1:* ws:' : ''}`,
    'frame-src https:',
    "media-src 'self' https: blob:",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self' https:",
  ].join('; ')
}
