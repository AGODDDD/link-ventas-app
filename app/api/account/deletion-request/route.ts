import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (body?.confirmation !== 'ELIMINAR') {
    return NextResponse.json({ error: 'Confirma la solicitud escribiendo ELIMINAR.' }, { status: 400 })
  }
  const supabase = getSupabaseServiceClient()
  const { data: existing, error: existingError } = await supabase
    .from('account_deletion_requests').select('id, status, requested_at, due_at, resolution_note')
    .eq('user_id', user.id).in('status', ['pending', 'in_review']).maybeSingle()
  if (existingError) return NextResponse.json({ error: 'No se pudo revisar la solicitud.' }, { status: 500 })
  if (existing) return NextResponse.json({ deletionRequest: existing })

  const { data, error } = await supabase.from('account_deletion_requests').insert({ user_id: user.id }).select('id, status, requested_at, due_at, resolution_note').single()
  if (error) {
    console.error('Deletion request error:', error)
    return NextResponse.json({ error: 'No se pudo registrar la solicitud.' }, { status: 500 })
  }
  return NextResponse.json({ deletionRequest: data }, { status: 201 })
}
