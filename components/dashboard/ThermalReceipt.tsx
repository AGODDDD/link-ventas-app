'use client'

import React, { forwardRef } from 'react'
import Barcode from 'react-barcode'

type ThermalReceiptProps = {
    order: any;
    storeName: string;
}

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(({ order, storeName }, ref) => {
    if (!order) return null

    const total = parseFloat(order.total_amount).toFixed(2)
    const store_name = storeName || "TU TIENDA"
    const orderDate = new Date(order.created_at)

    const formattedDate = orderDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    const formattedTime = orderDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
    
    // Determinar el número real del ticket
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
    const ticketNumber = order.legacy_id || (isUuid ? order.id.split('-')[0].toUpperCase() : order.id.toUpperCase());

    return (
        <div 
            ref={ref}
            // Ancho clásico de ticket, fondo blanco químico, texto negro profundo
            style={{ width: '400px', backgroundColor: '#ffffff', color: '#000000', fontFamily: '"Courier New", Courier, monospace', position: 'relative', padding: '30px 20px 60px 20px', letterSpacing: '-0.5px' }}
        >
            {/* Título Principal */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-bold tracking-widest uppercase">TICKET DE VENTA N° {ticketNumber}</h1>
            </div>

            {/* Metadatos */}
            <div className="text-xs uppercase mb-4 leading-tight">
                <div className="flex"><span className="w-24">LOCAL</span><span>: VENTA ONLINE</span></div>
                <div className="flex"><span className="w-24">DIRECCION</span><span>: INTERNET</span></div>
                <div className="flex"><span className="w-24">Terminal</span><span>: WEB</span></div>
                <div className="flex"><span className="w-24">Fecha</span><span>: {formattedDate} &nbsp;Hora: {formattedTime}</span></div>
                <div className="flex"><span className="w-24">Vendedor</span><span>: {store_name}</span></div>
                {order.customer_name && (
                   <div className="flex"><span className="w-24">Cliente</span><span>: {order.customer_name}</span></div>
                )}
            </div>

            <div className="border-t-[2px] border-black mb-2"></div>
            
            {/* Cabecera Tabla */}
            <div className="flex text-xs font-bold uppercase mb-2">
                <span className="w-12 text-center">CANT</span>
                <span className="flex-1">DESCRIPCION</span>
                <span className="w-20 text-right">MONTO</span>
            </div>

            {/* Items */}
            <div className="flex flex-col gap-2 text-xs uppercase mb-4" style={{ lineHeight: '1.2' }}>
                {order.order_items?.map((item: any, idx: number) => {
                    const combinedPriceRaw = parseFloat(item.unitPrice || item.price || item.price_at_time || 0)
                    const lineTotal = item.totalPrice ? parseFloat(item.totalPrice).toFixed(2) : (combinedPriceRaw * item.quantity).toFixed(2)
                    const itemName = item.name || item.product?.name || `PRODUCTO ${idx+1}`
                    
                    const rawMods = item.modifiersList || item.modifiers || item.options || ''
                    // Handle both array format and { items: [], notes: '' } object format
                    const isModsObject = rawMods && !Array.isArray(rawMods) && typeof rawMods === 'object' && rawMods.items
                    const isModsArray = Array.isArray(rawMods)
                    const modsList = isModsObject ? rawMods.items : (isModsArray ? rawMods : [])
                    let modsString = (!isModsArray && !isModsObject && typeof rawMods === 'string') ? rawMods : ''
                    if (rawMods?.talla || rawMods?.color) {
                        const parts = []
                        if (rawMods.talla) parts.push(`Talla: ${rawMods.talla}`)
                        if (rawMods.color) parts.push(`Color: ${rawMods.color}`)
                        modsString = parts.join(' · ')
                    }
                    const itemNotes = item.notes || (isModsObject ? rawMods.notes : '') || ''
                    
                    const modsTotal = modsList.reduce((acc: number, m: any) => acc + (parseFloat(m.price) || 0), 0)
                    const basePrice = combinedPriceRaw - modsTotal

                    return (
                        <div key={idx} className="flex flex-col mb-1">
                            <div className="flex items-start">
                                <span className="w-12 text-center shrink-0">{item.quantity}</span>
                                <span className="flex-1 pr-2 break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                                    {itemName}
                                </span>
                                <span className="w-20 text-right shrink-0">{(basePrice * item.quantity).toFixed(2)}</span>
                            </div>
                            
                            {modsString && (
                                <div className="flex items-start text-[10px]" style={{ color: '#555555' }}>
                                    <span className="w-12 shrink-0"></span>
                                    <span className="flex-1 pr-2">- {modsString}</span>
                                    <span className="w-20 shrink-0"></span>
                                </div>
                            )}

                            {modsList.map((m: any, mIdx: number) => (
                                <div key={mIdx} className="flex items-start text-[10px]" style={{ color: '#555555' }}>
                                    <span className="w-12 shrink-0"></span>
                                    <span className="flex-1 pr-2">- {m.name}</span>
                                    <span className="w-20 text-right shrink-0">
                                        {parseFloat(m.price) > 0 ? (parseFloat(m.price) * item.quantity).toFixed(2) : ''}
                                    </span>
                                </div>
                            ))}

                            {itemNotes && (
                                <div className="flex items-start text-[10px]" style={{ color: '#333333', fontStyle: 'italic' }}>
                                    <span className="w-12 shrink-0"></span>
                                    <span className="flex-1 pr-2">** {itemNotes} **</span>
                                    <span className="w-20 shrink-0"></span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            
            {/* Subtotal y Total */}
            <div className="text-xs uppercase flex flex-col items-end pr-2 gap-1 mb-2">
                 {order.subtotal > 0 && order.delivery_fee > 0 ? (
                     <>
                         <div className="flex w-[160px] justify-between">
                             <span>SUBTOTAL</span>
                             <span>{parseFloat(order.subtotal).toFixed(2)}</span>
                         </div>
                         <div className="flex w-[160px] justify-between">
                             <span>DELIVERY</span>
                             <span>{parseFloat(order.delivery_fee).toFixed(2)}</span>
                         </div>
                     </>
                 ) : (
                     <div className="flex w-[160px] justify-between">
                         <span>SUBTOTAL</span>
                         <span>{total}</span>
                     </div>
                 )}
                 <div className="flex w-[160px] justify-between font-bold text-sm">
                     <span>TOTAL</span>
                     <span>{total}</span>
                 </div>
                 <div className="flex w-[160px] justify-between mt-1">
                     <span>{order.payment_proof_url === 'CONTRA_ENTREGA' ? 'EFECTIVO' : 'DIGITAL'}</span>
                     <span>{total}</span>
                 </div>
            </div>
            
            {/* Extra Info */}
            <div className="text-xs uppercase mb-4">
                <div className="flex justify-between">
                    <span>{order.order_items?.reduce((acc: number, item: any) => acc + item.quantity, 0)} VENTA(S)</span>
                </div>
            </div>

            <div className="border-t-[2px] border-black my-4"></div>

            {/* Orden Despacho */}
            <div className="text-xs uppercase mb-4 text-center">
                ORDEN DE DESPACHO : {ticketNumber}
            </div>

            {/* Código de Barras Real (Estilo 1D) */}
            <div className="flex justify-center mb-6 overflow-hidden mx-4 opacity-90 scale-x-[1.1] origin-center">
                <Barcode 
                    value={ticketNumber} 
                    width={1.8} 
                    height={60} 
                    displayValue={false} 
                    background="transparent" 
                    lineColor="#000000" 
                    margin={0}
                />
            </div>

            <div className="text-center text-xs mb-6 uppercase leading-tight">
                TICKET NO VALIDO COMO<br/>
                COMPROBANTE DE PAGO SUNAT
            </div>

            <div className="text-center text-[10px] mb-2 uppercase">
                Visualice el estado de su pedido en<br/>
                su WhatsApp
            </div>

            <div className="text-center text-[10px] uppercase mb-4">
                GRACIAS POR SU PREFERENCIA
            </div>
            
            <p className="text-center text-[8px] uppercase tracking-widest font-mono">
                {ticketNumber}
            </p>

            {/* Borde the Papel Rasgado the de Sierra en la Base */}
            <div 
                className="absolute -bottom-4 left-0 w-full h-4" 
                style={{ 
                    backgroundImage: 'linear-gradient(135deg, #ffffff 50%, transparent 50%), linear-gradient(-135deg, #ffffff 50%, transparent 50%)',
                    backgroundSize: '8px 8px',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'left bottom'
                }}>
            </div>
        </div>
    )
})

ThermalReceipt.displayName = 'ThermalReceipt'
