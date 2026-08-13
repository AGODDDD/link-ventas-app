import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

function displayName(user: { user_metadata?: Record<string, unknown>; email?: string | null }) {
  const value = user.user_metadata?.full_name
  if (typeof value === 'string' && value.trim()) return value.trim()
  return user.email?.split('@')[0] || 'Administrador'
}

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })

  const supabase = getSupabaseServiceClient()
  const [{ data: profile, error: profileError }, { data: deletionRequest, error: requestError }] = await Promise.all([
    supabase.from('profiles').select('plan, plan_expires_at').eq('id', user.id).maybeSingle(),
    supabase.from('account_deletion_requests').select('id, status, requested_at, due_at, resolution_note').eq('user_id', user.id).in('status', ['pending', 'in_review']).order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (profileError || requestError) {
    console.error('Account summary error:', profileError || requestError)
    return NextResponse.json({ error: 'No se pudo cargar tu cuenta.' }, { status: 500 })
  }

  const identities = user.identities || []
  const provider = identities.some((identity) => identity.provider === 'facebook') ? 'Facebook' : 'Correo y contraseña'
  return NextResponse.json({
    account: {
      id: user.id,
      fullName: displayName(user),
      avatarUrl: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
      email: user.email || '',
      provider,
      createdAt: user.created_at,
      plan: profile?.plan || 'free',
      planExpiresAt: profile?.plan_expires_at || null,
      deletionRequest,
    },
  })
}

export async function PATCH(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : ''
  if (fullName.length < 2 || fullName.length > 80) {
    return NextResponse.json({ error: 'El nombre debe tener entre 2 y 80 caracteres.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceClient()
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, full_name: fullName },
  })
  if (error) {
    console.error('Account name update error:', error)
    return NextResponse.json({ error: 'No se pudo actualizar tu nombre.' }, { status: 500 })
  }
  return NextResponse.json({ fullName })
}
