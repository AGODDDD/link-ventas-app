import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log("Checking template types in stores...")
    const { data: stores, error: e1 } = await supabase.from('stores').select('template_type')
    if (e1) console.error(e1)
    else {
        const counts: Record<string, number> = {}
        for (const s of stores) {
            counts[s.template_type] = (counts[s.template_type] || 0) + 1
        }
        console.log("Stores template_types:", counts)
    }

    console.log("Checking template types in profiles...")
    const { data: profiles, error: e2 } = await supabase.from('profiles').select('template_type')
    if (e2) console.error(e2)
    else {
        const counts: Record<string, number> = {}
        for (const p of profiles) {
            counts[p.template_type] = (counts[p.template_type] || 0) + 1
        }
        console.log("Profiles template_types:", counts)
    }
}

check()
