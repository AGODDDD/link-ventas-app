import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptText } from '@/lib/encryption'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // ===================================================================
        // PASO 1: Evento válido de Culqi?
        // ===================================================================
        if (body.object !== 'event' || body.type !== 'charge.creation.succeeded') {
            return NextResponse.json({ success: true, message: 'Event type ignored' })
        }

        const charge = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;

        const order_id = charge.metadata?.order_id
        const store_id = charge.metadata?.store_id
        const charge_id = charge.id

        if (!order_id || !store_id || !charge_id) {
            console.warn('Webhook Culqi ignorado: Falta metadata (order_id/store_id/charge_id).', charge_id)
            return NextResponse.json({ success: true, message: 'Ignored: missing metadata' })
        }

        // ===================================================================
        // PASO 2: Idempotencia — ¿Ya está pagado?
        // ===================================================================
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: existingOrder, error: orderFetchError } = await supabase
            .from('orders')
            .select('id, status, total_amount, store_id')
            .eq('id', order_id)
            .eq('store_id', store_id)
            .single()

        if (orderFetchError || !existingOrder) {
            console.warn('Webhook: Orden no encontrada en DB.', order_id)
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
        }

        if (existingOrder.status === 'paid') {
            console.log(`Webhook: Orden ${order_id} ya está marcada como paid. Idempotencia OK.`)
            return NextResponse.json({ success: true, message: 'Already paid (idempotent)' })
        }

        // ===================================================================
        // PASO 3: ZERO-TRUST — Verificación con la API oficial de Culqi
        // No confiamos en el payload del webhook. Lo verificamos independientemente.
        // ===================================================================
        const { data: profile } = await supabase
            .from('profiles')
            .select('culqi_secret_key, culqi_active')
            .eq('id', store_id)
            .single()

        if (!profile || !profile.culqi_active || !profile.culqi_secret_key) {
            console.warn('Webhook: Tienda no tiene Culqi activo.', store_id)
            return NextResponse.json({ success: false, message: 'Store Culqi not active' }, { status: 403 })
        }

        // Desencriptar la Secret Key del comerciante
        let realSecretKey: string;
        try {
            realSecretKey = decryptText(profile.culqi_secret_key);
        } catch (e) {
            console.error('Webhook: Fallo al desencriptar SK para tienda', store_id);
            return NextResponse.json({ error: 'Decryption failure' }, { status: 500 })
        }

        // Consultar a Culqi directamente: "¿Este cargo realmente existe y fue exitoso?"
        const culqiVerifyRes = await fetch(`https://api.culqi.com/v2/charges/${charge_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${realSecretKey}`
            }
        })

        if (!culqiVerifyRes.ok) {
            console.error('Webhook RECHAZADO: Culqi no reconoce este charge_id. Posible ataque.', charge_id)
            return NextResponse.json({ error: 'Charge verification failed at source' }, { status: 403 })
        }

        const culqiCharge = await culqiVerifyRes.json()

        // ===================================================================
        // PASO 4: Validación de Monto (Anti-Tampering)
        // ===================================================================
        const expectedAmountCents = Math.round(parseFloat(existingOrder.total_amount) * 100)
        const actualAmountCents = culqiCharge.amount

        if (actualAmountCents < expectedAmountCents) {
            console.error(`Webhook RECHAZADO: Monto no coincide. DB espera ${expectedAmountCents} cents, Culqi dice ${actualAmountCents} cents. Orden: ${order_id}`)
            return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
        }

        // ===================================================================
        // PASO 5: Todo verificado. Marcar como PAID.
        // ===================================================================
        const { error: updateError } = await supabase
            .from('orders')
            .update({ 
                status: 'paid',
                payment_proof_url: 'CULQI_AUTOMATIC'
            })
            .eq('id', order_id)
            .eq('store_id', store_id)

        if (updateError) {
            console.error('Webhook: Error actualizando orden en Supabase:', updateError)
            return NextResponse.json({ error: 'DB update error' }, { status: 500 })
        }

        console.log(`✅ Webhook verificado y ejecutado: Orden ${order_id} → PAID (Charge: ${charge_id}, Monto: ${actualAmountCents} cents)`)
        return NextResponse.json({ success: true, message: 'Order verified and marked as paid' })

    } catch (error: any) {
        console.error('Error fatal en Webhook Culqi:', error)
        return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
    }
}
