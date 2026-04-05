'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Download, CheckCircle2, ShoppingBag } from 'lucide-react'

// Utilidad temporal para mock si es necesario, o tipado
type OrderPayload = {
    id: string
    created_at: string
    customer_name: string
    customer_phone: string
    customer_address: string
    total_amount: number
    status: string
    order_items: {
        quantity: number
        price_at_time: number
        products: { name: string }
    }[]
}

export default function AestheticTicketPage() {
    const params = useParams()
    const storeId = params.id as string
    const orderId = params.orderId as string

    const [order, setOrder] = useState<OrderPayload | null>(null)
    const [storeInfo, setStoreInfo] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTicketData = async () => {
            // Fetch Store Name
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', storeId).single()
            setStoreInfo(profile)

            // Fetch Order
            const { data: orderData } = await supabase
                .from('orders')
                .select('*, order_items(*, products(name))')
                .eq('id', orderId)
                .single()

            setOrder(orderData as any)
            setLoading(false)
        }

        if(storeId && orderId) fetchTicketData()
    }, [storeId, orderId])

    const handlePrint = () => {
        window.print()
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface-container-low font-body text-xl font-bold animate-pulse text-on-surface-variant">Generando Ticket... 🎟️</div>
    if (!order) return <div className="min-h-screen flex items-center justify-center text-error bg-surface font-body font-bold text-2xl">Ticket no encontrado.</div>

    return (
        <div className="min-h-screen bg-surface-container-low flex flex-col items-center py-10 px-4 font-body antialiased transition-colors duration-300">
            
            {/* Action Bar (Not visible when printing) */}
            <div className="w-full max-w-sm mb-6 flex justify-between items-center print:hidden">
                <button onClick={() => window.close()} className="text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
                    ← Cerrar
                </button>
                <button 
                    onClick={handlePrint} 
                    className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-full font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                    <Download size={16} /> Guardar PDF
                </button>
            </div>

            {/* The Ticket Itself (Kinetic Brutalism style) */}
            <div className="w-full max-w-sm bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none">
                
                {/* Header (Store Brand) */}
                <div 
                    className="p-8 text-center" 
                    style={{ background: `linear-gradient(135deg, ${storeInfo?.primary_color || '#1e293b'} 0%, ${storeInfo?.secondary_color || '#334155'} 100%)` }}
                >
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center p-1 mb-4 shadow-2xl">
                        {storeInfo?.avatar_url ? (
                            <img src={storeInfo.avatar_url} alt="Logo" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <ShoppingBag className="text-slate-900" size={28} />
                        )}
                    </div>
                    <h1 className="text-white text-2xl font-black uppercase tracking-tighter leading-none mb-1">
                        {storeInfo?.store_name || 'Comercio Local'}
                    </h1>
                    <p className="text-white/70 text-[10px] uppercase tracking-[0.3em] font-bold">
                        Comprobante Digital
                    </p>
                </div>

                {/* Status & Order ID */}
                <div className="bg-surface-bright px-6 py-4 flex justify-between items-center border-b-2 border-dashed border-outline-variant/30">
                    <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Orden No.</p>
                        <p className="font-mono text-on-surface font-black">#{order.id.split('-')[0].toUpperCase()}</p>
                    </div>
                    {order.status === 'paid' || order.status === 'shipped' ? (
                        <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1 text-primary text-xs font-black uppercase bg-primary-container/20 px-2 py-1 rounded-sm">
                                <CheckCircle2 size={12} /> PAGADO
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1 text-tertiary text-xs font-black uppercase bg-tertiary-container/20 px-2 py-1 rounded-sm">
                                PENDIENTE
                            </span>
                        </div>
                    )}
                </div>

                {/* Customer Details */}
                <div className="px-6 py-5 border-b-2 border-dashed border-outline-variant/30 grid gap-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Cliente</p>
                            <p className="font-bold text-on-surface">{order.customer_name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Fecha</p>
                            <p className="font-bold text-on-surface">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    {order.customer_address && (
                         <div>
                            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Entrega</p>
                            <p className="font-medium text-on-surface text-sm">{order.customer_address}</p>
                        </div>
                    )}
                </div>

                {/* Items List */}
                <div className="px-6 py-5 border-b-2 border-dashed border-outline-variant/30">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-[0.2em] mb-4 text-center">Detalle de Compra</p>
                    <div className="space-y-4">
                        {order.order_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                                <div className="flex gap-2 w-3/4">
                                    <span className="font-black text-on-surface">{item.quantity}x</span>
                                    <span className="font-medium text-on-surface-variant leading-tight">{item.products?.name}</span>
                                </div>
                                <div className="font-bold text-on-surface text-right w-1/4">
                                    S/ {(parseFloat(item.price_at_time as any) * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Total */}
                <div className="px-6 py-6 pb-8 bg-surface-container-low text-center">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-[0.2em] mb-2">Importe Total</p>
                    <h2 className="text-4xl font-black text-on-surface tracking-tighter">
                        S/ {parseFloat(order.total_amount as any).toFixed(2)}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-4 opacity-75">
                        ¡Gracias por elegir LinkVentas!
                    </p>
                </div>
            </div>

            {/* Print specific CSS to make it fit nicely */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}</style>
        </div>
    )
}
