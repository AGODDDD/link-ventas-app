'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Upload, CheckCircle2, QrCode, MapPin, Phone, User, ShieldCheck, ChevronRight } from 'lucide-react'

export default function CheckoutPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = React.use(paramsPromise)
    const router = useRouter()
    const [cart, setCart] = useState<any[]>([])
    const [perfil, setPerfil] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form State
    const [nombre, setNombre] = useState('')
    const [telefono, setTelefono] = useState('')
    const [direccion, setDireccion] = useState('')
    const [comprobante, setComprobante] = useState<File | null>(null)

    useEffect(() => {
        // 1. Cargar carrito
        const savedCart = localStorage.getItem(`cart-${params.id}`)
        if (savedCart) {
            setCart(JSON.parse(savedCart))
        } else {
            router.push(`/tienda/${params.id}`)
        }

        // 2. Cargar datos del vendedor (para los QRs)
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-pulse">Cargando checkout safe...</div></div>

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white">

            {/* 🟢 COLUMNA IZQUIERDA: Formulario (Order 2 en mobil, 1 en desktop) */}
            <div className="w-full md:w-3/5 lg:w-1/2 p-6 md:p-12 lg:p-16 order-2 md:order-1">

                <div className="max-w-xl mx-auto">
                    {/* Header solo movil */}
                    <div className="flex items-center gap-2 mb-8 md:mb-12 cursor-pointer text-slate-500 hover:text-black transition-colors" onClick={() => router.back()}>
                        <ArrowLeft size={20} />
                        <span className="text-sm font-medium">Volver a la tienda</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Pago Seguro</h2>
                        <p className="text-slate-500">Completa tus datos para el envío.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Seccion 1: Contacto */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <User size={20} /> Información de Contacto
                            </h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <Input required placeholder="Ej: Juan Pérez" className="h-12 bg-slate-50 border-slate-200" value={nombre} onChange={e => setNombre(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono / WhatsApp</Label>
                                    <Input required placeholder="Ej: 999 999 999" type="tel" className="h-12 bg-slate-50 border-slate-200" value={telefono} onChange={e => setTelefono(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Seccion 2: Dirección */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <MapPin size={20} /> Dirección de Entrega
                            </h3>
                            <div className="space-y-2">
                                <Input required placeholder="Dirección exacta, Referencia..." className="h-12 bg-slate-50 border-slate-200" value={direccion} onChange={e => setDireccion(e.target.value)} />
                            </div>
                        </div>

                        <Separator />

                        {/* Seccion 3: Pago */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <QrCode size={20} /> Método de Pago
                            </h3>

                            {/* Tarjetas QR */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border rounded-xl p-4 text-center cursor-pointer hover:border-black transition-all bg-white shadow-sm">
                                    <div className="mb-3 font-bold text-purple-600">Yape</div>
                                    <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                                        {perfil?.yape_image_url ? (
                                            <img src={perfil.yape_image_url} className="w-full h-full object-cover" />
                                        ) : <span className="text-xs text-slate-400">No QR</span>}
                                    </div>
                                </div>
                                <div className="border rounded-xl p-4 text-center cursor-pointer hover:border-black transition-all bg-white shadow-sm">
                                    <div className="mb-3 font-bold text-cyan-600">Plin</div>
                                    <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                                        {perfil?.plin_image_url ? (
                                            <img src={perfil.plin_image_url} className="w-full h-full object-cover" />
                                        ) : <span className="text-xs text-slate-400">No QR</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3 items-start">
                                <ShieldCheck className="shrink-0 mt-0.5" size={18} />
                                <p>Por favor, realiza el pago de <strong>S/ {total.toFixed(2)}</strong> a uno de los códigos QR y sube la captura de pantalla como comprobante.</p>
                            </div>

                            {/* Upload Area */}
                            <div className="space-y-2">
                                <Label>Subir Comprobante</Label>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors relative text-center group">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        required
                                        onChange={e => {
                                            if (e.target.files?.[0]) {
                                                if (e.target.files[0].type.startsWith('image/')) setComprobante(e.target.files[0])
                                                else alert('Solo imágenes')
                                            }
                                        }}
                                    />
                                    <div className="flex flex-col items-center justify-center text-slate-500 group-hover:text-slate-700">
                                        {comprobante ? (
                                            <>
                                                <CheckCircle2 className="text-green-500 mb-2" size={40} />
                                                <span className="font-medium text-slate-900">{comprobante.name}</span>
                                                <span className="text-xs">Clic para cambiar</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mb-2" size={40} strokeWidth={1.5} />
                                                <span className="font-medium">Haz clic o arrastra tu imagen aquí</span>
                                                <span className="text-xs mt-1">Formatos: JPG, PNG, WEBP</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                        <Button
                            type="submit"
                            style={{ background: 'linear-gradient(135deg, #240B36 0%, #C31432 100%)' }}
                            className="w-full h-14 text-lg text-white rounded-xl shadow-xl transition-transform active:scale-[0.99] border-0 hover:opacity-90"
                            disabled={submitting}
                        >
                            {submitting ? 'Procesando...' : `Pagar S/ ${total.toFixed(2)}`}
                        </Button>

                        <p className="text-center text-xs text-slate-400 mt-4 flex justify-center items-center gap-1">
                            <ShieldCheck size={12} /> Pagos procesados seguramente por LinkVentas
                        </p>
                    </form>
                </div>
            </div>

            {/* 🟠 COLUMNA DERECHA: Resumen (Order 1 en mobil, 2 en desktop) */}
            <div className="w-full md:w-2/5 lg:w-1/2 p-6 md:p-12 lg:p-16 bg-slate-50 border-l border-slate-100 order-1 md:order-2 sticky top-0 h-fit min-h-fit md:min-h-screen">
                <div className="max-w-lg mx-auto">
                    {/* Store Brand in Summary */}
                    <div className="flex items-center gap-3 mb-8 opacity-80">
                        <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden">
                            {perfil?.avatar_url && <img src={perfil.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                        <span className="font-bold text-slate-700">{perfil?.store_name || 'Tu Tienda'}</span>
                    </div>

                    <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
                        Resumen del Pedido
                        <span className="text-sm font-normal text-slate-500">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
                    </h2>

                    <div className="space-y-6">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-center">
                                <div className="relative h-20 w-20 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {item.product.image_url ? (
                                        <img src={item.product.image_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl">📦</span>
                                    )}
                                    <span className="absolute -top-2 -right-2 bg-slate-500 text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center">
                                        {item.quantity}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-slate-900">{item.product.name}</h4>
                                    <p className="text-sm text-slate-500">{item.product.description?.substring(0, 30)}...</p>
                                </div>
                                <div className="font-bold text-slate-900">
                                    S/ {(item.product.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Separator className="my-8" />

                    <div className="space-y-3 text-slate-600">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>S/ {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Envío</span>
                            <span className="text-green-600 font-medium">Gratis</span>
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-slate-900">Total</span>
                        <div className="text-right">
                            <span className="text-min text-slate-400 font-normal mr-2">PEN</span>
                            <span className="text-3xl font-extrabold text-black">S/ {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}
