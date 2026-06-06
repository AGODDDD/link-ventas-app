import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user || user.id !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { merchantId, action, months } = await req.json()
    if (!merchantId || (action !== 'activate' && action !== 'deactivate')) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    if (action === 'deactivate') {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'inactivo', plan_expires_at: null, culqi_active: false })
        .eq('id', merchantId)

      if (error) return NextResponse.json({ error: 'No se pudo desactivar' }, { status: 500 })
      return NextResponse.json({ plan: 'inactivo', plan_expires_at: null })
    }

    const duration = Number.isFinite(Number(months)) ? Math.max(1, Number(months)) : 1
    const expires = new Date()
    expires.setMonth(expires.getMonth() + duration)

    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'pro', plan_expires_at: expires.toISOString() })
      .eq('id', merchantId)

    if (error) return NextResponse.json({ error: 'No se pudo activar' }, { status: 500 })
    return NextResponse.json({ plan: 'pro', plan_expires_at: expires.toISOString() })
  } catch (error) {
    console.error('Admin plan error:', error)
    return NextResponse.json({ error: 'Error interno de admin' }, { status: 500 })
  }
}
