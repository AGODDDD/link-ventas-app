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

    const formattedDate = orderDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    const formattedTime = orderDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
    
    // Generar un número de secuencia aleatorio o basado en la orden
    const shortId = order.id.split('-')[0].toUpperCase()
    const secuencia = Math.floor(Math.random() * 9000) + 1000

    return (
        <div 
            ref={ref}
            // Ancho clásico de ticket, fondo blanco químico, texto negro profundo
            style={{ width: '400px', backgroundColor: '#ffffff', color: '#000000', fontFamily: '"Courier New", Courier, monospace', position: 'relative', padding: '30px 20px 60px 20px', letterSpacing: '-0.5px' }}
        >
            {/* Título Principal */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-bold tracking-widest uppercase">TICKET DE VENTA N° {shortId}{secuencia}</h1>
            </div>

            {/* Metadatos */}
            <div className="text-xs uppercase mb-4 leading-tight">
                <div className="flex"><span className="w-24">LOCAL</span><span>: VENTA ONLINE</span></div>
                <div className="flex"><span className="w-24">DIRECCION</span><span>: INTERNET</span></div>
                <div className="flex"><span className="w-24">Terminal</span><span>: WEB &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Secuencia: {secuencia}</span></div>
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
            <div className="flex flex-col gap-1 text-xs uppercase mb-4">
                {order.order_items?.map((item: any, idx: number) => {
                    const priceRaw = parseFloat(item.price_at_time || item.product?.price || 0)
                    const lineTotal = (priceRaw * item.quantity).toFixed(2)
                    
                    return (
                        <div key={idx} className="flex">
                            <span className="w-12 text-center">{item.quantity}</span>
                            <span className="flex-1 truncate pr-2">{item.product?.name || `PRODUCTO ${idx+1}`}</span>
                            <span className="w-20 text-right">{lineTotal}</span>
                        </div>
                    )
                })}
            </div>
            
            {/* Subtotal y Total */}
            <div className="text-xs uppercase flex flex-col items-end pr-2 gap-1 mb-2">
                 <div className="flex w-[160px] justify-between">
                     <span>SUBTOTAL</span>
                     <span>{total}</span>
                 </div>
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
                    <span>{order.order_items?.reduce((acc: number, item: any) => acc + item.quantity, 0)} VENTA</span>
                    <span>{total} T T</span>
                </div>
            </div>

            <div className="border-t-[2px] border-black my-4"></div>

            {/* Orden Despacho */}
            <div className="text-xs uppercase mb-4 text-center">
                ORDEN DE DESPACHO : {order.id.replace(/-/g, '').substring(0, 15)}
            </div>

            {/* Falso Código de Barras Denso (Estilo 2D) */}
            <div className="flex justify-center mb-6 h-28 overflow-hidden mx-4 opacity-90">
                {/* Generador de ruido/barras verticales falsas the alta densidad */}
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 300 100">
                    {Array.from({ length: 150 }).map((_, i) => (
                        <rect 
                            key={i} 
                            x={i * 2} 
                            y={Math.random() > 0.8 ? 10 : 0} 
                            width={Math.random() > 0.5 ? 1.5 : 0.5} 
                            height={Math.random() > 0.8 ? 80 : 100} 
                            fill="#000" 
                        />
                    ))}
                </svg>
            </div>

            <div className="text-center text-xs mb-6 uppercase leading-tight">
                TICKET NO VALIDO COMO<br/>
                COMPROBANTE DE PAGO SUNAT
            </div>

            <div className="text-center text-[10px] mb-2 uppercase">
                Visualice el estado de su pedido en<br/>
                su WhatsApp
            </div>

            <div className="text-center text-[10px] uppercase mb-1">
                GRACIAS POR SU PREFERENCIA
            </div>

            {/* Falso Código de Barras Inferior (Simple) */}
            <div className="flex justify-center mb-2 h-12 overflow-hidden mx-8">
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 200 40">
                    {Array.from({ length: 60 }).map((_, i) => (
                        <rect 
                            key={i} 
                            x={i * 3.3} 
                            y="0" 
                            width={Math.random() > 0.5 ? 2 : 1} 
                            height="40" 
                            fill="#000" 
                        />
                    ))}
                </svg>
            </div>
            
            <p className="text-center text-[8px] uppercase tracking-widest font-mono">
                {order.id.replace(/-/g, '')}
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
