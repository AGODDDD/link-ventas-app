export function getPublicAppOrigin(requestUrl: string) {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, '')
  if (configured && /^https:\/\//i.test(configured)) return configured

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (vercelHost) return `https://${vercelHost}`

  return new URL(requestUrl).origin
}
