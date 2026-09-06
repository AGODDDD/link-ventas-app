import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cron'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import { cleanAbandonedProofs } from '@/lib/proofCleanup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await getSupabaseServiceClient().rpc('run_background_maintenance')

    if (error) {
      console.error('Cron maintenance failed:', error)
      return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 })
    }

    const removedProofs = await cleanAbandonedProofs(getSupabaseServiceClient())
    return NextResponse.json({ ok: true, result: data?.[0] ?? null, removed_proofs: removedProofs })
  } catch (error) {
    console.error('Cron maintenance error:', error)
    return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 })
  }
}
