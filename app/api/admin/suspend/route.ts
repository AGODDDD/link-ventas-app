import { NextResponse } from 'next/server'
import { getAdminContext, uuidPattern } from '@/lib/admin'

export async function POST(req: Request) {
  try {
    const admin = await getAdminContext(req, 'suspend', 20)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { storeId, action } = await req.json()

    if (typeof storeId !== 'string' || !uuidPattern.test(storeId) || (action !== 'suspend' && action !== 'unsuspend')) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const { data, error } = await admin.supabase.rpc('set_admin_store_suspension', {
      p_store_id: storeId,
      p_suspend: action === 'suspend',
    })
    if (error?.code === 'P0002') return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    if (error || !data?.[0]) {
      console.error('Admin suspend error:', error)
      return NextResponse.json({ error: 'No se pudo actualizar la tienda.' }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Admin suspend error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
