import { createClient } from '@supabase/supabase-js'

type Plan = 'trial' | 'free' | 'pro' | 'inactivo' | null

export function getSupabaseAnonServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

export function getSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length).trim()
}

export async function getAuthenticatedUser(req: Request) {
  const token = getBearerToken(req)
  if (!token) return { user: null, token: null }

  const supabase = getSupabaseAnonServerClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { user: null, token }

  return { user: data.user, token }
}

export function isPlanActive(plan: Plan, expiresAt?: string | null) {
  if (plan === 'inactivo' || plan === null) return false
  if (plan === 'free') return true
  if (!expiresAt) return plan === 'pro'
  return new Date(expiresAt).getTime() >= Date.now()
}

export function hasProFeatures(plan: Plan, expiresAt?: string | null) {
  if (plan !== 'pro' && plan !== 'trial') return false
  return isPlanActive(plan, expiresAt)
}
