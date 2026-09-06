import type { SupabaseClient } from '@supabase/supabase-js'

/** Delete physical objects through Storage API. Always re-list page zero after deletion. */
export async function deleteStoragePrefix(supabase: SupabaseClient, bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 10) throw new Error('Storage folder nesting exceeds deletion limit')
  const storage = supabase.storage.from(bucket)
  while (true) {
    const { data, error } = await storage.list(prefix, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } })
    if (error || !data) throw new Error('Could not list account files')
    if (data.length === 0) return
    const paths: string[] = []
    for (const entry of data) {
      if (!entry.name || /[/\\]/.test(entry.name) || entry.name === '.' || entry.name === '..') throw new Error('Invalid storage path')
      const path = `${prefix}/${entry.name}`
      if (!entry.id) await deleteStoragePrefix(supabase, bucket, path, depth + 1)
      else paths.push(path)
    }
    if (paths.length) {
      const { error: removeError } = await storage.remove(paths)
      if (removeError) throw new Error('Could not remove account files')
      // Do not loop forever if a provider reports success without deleting.
      const { data: remaining, error: verifyError } = await storage.list(prefix, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } })
      if (verifyError || !remaining || remaining.some(entry => entry.id && paths.includes(`${prefix}/${entry.name}`))) throw new Error('Storage deletion not confirmed')
    }
  }
}
