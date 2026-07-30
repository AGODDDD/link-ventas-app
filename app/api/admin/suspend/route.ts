import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user || user.id !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { storeId, ownerId, action } = await req.json()

    if (!storeId || !ownerId || (action !== 'suspend' && action !== 'unsuspend')) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    if (action === 'suspend') {
      // 1. Marcar tienda como inactiva (oculta al público via RLS)
      const { error: storeErr } = await supabase
        .from('stores')
        .update({ is_active: false })
        .eq('id', storeId)

      // 2. Desactivar plan del propietario
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ plan: 'inactivo', plan_expires_at: null })
        .eq('id', ownerId)

      if (storeErr || profileErr) {
        console.error('Suspend error:', storeErr, profileErr)
        return NextResponse.json({ error: 'Error al suspender' }, { status: 500 })
      }

      return NextResponse.json({
        is_active: false,
        plan: 'inactivo',
        plan_expires_at: null,
      })
    }

    // ─── Unsuspend: solo reactivar la visibilidad de la tienda ────────
    // El plan debe ser reactivado de forma separada con /api/admin/plans
    const { error: storeErr } = await supabase
      .from('stores')
      .update({ is_active: true })
      .eq('id', storeId)

    if (storeErr) {
      console.error('Unsuspend error:', storeErr)
      return NextResponse.json({ error: 'Error al reactivar' }, { status: 500 })
    }

    return NextResponse.json({ is_active: true })
  } catch (error) {
    console.error('Admin suspend error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
