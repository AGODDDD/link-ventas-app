import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // Solo proteger rutas del dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Leer las cookies de autenticación de Supabase
    const accessToken = request.cookies.get('sb-access-token')?.value
      || request.cookies.get(`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`)?.value

    // Si no hay cookie de sesión, buscar en el header de storage
    const allCookies = request.cookies.getAll()
    const authCookie = allCookies.find(c => c.name.includes('auth-token'))

    if (!authCookie) {
      // Redirigir al login si no hay sesión
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Verificar que el token sea válido
    try {
      const tokenData = JSON.parse(authCookie.value)
      const token = Array.isArray(tokenData) ? tokenData[0] : tokenData?.access_token

      if (!token) {
        const loginUrl = new URL('/', request.url)
        return NextResponse.redirect(loginUrl)
      }

      // Verificar con Supabase que el token sea real
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      })

      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        const loginUrl = new URL('/', request.url)
        return NextResponse.redirect(loginUrl)
      }
    } catch {
      // Token corrupto o expirado → login
      const loginUrl = new URL('/', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
