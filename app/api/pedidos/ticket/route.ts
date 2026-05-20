import { NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'
import { supabase } from '@/lib/supabase'

// Helper para buscar el pedido por ID en las distintas tablas (Shadow Migration)
async function getOrderById(orderId: string) {
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
    
    // Obtener perfil del comercio
    const storeId = order.store_id || order.merchant_id
    let storeName = "TU TIENDA"
    if (storeId) {
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
    const shortId = order.id.split('-')[0].toUpperCase()
    const secuencia = Math.floor(Math.random() * 9000) + 1000
    
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
    doc.fontSize(8).font('Courier-Bold').text(`TICKET DE VENTA N° ${shortId}${secuencia}`, { align: 'center' })
    doc.moveDown(0.6)
    
    // Metadatos Clásicos de POS
    doc.fontSize(7).font('Courier')
    doc.text(`LOCAL     : VENTA ONLINE`)
    doc.text(`DIRECCION : INTERNET`)
    doc.text(`Terminal  : WEB       Secuencia: ${secuencia}`)
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
    doc.text(`${totalQty} VENTA(S)`.padEnd(28, ' ') + `${total} T T`.padStart(8, ' '))
    
    doc.moveDown(0.4)
    doc.fontSize(8).font('Courier-Bold').text(`---------------------------------------`)
    
    // Código de Despacho
    const cleanId = order.id.replace(/-/g, '').substring(0, 15).toUpperCase()
    doc.fontSize(7).font('Courier').text(`ORDEN DE DESPACHO: ${cleanId}`, { align: 'center' })
    doc.moveDown(0.6)
    
    // Simulación de Código de Barras POS de Alta Densidad (Vectores directos)
    const startX = 18
    let currentX = startX
    const barcodeY = doc.y
    const barcodeHeight = 35
    
    for (let i = 0; i < 70; i++) {
        const thickness = Math.random() > 0.6 ? 2.2 : 1
        const spacing = Math.random() > 0.4 ? 1.4 : 0.8
        doc.rect(currentX, barcodeY, thickness, barcodeHeight).fill('#000000')
        currentX += thickness + spacing
        if (currentX > 208) break
    }
    
    doc.moveDown(5.0) // Desplazar cursor abajo tras el código de barras
    
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
    doc.moveDown(0.4)
    
    // Simulación de Código de Barras de Pie de Página (Simple)
    let bX = 40
    const bY = doc.y
    for (let i = 0; i < 45; i++) {
        const thickness = Math.random() > 0.5 ? 1.6 : 0.8
        const spacing = 1.1
        doc.rect(bX, bY, thickness, 15).fill('#000000')
        bX += thickness + spacing
    }
    
    doc.moveDown(2.2)
    doc.fontSize(6).font('Courier').text(order.id.replace(/-/g, '').toUpperCase(), { align: 'center' })
    
    // Finalizar el documento
    doc.end()
    
    // Esperar al buffer completo del PDF
    const pdfBuffer = await stream
    
    return new Response(pdfBuffer, {
        headers: {
            'content-type': 'application/pdf',
            'content-disposition': `inline; filename="Ticket_${shortId}.pdf"`,
            'cache-control': 'public, max-age=3600'
        }
    })
}
