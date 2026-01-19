'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Upload, CheckCircle2, QrCode, MapPin, Phone, User, ShieldCheck, ChevronRight } from 'lucide-react'

// Tipo para item del carrito
type CartItem = {
    product: any
    quantity: number
}

export default function CheckoutPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = React.use(paramsPromise)
    const router = useRouter()
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [perfil, setPerfil] = useState<any>(null)

    // Form states
    const [nombre, setNombre] = useState('')
    const [telefono, setTelefono] = useState('')
    const [direccion, setDireccion] = useState('')
    const [comprobante, setComprobante] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        // Cargar carrito y perfil del vendedor
        const savedCart = localStorage.getItem(`cart-${params.id}`)
        if (savedCart) {
            setCart(JSON.parse(savedCart))
        } else {
            // Si no hay carrito, redirigir a tienda
            router.push(`/tienda/${params.id}`)
        }

        const cargarPerfil = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', params.id)
                .single()

            if (data) setPerfil(data)
            setLoading(false)
        }
        cargarPerfil()
    }, [params.id, router])

    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setComprobante(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!comprobante) return alert('Por favor sube la captura del pago')

        setSubmitting(true)
        try {
            // 1. Subir Comprobante
            const fileExt = comprobante.name.split('.').pop()
            const fileName = `${params.id}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('comprobantes')
                .upload(fileName, comprobante)

            if (uploadError) throw uploadError

            // 2. Crear Orden
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    merchant_id: params.id,
                    customer_name: nombre,
                    customer_phone: telefono,
                    customer_address: direccion,
                    total_amount: total,
                    status: 'pending',
                    payment_proof_url: fileName,
                })
                .select()
                .single()

            if (orderError) throw orderError

            // 3. Crear Items
            const orderItems = cart.map(item => ({
                order_id: orderData.id,
                product_id: item.product.id,
                quantity: item.quantity,
                price: item.product.price
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            // 4. Limpiar y Redirigir
            localStorage.removeItem(`cart-${params.id}`)
            alert('¡Fantástico! Pedido enviado.')
            router.push(`/tienda/${params.id}`)

        } catch (error: any) {
            console.error(error)
            alert('Error: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando...</div>

    const primaryColor = perfil?.primary_color || '#000000'
    const secondaryColor = perfil?.secondary_color || '#C31432'

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">

            {/* LEFT: FORMULARIO */}
            <div className="flex-1 p-6 md:p-12 lg:p-16 overflow-y-auto order-2 md:order-1">
                <div className="max-w-xl mx-auto space-y-8">
                    {/* Header Mobile */}
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-200">
                            <ArrowLeft size={24} />
                        </Button>
                        <h1 className="text-2xl font-bold text-slate-900">Finalizar Compra</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* 1. Datos de Envío */}
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                                <div className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</div>
                                Tus Datos
                            </h2>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <Input className="pl-10 bg-white h-11" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>WhatsApp / Teléfono</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <Input className="pl-10 bg-white h-11" required type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 999 123 456" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Dirección de Entrega</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <Input className="pl-10 bg-white h-11" required value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej: Av. Principal 123, Lima" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* 2. Pago */}
                        <section className="space-y-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                                <div className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</div>
                                Realiza el Pago
                            </h2>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                <p className="text-sm text-slate-600 text-center">Escanea un código QR para pagar <strong>S/ {total.toFixed(2)}</strong></p>

                                <div className="grid grid-cols-2 gap-4">
                                    {perfil?.yape_image_url && (
                                        <div className="text-center space-y-2">
                                            <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                                                <img src={perfil.yape_image_url} className="w-full object-contain rounded-md" alt="Yape" />
                                            </div>
                                            <span className="text-xs font-bold text-purple-700">YAPE</span>
                                        </div>
                                    )}
                                    {perfil?.plin_image_url && (
                                        <div className="text-center space-y-2">
                                            <div className="bg-cyan-50 p-2 rounded-lg border border-cyan-100">
                                                <img src={perfil.plin_image_url} className="w-full object-contain rounded-md" alt="Plin" />
                                            </div>
                                            <span className="text-xs font-bold text-cyan-700">PLIN</span>
                                        </div>
                                    )}
                                </div>

                                {!perfil?.yape_image_url && !perfil?.plin_image_url && (
                                    <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                                        El vendedor no ha configurado sus QRs de pago aún.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 3. Comprobante */}
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                                <div className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</div>
                                Sube la Captura
                            </h2>

                            <div className="space-y-2">
                                <Label>Comprobante de Pago</Label>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative bg-white">
                                    {previewUrl ? (
                                        <div className="relative w-full">
                                            <img src={previewUrl} className="max-h-48 mx-auto rounded-lg shadow-sm" />
                                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full"><CheckCircle2 size={16} /></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                                <Upload size={24} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">Haz tap para subir foto</p>
                                            <p className="text-xs text-slate-400">JPG, PNG, JPEG</p>
                                        </div>
                                    )}
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                        required
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="pt-4 pb-12">
                            <Button
                                type="submit"
                                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                                className="w-full h-14 text-lg text-white rounded-xl shadow-xl transition-transform active:scale-[0.99] border-0 hover:opacity-90"
                                disabled={submitting}
                            >
                                {submitting ? 'Procesando...' : `Pagar S/ ${total.toFixed(2)}`}
                            </Button>

                            <p className="text-center text-xs text-slate-400 mt-4 flex justify-center items-center gap-1">
                                <ShieldCheck size={12} /> Pagos procesados seguramente por LinkVentas
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* RIGHT: RESUMEN (Sticky on Desktop) */}
            <div className="hidden md:block w-96 bg-white border-l border-slate-200 p-8 lg:p-12 sticky top-0 h-screen overflow-y-auto order-1 md:order-2">
                <div className="space-y-6">
                    <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Resumen del Pedido</h3>
                        <span className="text-sm text-slate-500">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
                    </div>

                    <div className="space-y-4">
                        {cart.map((item) => (
                            <div key={item.product.id} className="flex gap-4">
                                <div className="h-16 w-16 bg-slate-100 rounded-md overflow-hidden shrink-0">
                                    {item.product.image_url ? (
                                        <img src={item.product.image_url} className="h-full w-full object-cover" />
                                    ) : (
                                        <Store className="h-full w-full p-4 text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{item.product.name}</p>
                                    <p className="text-sm text-slate-500">Cant: {item.quantity}</p>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">S/ {(item.product.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span>S/ {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                            <span>Envío</span>
                            <span className="text-green-600 font-medium">Gratis</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-slate-900 pt-4 border-t border-slate-100">
                            <span>Total</span>
                            <span>S/ {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
