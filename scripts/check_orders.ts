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
    console.log("Testing insert with merchant_id...")
    const { error: insertErr } = await supabase.from('orders').insert({
        id: '00000000-0000-0000-0000-000000000000',
        merchant_id: '00000000-0000-0000-0000-000000000000',
        store_id: '00000000-0000-0000-0000-000000000000',
        order_type: 'standard',
        customer_name: 'Test'
    })
    console.log("Insert result error:", insertErr)
}

check()
