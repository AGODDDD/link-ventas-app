import { NextResponse } from 'next/server'
import { getAdminContext, uuidPattern } from '@/lib/admin'

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase()
  return email || null
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminContext(req, 'store-contact-sync', 10)
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { ownerId, action } = await req.json()

    if (action === 'sync-missing') {
      const [storesRes, profilesRes] = await Promise.all([
        admin.supabase.from('stores').select('owner_id'),
        admin.supabase.from('profiles').select('id, email'),
      ])
      if (storesRes.error || profilesRes.error) {
        return NextResponse.json({ error: 'No se pudieron leer las cuentas a sincronizar.' }, { status: 500 })
      }

      const storeOwners = new Set((storesRes.data || []).map((store) => store.owner_id))
      const allCandidates = (profilesRes.data || [])
        .filter((profile) => storeOwners.has(profile.id) && !normalizeEmail(profile.email))
      const candidates = allCandidates.slice(0, 100)

      let synchronized = 0
      let unavailable = 0
      for (const profile of candidates) {
        const { data, error } = await admin.supabase.auth.admin.getUserById(profile.id)
        const email = error ? null : normalizeEmail(data.user?.email)
        if (!email) {
          unavailable += 1
          continue
        }
        const { error: updateError } = await admin.supabase
          .from('profiles')
          .update({ email, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
        if (updateError) {
          unavailable += 1
          continue
        }
        synchronized += 1
      }

      return NextResponse.json({ synchronized, unavailable, remaining: Math.max(0, allCandidates.length - candidates.length) })
    }
    if (typeof ownerId !== 'string' || !uuidPattern.test(ownerId)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    // Never accept an e-mail from the browser. Auth is the canonical source.
    const { data: authData, error: authError } = await admin.supabase.auth.admin.getUserById(ownerId)
    const email = authError ? null : normalizeEmail(authData.user?.email)
    if (!email) return NextResponse.json({ error: 'La cuenta no tiene un correo disponible en Auth.' }, { status: 409 })

    const { data: profile, error: profileError } = await admin.supabase
      .from('profiles')
      .select('id, email')
      .eq('id', ownerId)
      .maybeSingle()

    if (profileError) return NextResponse.json({ error: 'No se pudo leer el perfil.' }, { status: 500 })
    if (!profile) return NextResponse.json({ error: 'La tienda no tiene un perfil asociado.' }, { status: 409 })

    const currentEmail = normalizeEmail(profile.email)
    if (currentEmail) return NextResponse.json({ email: currentEmail, synchronized: false })

    const { error: updateError } = await admin.supabase
      .from('profiles')
      .update({ email, updated_at: new Date().toISOString() })
      .eq('id', ownerId)

    if (updateError) return NextResponse.json({ error: 'No se pudo sincronizar el correo.' }, { status: 500 })
    return NextResponse.json({ email, synchronized: true })
  } catch (error) {
    console.error('Admin store contact sync error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
