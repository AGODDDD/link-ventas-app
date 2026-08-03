import { NextResponse, type NextRequest } from 'next/server'

/**
 * LINKVENTAS REQUEST PROXY
 * ─────────────────────────────────────────────────────────────────────────────
 * Filtro rápido de presencia de sesión. La validez del JWT y el plan se
 * verifican en rutas servidor y en el layout mediante /api/billing/status.
 * En Next.js 16, Proxy usa el runtime Node.js por defecto.
 *
 * Nunca se confía en cookies de plan modificables desde JavaScript para tomar
 * decisiones de autorización.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rutas siempre públicas ────────────────────────────────────────────────
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/tienda')

  if (isPublicRoute) return NextResponse.next()

  // ── Verificar sesión (token de Supabase) ──────────────────────────────────
  // Supabase guarda el token en una cookie con el proyecto en el nombre.
  // También soportamos la cookie manual `sb-access-token` que seteamos en login.
  const supabaseProjectId = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1]
    : ''

  const sessionToken =
    request.cookies.get('sb-access-token')?.value ??
    request.cookies.get(`sb-${supabaseProjectId}-auth-token`)?.value

  if (!sessionToken) {
    // Sin sesión → redirigir al login
    const response = NextResponse.redirect(new URL('/login', request.url))
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/pendiente', '/auth/callback', '/admin'],
}
