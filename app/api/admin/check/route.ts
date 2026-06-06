import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabaseServer'

export async function GET(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user || user.id !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json({ isAdmin: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
