import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rutas públicas que no necesitan verificación
  const isPublicRoute = pathname.startsWith('/auth') || pathname.startsWith('/tienda')
  if (isPublicRoute) return response

  // Si no hay sesión, redirigir al login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Verificar plan del merchant
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, id')
    .eq('id', user.id)
    .single()

  // Si es admin (tu usuario), dejar pasar siempre
  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID
  if (user.id === ADMIN_ID) return response

  // Si no tiene perfil o plan inactivo, redirigir a pendiente
  if (!profile || profile.plan === 'inactivo') {
    if (pathname !== '/pendiente') {
      return NextResponse.redirect(new URL('/pendiente', request.url))
    }
    return response
  }

  // Si el plan venció
  if (profile.plan_expires_at) {
    const expired = new Date(profile.plan_expires_at) < new Date()
    if (expired && pathname !== '/pendiente') {
      return NextResponse.redirect(new URL('/pendiente', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/pendiente', '/auth/callback'],
}