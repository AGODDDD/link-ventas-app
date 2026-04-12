import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function migrate() {
  console.log('🚀 Iniciando Migración: profiles -> stores + store_config...')

  // 1. Obtener perfiles actuales
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*')
  if (pError || !profiles) {
    console.error('❌ Error leyendo perfiles:', pError)
    return
  }

  console.log(`📊 Encontrados ${profiles.length} perfiles para migrar.`)

  for (const p of profiles) {
    console.log(`➡️ Procesando: ${p.store_name || 'Sin nombre'} (${p.id})`)

    // A. Migrar a STORES (Identidad)
    const { error: sError } = await supabase.from('stores').upsert({
      id: p.id,
      owner_id: p.id, // Asumimos owner_id = profile_id inicialmente
      slug: p.slug || `store-${p.id.slice(0,5)}`,
      name: p.store_name || 'Nueva Tienda',
      description: p.description,
      avatar_url: p.avatar_url,
      banner_url: p.banner_url,
      template_type: p.template_type || 'comercio',
      whatsapp_phone: p.whatsapp_phone,
      created_at: p.created_at,
      updated_at: p.updated_at || new Date().toISOString()
    })

    if (sError) {
      console.error(`  ❌ Error en stores (${p.id}):`, sError.message)
      continue
    }

    // B. Migrar a STORE_CONFIG (Configuración)
    const { error: cError } = await supabase.from('store_config').upsert({
      store_id: p.id,
      primary_color: p.primary_color,
      secondary_color: p.secondary_color,
      store_lat: p.store_lat,
      store_lng: p.store_lng,
      store_address: p.direccion || p.store_address,
      store_schedule: p.store_schedule || {},
      updated_at: p.updated_at || new Date().toISOString()
    })

    if (cError) {
      console.error(`  ❌ Error en store_config (${p.id}):`, cError.message)
    } else {
      console.log(`  ✅ ${p.store_name} migrado correctamente.`)
    }
  }

  console.log('🏁 Migración completada.')
}

migrate()
