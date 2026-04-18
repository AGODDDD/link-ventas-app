import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Culqi Event Validation
        if (body.object === 'event' && body.type === 'charge.creation.succeeded') {
            const charge = JSON.parse(body.data)

            // Extract metadata we sent during charge
            const order_id = charge.metadata?.order_id
            const store_id = charge.metadata?.store_id

            if (!order_id || !store_id) {
                console.warn('Webhook Culqi ignorado: Falta metadata (order_id/store_id).', charge.id)
                return NextResponse.json({ success: true, message: 'Ignored missing metadata' })
            }

            // Iniciar Cliente Supabase
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            // Update Database: Mover estado a 'paid'
            const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                    status: 'paid',
                    payment_proof_url: 'CULQI_AUTOMATIC'
                })
                .eq('id', order_id)
                .eq('store_id', store_id)

            if (updateError) {
                console.error('Webhook Supabase update error:', updateError)
                return NextResponse.json({ error: 'DB update error' }, { status: 500 })
            }

            console.log(`Webhook: Orden ${order_id} pagada vía Culqi exitosamente.`)
            return NextResponse.json({ success: true, message: 'Order marked as paid' })
        }

        // Ignore unknown events
        return NextResponse.json({ success: true, message: 'Event ignored' })

    } catch (error: any) {
        console.error('Error en Webhook Culqi:', error)
        return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
    }
}
