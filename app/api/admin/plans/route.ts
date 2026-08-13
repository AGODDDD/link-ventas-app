import { NextResponse } from 'next/server'
import { getAdminContext, uuidPattern } from '@/lib/admin'

const MAX_PLAN_MONTHS = 24

export async function POST(req: Request) {
  try {
    const admin = await getAdminContext(req, 'plans', 20)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { merchantId, action, months } = await req.json()
    if (typeof merchantId !== 'string' || !uuidPattern.test(merchantId) || (action !== 'activate' && action !== 'deactivate')) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const { supabase } = admin

    if (action === 'deactivate') {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'inactivo', plan_expires_at: null })
        .eq('id', merchantId)

      if (error) return NextResponse.json({ error: 'No se pudo desactivar' }, { status: 500 })
      return NextResponse.json({ plan: 'inactivo', plan_expires_at: null })
    }

    const duration = Number(months)
    if (!Number.isInteger(duration) || duration < 1 || duration > MAX_PLAN_MONTHS) {
      return NextResponse.json({ error: `La duración debe ser un número entero entre 1 y ${MAX_PLAN_MONTHS} meses.` }, { status: 400 })
    }
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
