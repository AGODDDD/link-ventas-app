import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin'

export async function GET(req: Request) {
  try {
    const admin = await getAdminContext(req, 'check', 60)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json({ isAdmin: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
