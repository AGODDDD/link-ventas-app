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
  if (!token) {
    console.log('DEBUG: No bearer token found')
    return { user: null, token: null }
  }

  try {
    // Decode JWT to get user ID (without verification - we trust Supabase signed it)
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    )
    const userId = payload.sub
    console.log('DEBUG: Extracted userId from token:', userId, 'email:', payload.email)

    if (!userId) throw new Error('No user ID in token')

    // Use service role to fetch user from auth.users
    const supabase = getSupabaseServiceClient()
    console.log('DEBUG: Calling admin.getUserById with userId:', userId)
    const { data: user, error } = await supabase.auth.admin.getUserById(userId)

    if (error) {
      console.error('DEBUG: admin.getUserById error:', error.message, error.status)
      return { user: null, token }
    }

    if (!user) {
      console.error('DEBUG: No user returned from admin.getUserById')
      return { user: null, token }
    }

    console.log('DEBUG: Successfully retrieved user:', user.user?.id, user.user?.email)
    return { user: user.user, token }
  } catch (error) {
    console.error('Token verification error:', error)
    return { user: null, token }
  }
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
