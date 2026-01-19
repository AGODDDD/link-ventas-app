'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Upload, CheckCircle2, QrCode } from 'lucide-react'

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
            // Usamos bucket 'comprobantes' segun plan
            const { error: uploadError } = await supabase.storage
                .from('comprobantes')
                .upload(fileName, comprobante)

            if (uploadError) throw uploadError

            // 2. Crear Orden (Guardamos el PATH, no la URL pública)
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    merchant_id: params.id,
                    customer_name: nombre,
                    customer_phone: telefono,
                    customer_address: direccion,
                    total_amount: total,
                    status: 'pending', // Pendiente de verificación
                    payment_proof_url: fileName, // Guardamos el path para generar SignedUrl después
                })
                .select()
                .single()

            if (orderError) throw orderError

            // 3. Crear Items de la Orden
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
            alert('¡Pedido enviado con éxito! 🎉')
            router.push(`/tienda/${params.id}`) // O a una pagina de 'Gracias'

        } catch (error: any) {
            console.error(error)
            alert('Error al procesar el pedido: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Cargando checkout...</div>

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Cabecera */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-2xl font-bold">Finalizar Compra 💳</h1>
                </div>

                <div className="grid gap-6">

                    {/* 1. Resumen de Compra */}
                    <Card>
                        <CardHeader className="pb-3"><CardTitle>Resumen del Pedido</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span>{item.quantity} x {item.product.name}</span>
                                    <span className="font-medium">S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <Separator />
                            <div className="flex justify-between items-center text-xl font-bold">
                                <span>Total a Pagar</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Datos de Pago (QRs) */}
                    <Card className="bg-slate-900 text-white border-none">
                        <CardHeader><CardTitle className="flex items-center gap-2"><QrCode /> Paga Aquí</CardTitle></CardHeader>
                        <CardContent>
                            <p className="mb-4 text-slate-300 text-sm">Escanea el QR de Yape o Plin y realiza el pago por <strong>S/ {total.toFixed(2)}</strong>.</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-purple-600 font-bold mb-2">Yape</p>
                                    {perfil?.yape_image_url ? (
                                        <img src={perfil.yape_image_url} className="w-full h-auto rounded-md" />
                                    ) : <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">No disponible</div>}
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-cyan-600 font-bold mb-2">Plin</p>
                                    {perfil?.plin_image_url ? (
                                        <img src={perfil.plin_image_url} className="w-full h-auto rounded-md" />
                                    ) : <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">No disponible</div>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Formulario de Envío y Comprobante */}
                    <Card>
                        <CardHeader><CardTitle>Datos de Envío y Pago</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <Input required placeholder="Juan Pérez" value={nombre} onChange={e => setNombre(e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Teléfono / WhatsApp</Label>
                                    <Input required placeholder="999 999 999" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Dirección de Entrega</Label>
                                    <Input required placeholder="Av. Siempre Viva 123" value={direccion} onChange={e => setDireccion(e.target.value)} />
                                </div>

                                <div className="pt-4 border-t">
                                    <Label className="mb-2 block">Sube la captura del pago (Yape/Plin)</Label>
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            required
                                            onChange={e => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0]
                                                    if (!file.type.startsWith('image/')) {
                                                        alert('Solo se permiten imágenes.')
                                                        e.target.value = ''
                                                        return
                                                    }
                                                    setComprobante(file)
                                                }
                                            }}
                                        />
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            {comprobante ? (
                                                <>
                                                    <CheckCircle2 className="text-green-500" size={32} />
                                                    <span className="font-medium text-green-600">{comprobante.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={32} />
                                                    <span>Toca para subir captura</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-12 text-lg bg-slate-900 hover:bg-slate-800 mt-4" disabled={submitting}>
                                    {submitting ? 'Enviando...' : 'Confirmar Pedido ✅'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}
