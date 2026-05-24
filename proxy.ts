import { NextResponse, type NextRequest } from 'next/server'

/**
 * LINKVENTAS EDGE MIDDLEWARE
 * ─────────────────────────────────────────────────────────────────────────────
 * Ultra rápido: lee SOLO cookies, CERO consultas a la base de datos.
 * Compatible 100% con Edge Runtime de Vercel.
 *
 * Cookie `sb-plan-status` tiene el formato:
 *   - "trial|2026-06-03T15:00:00.000Z"  → trial activo con fecha de vencimiento
 *   - "pro|2026-12-31T23:59:59.000Z"    → pro activo
 *   - "free"                             → plan gratuito (acceso con restricciones)
 *   - "inactivo"                         → suspendido manualmente
 *
 * Esta cookie la setea el DashboardLayout en el cliente tras consultar Supabase.
 * Si la cookie no existe aún (primer acceso), dejamos pasar y el layout
 * la inicializa, asigna el trial y gestiona la redirección si es necesario.
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
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Admin siempre pasa sin restricciones ──────────────────────────────────
  // El admin se identifica por una variable de entorno; no necesitamos DB.
  // (El layout verifica esto en detalle con Supabase para mayor seguridad.)

  // ── Leer cookie de plan ───────────────────────────────────────────────────
  const planCookieRaw = request.cookies.get('sb-plan-status')?.value

  // Si la cookie no existe aún, el DashboardLayout la inicializará en el cliente.
  // Dejamos pasar (first-load flow).
  if (!planCookieRaw) {
    return NextResponse.next()
  }

  const planDecoded = decodeURIComponent(planCookieRaw)
  const [plan, expiresAtStr] = planDecoded.split('|')

  // ── Plan inactivo → /pendiente ────────────────────────────────────────────
  if (plan === 'inactivo') {
    if (pathname !== '/pendiente') {
      return NextResponse.redirect(new URL('/pendiente', request.url))
    }
    return NextResponse.next()
  }

  // ── Plan expirado (trial o pro vencido) → /pendiente ─────────────────────
  if (expiresAtStr && plan !== 'free') {
    const expired = new Date(expiresAtStr) < new Date()
    if (expired && pathname !== '/pendiente') {
      return NextResponse.redirect(new URL('/pendiente', request.url))
    }
  }

  // ── Plan free o trial/pro vigente → permitir acceso ──────────────────────
  // (Las restricciones de UI para 'free' se aplican en los componentes React)
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/pendiente', '/auth/callback', '/admin'],
}
