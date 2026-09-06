import type { SupabaseClient } from '@supabase/supabase-js'

/** Delete only abandoned uploads; attached payment evidence is retained. */
export async function cleanAbandonedProofs(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  const { data, error } = await supabase.from('payment_proof_uploads')
    .select('path').is('claimed_at', null).lt('created_at', cutoff).limit(100)
  if (error) throw new Error('Could not list expired payment proofs')
  if (!data?.length) return 0
  const paths = data.map(item => item.path as string)
  if (paths.some(path => !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(path))) throw new Error('Invalid payment proof path')
  const { error: removeError } = await supabase.storage.from('comprobantes').remove(paths)
  if (removeError) throw new Error('Could not remove expired payment proofs')
  const { error: deleteError } = await supabase.from('payment_proof_uploads').delete().in('path', paths).is('claimed_at', null)
  if (deleteError) throw new Error('Could not complete expired payment proof cleanup')
  return paths.length
}
