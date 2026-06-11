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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function runTests() {
    console.log("=== INICIANDO QA TESTS INTERNAL ===\n")

    // 1. Obtener una tienda real para pruebas
    const { data: store, error: errStore } = await supabase.from('stores').select('id, slug').limit(1).single()
    if (errStore || !store) {
        console.error("❌ No se encontró ninguna tienda para hacer pruebas.", errStore)
        return
    }
    console.log(`✅ Tienda encontrada: ${store.slug} (${store.id})`)

    const testOrderId1 = crypto.randomUUID()
    const testOrderId2 = crypto.randomUUID()
    const testLegacyId = crypto.randomUUID()

    try {
        // TEST 1: Insertar en orders (Core) con 'pendiente_verificacion'
        console.log("\n-> TEST 1: Insertar Core Order (Transferencia) con status: 'pendiente_verificacion'")
        const { error: e1 } = await supabase.from('orders').insert({
            id: testOrderId1,
            store_id: store.id,
            status: 'pendiente_verificacion',
            order_type: 'standard',
            customer_name: 'QA Tester',
            total: 100,
            metodo_pago: 'transferencia'
        })
        if (e1) throw new Error(`Fallo Test 1: ${e1.message}`)
        console.log("   ✅ Éxito: La tabla orders acepta 'pendiente_verificacion'.")

        // TEST 2: Insertar en orders (Core) con 'pendiente_pago'
        console.log("\n-> TEST 2: Insertar Core Order (Culqi) con status: 'pendiente_pago'")
        const { error: e2 } = await supabase.from('orders').insert({
            id: testOrderId2,
            store_id: store.id,
            status: 'pendiente_pago',
            order_type: 'standard',
            customer_name: 'QA Tester 2',
            total: 150,
            metodo_pago: 'culqi'
        })
        if (e2) throw new Error(`Fallo Test 2: ${e2.message}`)
        console.log("   ✅ Éxito: La tabla orders acepta 'pendiente_pago'.")

        // TEST 3: Insertar en delivery_orders (Legacy) validando FK a stores
        console.log("\n-> TEST 3: Insertar Delivery Order (Legacy) validando Foreign Key a 'stores'")
        const { error: e3 } = await supabase.from('delivery_orders').insert({
            id: testLegacyId,
            store_id: store.id, // Debe existir en stores
            status: 'pendiente_pago',
            customer_name: 'QA Tester 3',
            total: 200,
            metodo_pago: 'culqi'
        })
        if (e3) throw new Error(`Fallo Test 3: ${e3.message}`)
        console.log("   ✅ Éxito: La tabla delivery_orders enlaza correctamente con stores(id).")

        // TEST 4: Modificar a 'paid' para simular Culqi
        console.log("\n-> TEST 4: Simular Webhook Culqi (Actualizar a 'paid')")
        const { error: e4 } = await supabase.from('orders').update({ status: 'paid' }).eq('id', testOrderId2)
        if (e4) throw new Error(`Fallo Test 4: ${e4.message}`)
        console.log("   ✅ Éxito: Update a 'paid' funciona correctamente.")

    } catch (err: any) {
        console.error("\n❌ ERROR EN QA TESTS:", err.message)
    } finally {
        // Limpiar datos de prueba
        console.log("\n-> LIMPIEZA: Eliminando registros de prueba...")
        await supabase.from('orders').delete().in('id', [testOrderId1, testOrderId2])
        await supabase.from('delivery_orders').delete().eq('id', testLegacyId)
        console.log("   ✅ Limpieza completada.")
    }

    console.log("\n=== QA TESTS FINALIZADOS ===")
}

runTests()
