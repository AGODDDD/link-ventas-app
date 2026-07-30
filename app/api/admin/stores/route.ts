import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

export async function GET(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user || user.id !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = getSupabaseServiceClient()

    const [storesRes, profilesRes] = await Promise.all([
      supabase
        .from('stores')
        .select('id, owner_id, name, slug, whatsapp_phone, is_active, template_type, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, email, plan, plan_expires_at, created_at'),
    ])

    if (storesRes.error || profilesRes.error) {
      console.error('Admin stores fetch error:', storesRes.error, profilesRes.error)
      return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
    }

    const profilesMap = new Map(
      (profilesRes.data || []).map((p) => [p.id, p])
    )

    const merchants = (storesRes.data || []).map((store) => {
      const profile = profilesMap.get(store.owner_id)
      return {
        store_id: store.id,
        owner_id: store.owner_id,
        store_name: store.name,
        slug: store.slug,
        whatsapp_phone: store.whatsapp_phone,
        is_active: store.is_active,
        template_type: store.template_type,
        store_created_at: store.created_at,
        email: profile?.email || null,
        plan: profile?.plan || null,
        plan_expires_at: profile?.plan_expires_at || null,
      }
    })

    // ─── KPIs ────────────────────────────────────────────────────────────
    const now = new Date()

    const proActive = merchants.filter(
      (m) =>
        m.plan === 'pro' &&
        m.plan_expires_at &&
        new Date(m.plan_expires_at) >= now
    ).length

    const trialStores = merchants.filter(
      (m) =>
        m.plan === 'trial' &&
        m.plan_expires_at &&
        new Date(m.plan_expires_at) >= now
    ).length

    const freeStores = merchants.filter(
      (m) => m.plan === 'free' || m.plan === null
    ).length

    const suspendedStores = merchants.filter((m) => !m.is_active).length

    // S/ 25/mes por suscripción Pro activa
    const PLAN_PRO_PRICE = 25
    const estimatedRevenue = proActive * PLAN_PRO_PRICE

    return NextResponse.json({
      merchants,
      kpis: {
        totalStores: merchants.length,
        proActive,
        freeStores,
        trialStores,
        suspendedStores,
        estimatedRevenue,
      },
    })
  } catch (error) {
    console.error('Admin stores error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
