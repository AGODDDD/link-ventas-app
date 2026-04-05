'use client'

import React, { forwardRef } from 'react'

type ThermalReceiptProps = {
    order: any;
    storeName: string;
}

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(({ order, storeName }, ref) => {
    if (!order) return null

    const total = parseFloat(order.total_amount).toFixed(2)
    const store_name = storeName || "TU TIENDA"
    const orderDate = new Date(order.created_at)

    // Formatear fecha y hora para el ticket (Ej: 15/11/2019 - 04:45 PM)
    const formattedDate = orderDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const formattedTime = orderDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    
    // UUID corto
    const shortId = order.id.split('-')[0].toUpperCase()

    return (
        <div 
            ref={ref}
            // Forzamos 380px the ancho y usamos HEX puro para el texto principal
            style={{ width: '380px', backgroundColor: '#f4f4f4', color: '#111111', fontFamily: '"Courier New", Courier, monospace', position: 'relative' }}
            className="p-8 shadow-sm flex flex-col"
        >
            {/* Encabezado */}
            <div className="text-center space-y-2 mb-6">
                <p className="tracking-widest uppercase font-bold text-xs">=== {store_name} ===</p>
                <div className="border-b-2 border-dashed pb-4 mb-4" style={{ borderColor: '#888888' }}></div>
                <h1 className="text-2xl font-black tracking-widest uppercase">*** RECEIPT ***</h1>
            </div>

            {/* Info The Caja / Fecha */}
            <div className="flex justify-between text-xs font-bold mb-4">
                <span>CASHIER #1</span>
                <span>{formattedDate} - {formattedTime}</span>
            </div>
            
            <div className="border-b-2 border-dashed mb-4" style={{ borderColor: '#888888' }}></div>

            {/* Items */}
            <div className="flex flex-col gap-3 text-sm font-bold w-full uppercase">
                {order.order_items?.map((item: any, idx: number) => {
                    const priceRaw = parseFloat(item.price_at_time || item.product?.price || 0)
                    const lineTotal = (priceRaw * item.quantity).toFixed(2)
                    
                    return (
                        <div key={idx} className="flex flex-col">
                            <div className="flex justify-between">
                                <span className="line-clamp-1 w-3/4 pr-2">{item.product?.name || `ITEM ${idx+1}`}</span>
                                <span className="w-1/4 text-right">S/ {lineTotal}</span>
                            </div>
                            {item.quantity > 1 && (
                                <div className="text-xs mt-0.5" style={{ color: '#555555' }}>
                                    x{item.quantity} @ S/ {priceRaw.toFixed(2)}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="border-b-2 border-dashed my-4" style={{ borderColor: '#888888' }}></div>

            {/* Subtotales */}
            <div className="flex justify-between text-sm font-bold uppercase mb-4">
                <span>SUBTOTAL</span>
                <span>S/ {total}</span>
            </div>

            <div className="border-b-2 border-dashed mb-4" style={{ borderColor: '#888888' }}></div>

            {/* Totales Netos */}
            <div className="flex justify-between text-lg font-black uppercase mb-2">
                <span>TOTAL AMOUNT</span>
                <span>S/ {total}</span>
            </div>
            <div className="flex justify-between text-sm font-bold uppercase mb-2" style={{ color: '#444444' }}>
                <span>METODO</span>
                <span>{order.payment_proof_url === 'CONTRA_ENTREGA' ? 'EFECTIVO' : 'TRANSFERENCIA'}</span>
            </div>
            {order.customer_name && (
                <div className="flex justify-between text-xs font-bold uppercase mb-4" style={{ color: '#555555' }}>
                    <span>CLIENTE</span>
                    <span>{order.customer_name}</span>
                </div>
            )}

            <div className="border-b-2 border-dashed my-4" style={{ borderColor: '#888888' }}></div>
            
            {/* Footer */}
            <div className="text-center font-bold text-sm tracking-widest mt-2 mb-6">
                THANK YOU FOR SHOPPING!
            </div>

            <div className="border-b-2 border-dashed mb-6" style={{ borderColor: '#888888' }}></div>

            {/* Falso Código the Barras */}
            <div className="flex justify-center mb-6">
                <svg width="200" height="40" viewBox="0 0 200 40">
                   {Array.from({ length: 45 }).map((_, i) => (
                       <rect 
                           key={i} 
                           x={i * 4 + (Math.random() > 0.5 ? 1 : 0)} 
                           y="0" 
                           width={Math.random() > 0.5 ? 2 : 1} 
                           height="40" 
                           fill="#111111" 
                       />
                   ))}
                </svg>
            </div>
            
            <p className="text-center text-[10px] uppercase font-bold tracking-widest pb-4" style={{ color: '#888888' }}>
                {shortId}
            </p>

            {/* Borde the Papel Rasgado the de Sierra en la Base */}
            <div 
                className="absolute -bottom-4 left-0 w-full h-4" 
                style={{ 
                    backgroundImage: 'linear-gradient(135deg, #f4f4f4 50%, transparent 50%), linear-gradient(-135deg, #f4f4f4 50%, transparent 50%)',
                    backgroundSize: '8px 8px',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'left bottom'
                }}>
            </div>
        </div>
    )
})

ThermalReceipt.displayName = 'ThermalReceipt'
