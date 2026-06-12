import { NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

// Helper para buscar el pedido por ID en las distintas tablas (Shadow Migration)
async function getOrderById(orderId: string) {
    const supabase = getSupabaseServiceClient()
    // Verificar si es un UUID válido
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)

    if (isUuid) {
        // 1. Intentar en orders (Core / Legacy Standard)
        const { data: orderData } = await supabase
            .from('orders')
            .select(`*, order_items (*)`)
            .eq('id', orderId)
            .single()
            
        if (orderData) {
            return {
                ...orderData,
                _source: orderData.store_id ? 'core' : 'legacy_standard'
            }
        }
    }
    
    // 2. Intentar en delivery_orders (Legacy Delivery)
    const { data: deliveryData } = await supabase
        .from('delivery_orders')
        .select('*')
        .eq('id', orderId)
        .single()
        
    if (deliveryData) {
        return {
            id: deliveryData.id,
            created_at: deliveryData.created_at,
            customer_name: deliveryData.customer_name || 'Sin nombre',
            customer_phone: deliveryData.customer_phone || '-',
            direccion: deliveryData.direccion || deliveryData.address || 'Sin dirección',
            referencia: deliveryData.referencia || '',
            total_amount: deliveryData.total ? deliveryData.total.toString() : '0',
            subtotal: deliveryData.subtotal || 0,
            delivery_fee: deliveryData.delivery_fee || 0,
            status: deliveryData.status,
            payment_proof_url: deliveryData.metodo_pago === 'contra_entrega' ? 'CONTRA_ENTREGA' : 'WHATSAPP_LINK',
            order_items: deliveryData.items || [],
            _source: 'legacy_delivery'
        }
    }
    
    return null
}

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthenticatedUser(request)
        if (!user) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401,
                headers: { 'content-type': 'application/json' }
            })
        }

        const { searchParams } = new URL(request.url)
        const orderId = searchParams.get('id')
        
        if (!orderId) {
            return new Response(JSON.stringify({ error: 'ID de pedido requerido' }), {
                status: 400,
                headers: { 'content-type': 'application/json' }
            })
        }
        
        const order = await getOrderById(orderId)
        if (!order) {
            return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
                status: 404,
                headers: { 'content-type': 'application/json' }
            })
        }
        const ownerId = order.store_id
        if (ownerId !== user.id) {
            return new Response(JSON.stringify({ error: 'No autorizado para este pedido' }), {
                status: 403,
                headers: { 'content-type': 'application/json' }
            })
        }
        
        // Obtener perfil del comercio
        const storeId = order.store_id
        let storeName = "TU TIENDA"
        if (storeId) {
            const supabase = getSupabaseServiceClient()
            const { data: profile } = await supabase
                .from('profiles')
                .select('store_name')
                .eq('id', storeId)
                .single()
            if (profile?.store_name) {
                storeName = profile.store_name
            }
        }
        
        // Formatear metadatos del ticket
        const total = parseFloat(order.total_amount).toFixed(2)
        const orderDate = new Date(order.created_at)
        const formattedDate = orderDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
        const formattedTime = orderDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
        const ticketNumber = order.legacy_id || (isUuid ? order.id.split('-')[0].toUpperCase() : order.id.toUpperCase());
        
        // 80mm de ancho -> ~226.77 pt. Ajustamos el alto según la cantidad de items de forma dinámica.
        const itemsCount = order.order_items?.length || 0
        const computedHeight = 520 + (itemsCount * 28)
        
        const doc = new PDFDocument({
            size: [226.77, computedHeight],
            margins: { top: 15, bottom: 15, left: 10, right: 10 }
        })
        
        const chunks: any[] = []
        
        const stream = new Promise<Buffer>((resolve, reject) => {
            doc.on('data', (chunk) => chunks.push(chunk))
            doc.on('end', () => resolve(Buffer.concat(chunks)))
            doc.on('error', (err) => reject(err))
        })
        
        // --- DISEÑAR EL TICKET TÉRMICO ---
        doc.font('Courier')
        
        // Nombre del Comercio (Cabecera)
        doc.fontSize(10).font('Courier-Bold').text(storeName.toUpperCase(), { align: 'center' })
        doc.moveDown(0.4)
        
        // Título Principal
        doc.fontSize(8).font('Courier-Bold').text(`TICKET DE VENTA N° ${ticketNumber}`, { align: 'center' })
        doc.moveDown(0.6)
        
        // Metadatos Clásicos de POS
        doc.fontSize(7).font('Courier')
        doc.text(`LOCAL     : VENTA ONLINE`)
        doc.text(`DIRECCION : INTERNET`)
        doc.text(`Terminal  : WEB`)
        doc.text(`Fecha     : ${formattedDate}  Hora: ${formattedTime}`)
        doc.text(`Vendedor  : ${storeName.toUpperCase()}`)
        if (order.customer_name) {
            doc.text(`Cliente   : ${order.customer_name.toUpperCase()}`)
        }
        doc.moveDown(0.4)
        
        // Línea Separadora superior
        doc.fontSize(8).font('Courier-Bold').text(`---------------------------------------`)
        
        // Encabezado de la Tabla de Items
        doc.fontSize(7).text(`CANT  DESCRIPCION                MONTO`)
        doc.text(`---------------------------------------`)
        
        // Render de los Items
        doc.font('Courier')
        order.order_items?.forEach((item: any, idx: number) => {
            const qty = item.quantity || 1
            const name = (item.name || item.product?.name || `PRODUCTO ${idx + 1}`).substring(0, 22).toUpperCase()
            
            // Cálculo de precios e importes
            const combinedPriceRaw = parseFloat(item.unitPrice || item.price || item.price_at_time || 0)
            
            // Modificadores / Opciones
            const rawMods = item.modifiersList || item.modifiers || item.options || ''
            const isModsObject = rawMods && !Array.isArray(rawMods) && typeof rawMods === 'object' && rawMods.items
            const isModsArray = Array.isArray(rawMods)
            const modsList = isModsObject ? rawMods.items : (isModsArray ? rawMods : [])
            const modsTotal = modsList.reduce((acc: number, m: any) => acc + (parseFloat(m.price) || 0), 0)
            const basePrice = combinedPriceRaw - modsTotal
            const lineTotal = (basePrice * qty).toFixed(2)
            
            // Alinear Cantidad (5 chars), Descripción (25 chars) e Importe (8 chars)
            const qtyStr = String(qty).padEnd(5, ' ')
            const nameStr = name.padEnd(23, ' ')
            const priceStr = String(lineTotal).padStart(8, ' ')
            doc.text(`${qtyStr}${nameStr}${priceStr}`)
            
            // Mostrar modificadores
            modsList.forEach((m: any) => {
                const mName = `- ${m.name}`.substring(0, 20).toUpperCase()
                const mPrice = m.price && parseFloat(m.price) > 0 ? (parseFloat(m.price) * qty).toFixed(2) : ''
                const mLine = `${''.padEnd(5, ' ')}${mName.padEnd(23, ' ')}${String(mPrice).padStart(8, ' ')}`
                doc.fontSize(6).fillColor('#333333').text(mLine).fillColor('#000000').fontSize(7)
            })
            
            // Mostrar notas opcionales de cocina/pedido
            const notes = item.notes || (isModsObject ? rawMods.notes : '') || ''
            if (notes) {
                const noteLine = `  ** ${notes.toUpperCase()} **`.substring(0, 28)
                doc.fontSize(6).text(noteLine).fontSize(7)
            }
            
            doc.moveDown(0.2)
        })
        
        doc.moveDown(0.4)
        doc.fontSize(8).font('Courier-Bold').text(`---------------------------------------`)
        
        // Subtotal y Delivery Fee
        const subtotal = order.subtotal > 0 ? parseFloat(order.subtotal).toFixed(2) : total
        const delivery = parseFloat(order.delivery_fee || 0).toFixed(2)
        
        doc.fontSize(7)
        if (order.subtotal > 0 && order.delivery_fee > 0) {
            doc.text(`SUBTOTAL:`.padEnd(28, ' ') + String(subtotal).padStart(8, ' '))
            doc.text(`DELIVERY:`.padEnd(28, ' ') + String(delivery).padStart(8, ' '))
        } else {
            doc.text(`SUBTOTAL:`.padEnd(28, ' ') + String(total).padStart(8, ' '))
        }
        
        // Total a pagar
        doc.fontSize(8).font('Courier-Bold').text(`TOTAL:`.padEnd(24, ' ') + `S/ ${total}`.padStart(12, ' '))
        
        // Método de pago
        const paymentMethod = order.payment_proof_url === 'CONTRA_ENTREGA' ? 'EFECTIVO' : 'DIGITAL'
        doc.fontSize(7).font('Courier').text(paymentMethod.padEnd(28, ' ') + String(total).padStart(8, ' '))
        
        // Cantidad total de productos vendidos
        const totalQty = order.order_items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 0
        doc.moveDown(0.4)
        doc.text(`${totalQty} VENTA(S)`.padEnd(28, ' '))
        
        doc.moveDown(0.4)
        doc.fontSize(8).font('Courier-Bold').text(`---------------------------------------`)
        
        // Código de Despacho
        const barcodeText = ticketNumber;
        doc.fontSize(7).font('Courier').text(`ORDEN DE DESPACHO: ${barcodeText}`, { align: 'center' })
        doc.moveDown(0.6)
        
        // Código de Barras Real con bwip-js API
        try {
            const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeText)}&scale=3&height=10&includetext=false`;
            const imgRes = await fetch(barcodeUrl);
            if (!imgRes.ok) throw new Error('Failed to fetch barcode');
            const arrayBuffer = await imgRes.arrayBuffer();
            const barcodeBuffer = Buffer.from(arrayBuffer);
            
            // doc.x is around 10 due to margins, width is 226.77
            // Center the image: (226.77 - 190) / 2 = 18.38
            doc.image(barcodeBuffer, 18, doc.y, { fit: [190, 40] });
            doc.moveDown(4.0);
        } catch (bErr) {
            console.error("Error generating barcode:", bErr);
            doc.text(`[ERROR GENERANDO CODIGO]`, { align: 'center' });
            doc.moveDown(1.0);
        }
        
        // Cláusula de Validez de SUNAT
        doc.fontSize(7).font('Courier-Bold').text(`TICKET NO VALIDO COMO`, { align: 'center' })
        doc.text(`COMPROBANTE DE PAGO SUNAT`, { align: 'center' })
        doc.moveDown(0.4)
        
        // Enlace de WhatsApp
        doc.fontSize(6).font('Courier').text(`Visualice el estado de su pedido en`, { align: 'center' })
        doc.text(`su WhatsApp`, { align: 'center' })
        doc.moveDown(0.4)
        
        // Agradecimiento
        doc.fontSize(7).font('Courier-Bold').text(`GRACIAS POR SU PREFERENCIA`, { align: 'center' })
        doc.moveDown(1.5)
        
        doc.fontSize(6).font('Courier').text(barcodeText, { align: 'center' })
        
        // Finalizar el documento
        doc.end()
        
        // Esperar al buffer completo del PDF
        const pdfBuffer = await stream
        
        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                'content-type': 'application/pdf',
                'content-disposition': `inline; filename="Ticket_${ticketNumber}.pdf"`,
                'cache-control': 'public, max-age=3600'
            }
        })
    } catch (err: any) {
        console.error("Error generating ticket PDF:", err)
        return new Response(JSON.stringify({
            error: 'Error interno al generar el ticket PDF',
            details: err.message
        }), {
            status: 500,
            headers: { 'content-type': 'application/json' }
        })
    }
}
