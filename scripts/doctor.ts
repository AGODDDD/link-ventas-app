import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import path from 'path'

// Cargar .env.local manualmente para el script de Node
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: No se encontraron las variables de entorno en .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function doctor() {
    console.log('🩺 Iniciando LinkVentas Doctor...')
    console.log('🔗 Conectando a:', supabaseUrl)

    const diagnostics: { label: string; status: 'OK' | 'ERROR' | 'WARN'; message?: string; fix?: string }[] = []

    // 1. Revisar Tabla Profiles
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1)
        if (error) throw error
        
        const cols = data && data[0] ? Object.keys(data[0]) : []
        const requiredCols = ['slug', 'fomo_enabled', 'fomo_min_viewers', 'fomo_max_viewers', 'fomo_message']
        const missing = requiredCols.filter(c => !cols.includes(c))

        if (missing.length > 0) {
            diagnostics.push({
                label: 'Tabla: profiles',
                status: 'WARN',
                message: `Faltan columnas: ${missing.join(', ')}`,
                fix: `ALTER TABLE public.profiles ${missing.map(m => `ADD COLUMN IF NOT EXISTS ${m} ${m === 'fomo_enabled' ? 'boolean' : m.includes('viewers') ? 'integer' : 'text'}`).join(', ')};`
            })
        } else {
            diagnostics.push({ label: 'Tabla: profiles', status: 'OK' })
        }
    } catch (e: any) {
        diagnostics.push({ label: 'Tabla: profiles', status: 'ERROR', message: e.message })
    }

    // 2. Revisar Tabla Products (Stock)
    try {
        const { data, error } = await supabase.from('products').select('*').limit(1)
        if (error) throw error
        const cols = data && data[0] ? Object.keys(data[0]) : []
        if (!cols.includes('stock')) {
            diagnostics.push({
                label: 'Tabla: products',
                status: 'WARN',
                message: 'Falta columna: stock',
                fix: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer DEFAULT NULL;'
            })
        } else {
            diagnostics.push({ label: 'Tabla: products', status: 'OK' })
        }
    } catch (e: any) {
        diagnostics.push({ label: 'Tabla: products', status: 'ERROR', message: e.message })
    }

    // 3. Revisar Políticas (Prueba de RLS Básica)
    // Intentaremos insertar en Leads sin auth (debería funcionar según políticas)
    try {
        // Solo un select rápido para ver si responde
        const { error: leadsError } = await supabase.from('store_leads').select('count').limit(1)
        if (leadsError) {
             diagnostics.push({ label: 'Políticas: store_leads', status: 'WARN', message: 'No se pudo leer leads (puede ser normal por RLS)' })
        } else {
             diagnostics.push({ label: 'Políticas: store_leads', status: 'OK' })
        }
    } catch (e: any) {}

    // Mostrar Resultados
    console.log('\n--- 📊 REPORTE DE SALUD ---')
    diagnostics.forEach(d => {
        const icon = d.status === 'OK' ? '✅' : d.status === 'WARN' ? '⚠️' : '❌'
        console.log(`${icon} [${d.status}] ${d.label}`)
        if (d.message) console.log(`   └─ Mensaje: ${d.message}`)
        if (d.fix) {
            console.log(`   └─ SOLUCIÓN (SQL):`)
            console.log(`      ${d.fix}`)
        }
    })
    console.log('\n---------------------------\n')
    
    const hasErrors = diagnostics.some(d => d.status === 'ERROR' || d.status === 'WARN')
    if (hasErrors) {
        console.log('💡 Consejo: Copia y pega las soluciones (SQL) en el editor de Supabase.')
    } else {
        console.log('✨ ¡Tu proyecto está en perfecta forma! Puedes seguir vendiendo.')
    }
}

doctor()
