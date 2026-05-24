import { NextResponse } from 'next/server'
import {
  getAuthenticatedUser,
  getSupabaseServiceClient,
  getSupabaseUserServerClient,
  hasSupabaseServiceRoleKey,
  isPlanActive,
} from '@/lib/supabaseServer'

type Plan = 'trial' | 'free' | 'pro' | 'inactivo' | null

export async function GET(req: Request) {
  try {
    const { user, token } = await getAuthenticatedUser(req)
    if (!user || !token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = hasSupabaseServiceRoleKey()
      ? getSupabaseServiceClient()
      : getSupabaseUserServerClient(token)

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo leer el plan' }, { status: 500 })
    }

    let plan = (profile?.plan ?? null) as Plan
    let planExpiresAt = profile?.plan_expires_at ?? null

    if (plan === null && hasSupabaseServiceRoleKey()) {
      const trialExpiry = new Date()
      trialExpiry.setDate(trialExpiry.getDate() + 14)
      planExpiresAt = trialExpiry.toISOString()

      const { data: updated } = await supabase
        .from('profiles')
        .update({ plan: 'trial', plan_expires_at: planExpiresAt })
        .eq('id', user.id)
        .is('plan', null)
        .select('plan, plan_expires_at')
        .single()

      if (updated) {
        plan = updated.plan
        planExpiresAt = updated.plan_expires_at
      }
    }

    return NextResponse.json({
      plan,
      plan_expires_at: planExpiresAt,
      active: isPlanActive(plan, planExpiresAt),
    })
  } catch (error) {
    console.error('Billing status error:', error)
    return NextResponse.json({ error: 'Error interno de billing' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { user, token } = await getAuthenticatedUser(req)
    if (!user || !token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    if (body?.plan !== 'free') {
      return NextResponse.json({ error: 'Cambio de plan no permitido' }, { status: 400 })
    }

    const supabase = hasSupabaseServiceRoleKey()
      ? getSupabaseServiceClient()
      : getSupabaseUserServerClient(token)

    const { error } = hasSupabaseServiceRoleKey()
      ? await supabase
          .from('profiles')
          .update({ plan: 'free', plan_expires_at: null, culqi_active: false })
          .eq('id', user.id)
      : await supabase.rpc('set_own_plan_free')

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: 'No se pudo actualizar el plan: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: 'free', plan_expires_at: null, active: true })
  } catch (error: any) {
    console.error('Billing downgrade error:', error.message || error)
    return NextResponse.json({ error: 'Error interno de billing: ' + (error.message || String(error)) }, { status: 500 })
  }
}
