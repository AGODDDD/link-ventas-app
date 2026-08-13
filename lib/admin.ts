import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'
import { getRateLimitKey } from '@/lib/rateLimit'

export type AdminContext = {
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>['user']>
  supabase: ReturnType<typeof getSupabaseServiceClient>
}

export async function getAdminContext(request: Request, scope: string, limit = 30): Promise<AdminContext | null> {
  const { user } = await getAuthenticatedUser(request)
  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId || !user || user.id !== adminUserId) return null

  const supabase = getSupabaseServiceClient()
  const { data: allowed, error } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
    p_client_key: getRateLimitKey(request, `admin:${scope}`, [user.id]),
    p_limit: limit,
    p_window_seconds: 900,
  })
  if (error) throw error
  if (!allowed) return null

  return { user, supabase }
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
