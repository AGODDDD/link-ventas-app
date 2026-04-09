import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/tienda') ||
    pathname === '/'

  if (isPublicRoute) return NextResponse.next()

  const token = request.cookies.get('sb-access-token')?.value
    ?? request.cookies.get(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split('.')[0].split('//')[1]}-auth-token`
    )?.value

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID
  if (user.id === ADMIN_ID) return NextResponse.next()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile || profile.plan === 'inactivo') {
    if (pathname !== '/pendiente') {
      return NextResponse.redirect(new URL('/pendiente', request.url))
    }
    return NextResponse.next()
  }

  if (profile.plan_expires_at) {
    const expired = new Date(profile.plan_expires_at) < new Date()
    if (expired && pathname !== '/pendiente') {
      return NextResponse.redirect(new URL('/pendiente', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/pendiente', '/auth/callback'],
}