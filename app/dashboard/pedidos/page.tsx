'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, CheckCircle, Clock, X } from 'lucide-react'

// Definimos tipos básicos
type Order = {
    id: string
    created_at: string
    customer_name: string
    customer_phone: string
    customer_address: string
    total_amount: number
    status: 'pending' | 'paid' | 'shipped' | 'cancelled'
    payment_proof_url: string
    order_items: any[]
}

export default function PedidosPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // Estado para el Modal de Comprobante
    const [selectedProof, setSelectedProof] = useState<string | null>(null)
    const [proofLoading, setProofLoading] = useState(false)

    const cargarPedidos = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (
          *,
          products (name)
        )
      `)
            .eq('merchant_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setLoading(false)
    }

    useEffect(() => {
        cargarPedidos()
    }, [])

    const actualizarEstado = async (id: string, nuevoEstado: string) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: nuevoEstado })
            .eq('id', id)

        if (!error) {
            setOrders(orders.map(o => o.id === id ? { ...o, status: nuevoEstado as any } : o))
        }
    }

    const verComprobante = async (path: string) => {
        setProofLoading(true)
        setSelectedProof(null) // Reset
        try {
            // Generamos URL firmada por 1 hora
            const { data, error } = await supabase.storage
                .from('comprobantes')
                .createSignedUrl(path, 3600)

            if (error) throw error
            setSelectedProof(data.signedUrl)
        } catch (e: any) {
            alert('Error cargando comprobante: ' + e.message)
        } finally {
            setProofLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"><Clock size={12} /> Pendiente</Badge>
            case 'paid': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1"><CheckCircle size={12} /> Pagado</Badge>
            case 'shipped': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Enviado</Badge>
            case 'cancelled': return <Badge variant="destructive">Cancelado</Badge>
            default: return <Badge>{status}</Badge>
        }
    }

    if (loading) return <div className="p-8 text-center">Cargando pedidos... 📦</div>

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Pedidos 📦</h1>
                    <p className="text-slate-500">Administra tus ventas y valida pagos.</p>
                </div>
                <Button onClick={cargarPedidos} variant="outline" size="sm">Actualizar</Button>
            </div>

            <div className="grid gap-4">
                {orders.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <p className="text-slate-400 text-xl">Aún no tienes pedidos.</p>
                        <p className="text-slate-300 text-sm">Comparte tu link para empezar a vender.</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="overflow-hidden">
                            <CardHeader className="bg-slate-50 py-3 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8)}</span>
                                    {getStatusBadge(order.status)}
                                    <span className="text-sm text-slate-500">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="font-bold text-lg">S/ {order.total_amount.toFixed(2)}</div>
                            </CardHeader>

                            <CardContent className="pt-4 grid md:grid-cols-2 gap-6">

                                {/* Info Cliente */}
                                <div className="text-sm space-y-1">
                                    <p className="font-bold text-slate-900">{order.customer_name}</p>
                                    <p className="text-slate-600">📞 {order.customer_phone}</p>
                                    <p className="text-slate-600">📍 {order.customer_address || 'Sin dirección'}</p>

                                    <div className="mt-4">
                                        <p className="font-medium text-xs text-slate-400 uppercase tracking-wider mb-2">Productos</p>
                                        <ul className="space-y-1">
                                            {order.order_items.map((item: any) => (
                                                <li key={item.id} className="flex justify-between text-slate-700">
                                                    <span>{item.quantity}x {item.products?.name}</span>
                                                    {/* <span>S/ {item.price}</span> */}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex flex-col items-end gap-3 justify-center border-l pl-6 border-slate-100">

                                    <Button
                                        variant="outline"
                                        className="w-full gap-2 border-dashed"
                                        onClick={() => verComprobante(order.payment_proof_url)}
                                    >
                                        <Eye size={16} /> Ver Comprobante
                                    </Button>

                                    {order.status === 'pending' && (
                                        <>
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => actualizarEstado(order.id, 'paid')}
                                            >
                                                ✅ Confirmar Pago
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                onClick={() => actualizarEstado(order.id, 'cancelled')}
                                            >
                                                Rechazar
                                            </Button>
                                        </>
                                    )}

                                    {order.status === 'paid' && (
                                        <Button
                                            variant="outline"
                                            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                            onClick={() => actualizarEstado(order.id, 'shipped')}
                                        >
                                            🚀 Marcar como Enviado
                                        </Button>
                                    )}

                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* MODAL DE COMPROBANTE - CUSTOM */}
            {(selectedProof || proofLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative bg-white rounded-lg max-w-sm w-full overflow-hidden shadow-2xl">
                        <button
                            onClick={() => { setSelectedProof(null); setProofLoading(false) }}
                            className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 rounded-full text-white z-10"
                        >
                            <X size={20} />
                        </button>
                        <div className="p-4 bg-slate-100 text-center font-bold border-b">
                            Comprobante de Pago
                        </div>
                        <div className="aspect-[9/16] bg-slate-900 flex items-center justify-center">
                            {proofLoading ? (
                                <span className="text-white animate-pulse">Cargando imagen...</span>
                            ) : (
                                <img src={selectedProof!} className="w-full h-full object-contain" alt="Comprobante" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
