import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptText } from '@/lib/encryption'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { token_id, amount, email, store_id, order_id } = body

        if (!token_id || !amount || !email || !store_id || !order_id) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 })
        }

        // 1. Obtener la Secret Key CIFRADA de la tienda en Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('culqi_secret_key, culqi_active')
            .eq('id', store_id)
            .single()

        if (profileError || !profile || !profile.culqi_active || !profile.culqi_secret_key) {
            return NextResponse.json({ error: 'Tienda no configurada para Culqi.' }, { status: 403 })
        }

        // 2. DESENCRIPTAR la llave en memoria del servidor (nunca toca el navegador)
        let realSecretKey: string;
        try {
            realSecretKey = decryptText(profile.culqi_secret_key);
        } catch (decryptError) {
            console.error('Fallo al desencriptar Secret Key:', decryptError);
            return NextResponse.json({ error: 'Error de configuración de cifrado en la tienda.' }, { status: 500 })
        }

        // 3. Realizar el Cargo real a Culqi (Charges API)
        // Amount debe estar en céntimos (ej: 50 PEN = 5000)
        const amountInCents = Math.round(parseFloat(amount) * 100)

        const culqiPayload = {
            amount: amountInCents,
            currency_code: 'PEN',
            email: email,
            source_id: token_id,
            description: `Orden #${order_id.split('-')[0].toUpperCase()} en LinkVentas`,
            metadata: {
                order_id: order_id,
                store_id: store_id
            }
        }

        const response = await fetch('https://api.culqi.com/v2/charges', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${realSecretKey}`
            },
            body: JSON.stringify(culqiPayload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Error de Cargo Culqi:', data)
            return NextResponse.json({ error: data.merchant_message || 'Transacción denegada.' }, { status: 400 })
        }

        // 4. Actualizar la orden inmediatamente con el charge ID para auditoría
        const { error: updateError } = await supabase
            .from('orders')
            .update({ 
                status: 'paid',
                payment_proof_url: 'CULQI_AUTOMATIC',
            })
            .eq('id', order_id)
            .eq('store_id', store_id)

        if (updateError) {
            console.error('Error actualizando Supabase, pero cargo exitoso. El webhook debería parchar esto.', updateError)
        }

        return NextResponse.json({ success: true, charge: data })

    } catch (error: any) {
        console.error('Error en API Culqi Checkout:', error)
        return NextResponse.json({ error: 'Error interno en el procesamiento del pago.' }, { status: 500 })
    }
}
