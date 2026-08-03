'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { Profile } from '@/types/tienda'
import { ShoppingBag, ArrowLeft, Upload, MapPin, Store, CreditCard, Wallet, QrCode, CheckCircle2, User, Phone, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { MercadoPagoCardPayment } from '@/components/payments/MercadoPagoCardPayment'
import {
    ChevronLeftIcon as AnimatedArrowLeft,
    MapPinIcon as AnimatedMapPin,
    QrCodeIcon as AnimatedQrCode,
    ShoppingBagIcon as AnimatedShoppingBag,
    ShieldCheckIcon as AnimatedShieldCheck,
    UploadIcon as AnimatedUpload,
    UserIcon as AnimatedUser,
    WalletIcon as AnimatedWallet,
} from '@animateicons/react/lucide'

type PaymentMethod = 'transferencia' | 'contra_entrega' | 'tarjeta_mercadopago'
type OrderStatus = 'pendiente' | 'pendiente_verificacion' | 'pagado' | 'cancelado'

function getLineUnitPrice(item: ReturnType<typeof useCartStore.getState>['carts'][string][number]) {
    let modifiersPrice = 0
    if (item.variantDetails?.options && item.product.variants) {
        for (const [groupId, optionIds] of Object.entries(item.variantDetails.options)) {
            const group = item.product.variants.find((candidate: any) => candidate.id === groupId) as any
            if (!group) continue
            for (const optionId of optionIds) {
                const option = group.options?.find((candidate: any) => candidate.id === optionId)
                if (option && Number.isFinite(option.price_modifier)) modifiersPrice += option.price_modifier
            }
        }
    }
    return item.product.price + modifiersPrice
}

function hasValidModaVariant(item: ReturnType<typeof useCartStore.getState>['carts'][string][number]) {
    const variants = Array.isArray(item.product.variants) ? item.product.variants : []
    const modaVariants = variants.filter((variant: any) => variant && ('talla' in variant || 'color' in variant))
    if (modaVariants.length === 0) return true
    const talla = item.variantDetails?.talla
    const color = item.variantDetails?.color
    const requiresTalla = modaVariants.some((variant: any) => Boolean(variant.talla))
    const requiresColor = modaVariants.some((variant: any) => Boolean(variant.color))
    if ((requiresTalla && !talla) || (requiresColor && !color)) return false
    return modaVariants.some((variant: any) =>
        (!talla || variant.talla === talla) && (!color || variant.color === color)
    )
}

export default function CheckoutPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = React.use(paramsPromise)
    const router = useRouter()
    
    const storeId = params.id
    const cartStore = useCartStore()
    const cart = cartStore.carts[storeId] || []
    
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [perfil, setPerfil] = useState<Profile | null>(null)
    const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null)
    const [leadId, setLeadId] = useState<string | null>(null)
    const [pendingPayment, setPendingPayment] = useState<{ orderId: string; legacyId: string; total: number } | null>(null)

    // Form states
    const [nombre, setNombre] = useState('')
    const [telefono, setTelefono] = useState('')
    const [direccion, setDireccion] = useState('')
    const [email, setEmail] = useState('')
    const [metodoPago, setMetodoPago] = useState<PaymentMethod>('transferencia')
    const [comprobante, setComprobante] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (cart.length === 0 && !orderSuccessId) {
            router.push(`/tienda/${storeId}`)
            return;
        }

        const cargarPerfil = async () => {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
            const { data: store } = await supabase
                .from('stores')
                .select('*')
                .eq(isUUID ? 'id' : 'slug', storeId)
                .single()

            if (store) {
                const { data: config } = await supabase
                    .from('store_config')
                    .select('*')
                    .eq('store_id', store.id)
                    .maybeSingle()

                setPerfil({
                    id: store.id,
                    store_name: store.name,
                    description: store.description,
                    avatar_url: store.avatar_url,
                    banner_url: store.banner_url,
                    template_type: store.template_type,
                    whatsapp_phone: store.whatsapp_phone,
                    yape_image_url: config?.yape_image_url,
                    plin_image_url: config?.plin_image_url,
                    mercadopago_active: config?.mercadopago_active,
                    mercadopago_public_key: config?.mercadopago_public_key,
                })
            }
            setLoading(false)
        }
        cargarPerfil()
    }, [storeId, router, cart.length, orderSuccessId])

    // ==============================================================
    // STEALTH CAPTURE (Debounced Lead Saver)
    // ==============================================================
    useEffect(() => {
        if (!telefono || telefono.replace(/\s/g, '').length < 7) return;
        
        const timeoutId = setTimeout(async () => {
            try {
                const response = await fetch('/api/abandoned-cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        storeId,
                        customerName: nombre,
                        customerPhone: telefono,
                        cart: cart.map(item => ({
                            ...item,
                            variantDetails: item.variantDetails || null
                        })),
                        existingLeadId: leadId
                    })
                });
                const data = await response.json();
                if (data.leadId && !leadId) {
                    setLeadId(data.leadId); // Guardar referencia the este lead en esta sesión
                }
            } catch (error) {
                console.error("Stealth capture error:", error);
            }
        }, 3000); // 3 segundos de debounce para no bombardear el servidor
        
        return () => clearTimeout(timeoutId);
    }, [nombre, telefono, storeId, cart, leadId]);
    // ==============================================================

    const total = cartStore.getTotalPrice(storeId)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
                toast.error('El comprobante debe ser una imagen de hasta 5 MB')
                return
            }
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            setComprobante(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validaciones
        if (!nombre.trim() || nombre.trim().length < 3) {
            return toast.error('El nombre debe tener al menos 3 caracteres')
        }
        if (!telefono.trim() || !/^\d{7,15}$/.test(telefono.replace(/\s/g, ''))) {
            return toast.error('Ingresa un número de teléfono válido (solo dígitos, 7-15 caracteres)')
        }
        if (!direccion.trim() || direccion.trim().length < 5) {
            return toast.error('La dirección debe tener al menos 5 caracteres')
        }
        if (metodoPago === 'tarjeta_mercadopago' && !/^\S+@\S+\.\S+$/.test(email.trim())) {
            return toast.error('Ingresa un correo válido para pagar con tarjeta')
        }
        if (metodoPago === 'transferencia' && !comprobante) {
            return toast.error('Por favor sube la captura del pago para verificar')
        }

        // Validación de Variantes (Moda)
        for (const item of cart) {
            if (!hasValidModaVariant(item)) {
                return toast.error(`Selecciona una talla y color disponibles para: ${item.product.name}`)
            }
        }

        setSubmitting(true)
        try {
            if (!perfil) throw new Error('Cargando datos de tienda... por favor intente de nuevo en un segundo')

            let fileName = ''

            // 1. Subir Comprobante solo si es transferencia
            if (metodoPago === 'transferencia' && comprobante) {
                const form = new FormData()
                form.append('store_id', perfil.id)
                form.append('file', comprobante)
                const uploadResponse = await fetch('/api/payment-proof', { method: 'POST', body: form })
                const uploadData = await uploadResponse.json()
                if (!uploadResponse.ok || !uploadData.path) throw new Error(uploadData.error || 'No se pudo subir el comprobante.')
                fileName = uploadData.path
            }

            const proofMap: Record<PaymentMethod, string | null> = {
                contra_entrega: 'CONTRA_ENTREGA',
                tarjeta_mercadopago: 'MERCADOPAGO_PENDING',
                transferencia: fileName || 'TRANSFERENCIA_MANUAL',
            }
            const orderResponse = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store_id: perfil.id,
                    order_type: 'standard',
                    payment_method: metodoPago,
                    customer_name: nombre,
                    customer_phone: telefono,
                    customer_email: email.trim() || null,
                    address: direccion,
                    items: cart.map((item) => ({
                        product_id: item.product.id,
                        quantity: item.quantity,
                        variant_details: item.variantDetails || null,
                    })),
                    payment_proof_url: proofMap[metodoPago],
                }),
            })
            const orderResult = await orderResponse.json()
            if (!orderResponse.ok || !orderResult.order) {
                throw new Error(orderResult.error || 'No se pudo crear la orden.')
            }
            const persistedOrder = orderResult.order

            if (metodoPago === 'tarjeta_mercadopago') {
                setPendingPayment({ orderId: persistedOrder.order_id, legacyId: persistedOrder.legacy_id, total: Number(persistedOrder.total) })
                return
            }

            // 3.8. Rescate Exitoso: Eliminar el Lead Fantasma pues completó su compra
            // 4. Limpiar y Redirigir Pantalla
            const cartIdToClear = perfil?.id || storeId;
            console.log('🧹 Limpiando carrito para ID:', cartIdToClear)
            cartStore.clearCart(cartIdToClear)
            if (storeId !== cartIdToClear) {
                cartStore.clearCart(storeId) // En caso estuviera indexado por slug
            }
            if ((perfil as any)?.slug) {
                cartStore.clearCart((perfil as any).slug)
            }
            setOrderSuccessId(persistedOrder.legacy_id)

        } catch (error: any) {
            console.error(error)
            alert('ERROR: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary font-headline font-black italic text-2xl uppercase tracking-widest">CARGANDO SECUENCIA_</div>

    if (orderSuccessId) {
        return (
            <div className="font-body selection:bg-primary-container selection:text-on-primary-container bg-background text-on-background min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full relative animate-in fade-in zoom-in duration-500">
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-on-background to-primary rounded-sm blur-md opacity-20 animate-pulse"></div>
                    
                    <div className="relative bg-surface border-2 border-outline p-8 md:p-12 text-center overflow-hidden shadow-2xl">
                        {/* Cut corner brutalist style */}
                        <div className="absolute top-0 right-0 w-8 h-8 bg-background transform rotate-45 translate-x-4 -translate-y-4 border-l-2 border-b-2 border-outline"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 bg-background transform rotate-45 -translate-x-4 translate-y-4 border-r-2 border-t-2 border-outline"></div>

                        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                            <CheckCircle2 className="w-10 h-10 text-primary" />
                        </div>
                        
                        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-primary mb-2">ORDEN EN CAJA</p>
                        <h2 className="text-4xl font-black font-headline uppercase tracking-tight italic mb-2">ÓRDEN<br/>RECIBIDA</h2>
                        
                        <div className="bg-surface-variant p-4 my-8 border border-outline border-dashed">
                            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-1">CÓDIGO DE RASTREO</p>
                            <p className="font-mono text-3xl font-black text-on-surface">#{orderSuccessId.split('-')[0].toUpperCase()}</p>
                        </div>
                        
                        <div className="space-y-4 mb-8 text-sm text-on-surface-variant text-left leading-relaxed">
                            <p className="flex items-start gap-2">
                                <ShieldCheck className="w-5 h-5 shrink-0 text-primary" /> 
                                <span>Tu pedido ha ingresado con éxito a la bóveda de la tienda principal.</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <Phone className="w-5 h-5 shrink-0 text-on-surface" /> 
                                <span>Nuestro equipo procesará los datos y <strong className="text-on-surface font-black">te contactaremos por WhatsApp</strong> en breve para coordinar la entrega.</span>
                            </p>
                        </div>

                        <Button 
                            onClick={() => router.push(`/tienda/${storeId}`)}
                            className="w-full bg-on-background text-background hover:bg-primary hover:text-on-primary h-14 font-headline uppercase tracking-widest font-black transition-all"
                        >
                            <Store className="mr-2" /> VOLVER A LA VITRINA
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const storeName = perfil?.store_name || "TU TIENDA"

    return (
        <>
        {pendingPayment && perfil?.mercadopago_public_key && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg bg-white p-6 text-black shadow-2xl">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-headline text-lg font-black">PAGO SEGURO</h2><button onClick={() => setPendingPayment(null)}>Cerrar</button></div>
              <MercadoPagoCardPayment publicKey={perfil.mercadopago_public_key} amount={pendingPayment.total} payerEmail={email} onError={(message) => toast.error(message)} onSubmit={async (payment) => {
                const response = await fetch('/api/checkout/mercadopago', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payment, email: payment.payer?.email || email, order_id: pendingPayment.orderId, store_id: perfil.id }) })
                const data = await response.json()
                if (!response.ok) throw new Error(data.error || 'Pago no aprobado.')
                cartStore.clearCart(perfil.id); if (storeId !== perfil.id) cartStore.clearCart(storeId)
                setOrderSuccessId(pendingPayment.legacyId); setPendingPayment(null); toast.success('Pago recibido; confirmaremos tu orden en breve.')
              }} />
            </div>
          </div>
        )}
        <div className="min-h-screen bg-[#f8f7f3] text-[#292724] selection:bg-[#e7ddd1] selection:text-[#292724] font-body flex flex-col md:flex-row">

            {/* LEFT: FORMULARIO */}
            <div className="flex-1 p-6 md:p-12 lg:p-16 overflow-y-auto order-2 md:order-1 relative">
                
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: 'radial-gradient(rgba(101,85,70,0.11) .7px, transparent .7px)', backgroundSize: '18px 18px' }} />

                <div className="max-w-xl mx-auto space-y-12 relative z-10">
                    {/* Header Mobile */}
                    <div className="flex items-center gap-5 mb-8 border-b border-stone-200 pb-7">
                        <button 
                            onClick={() => router.back()} 
                            aria-label="Volver atrás"
                            className="text-[#292724] hover:bg-[#ede9e1] transition-all duration-300 active:scale-95 bg-white p-3 rounded-full border border-stone-200 shadow-[0_8px_20px_rgba(41,39,36,0.05)]"
                        >
                                    <AnimatedArrowLeft size={24} duration={0.7} />
                        </button>
                        <div>
                            <p className="font-label text-[10px] uppercase tracking-widest text-primary mb-1">PAGO SEGURO // {storeName}</p>
                            <h1 className="text-3xl font-semibold font-headline tracking-tight">Finaliza tu compra</h1>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-12">
                        {/* 1. Datos de Envío */}
                        <section className="space-y-6">
                            <h2 className="text-xl font-black font-headline uppercase tracking-widest flex items-center gap-4 text-on-background mb-6 border-l-4 border-primary pl-4">
                                <span className="text-primary italic">01.</span> TUS DATOS DE ENTREGA
                            </h2>
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="customer-name" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">NOMBRE Y APELLIDO</label>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-surface-variant border-r border-outline border-y border-l text-primary">
                                            <AnimatedUser size={18} duration={0.7} />
                                        </div>
                                        <input 
                                            id="customer-name"
                                            className="w-full bg-background border border-outline h-12 pl-16 pr-4 font-headline uppercase font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline" 
                                            required 
                                            value={nombre} 
                                            onChange={e => setNombre(e.target.value)} 
                                            placeholder="EJ: JANE DOE" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="customer-phone" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">TELÉFONO / WHATSAPP</label>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-surface-variant border-r border-outline border-y border-l text-primary">
                                            <Phone size={18} />
                                        </div>
                                        <input 
                                            id="customer-phone"
                                            className="w-full bg-background border border-outline h-12 pl-16 pr-4 font-headline uppercase font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline" 
                                            required 
                                            type="tel" 
                                            value={telefono} 
                                            onChange={e => setTelefono(e.target.value)} 
                                            placeholder="EJ: 999 123 456" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="customer-email" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">CORREO {metodoPago === 'tarjeta_mercadopago' ? '(REQUERIDO PARA TARJETA)' : '(OPCIONAL)'}</label>
                                    <input
                                        id="customer-email"
                                        className="w-full bg-background border border-outline h-12 px-4 font-headline font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline"
                                        type="email"
                                        required={metodoPago === 'tarjeta_mercadopago'}
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="cliente@correo.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="customer-address" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">DIRECCIÓN COMPLETA DE ENTREGA</label>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-surface-variant border-r border-outline border-y border-l text-primary">
                                            <AnimatedMapPin size={18} duration={0.7} />
                                        </div>
                                        <input 
                                            id="customer-address"
                                            className="w-full bg-background border border-outline h-12 pl-16 pr-4 font-headline uppercase font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline" 
                                            required 
                                            value={direccion} 
                                            onChange={e => setDireccion(e.target.value)} 
                                            placeholder="AV. PRINCIPAL 123, DISTRITO" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Método de Pago */}
                        <section className="space-y-6">
                            <h2 className="text-xl font-black font-headline uppercase tracking-widest flex items-center gap-4 text-on-background border-l-4 border-primary pl-4">
                                <span className="text-primary italic">02.</span> MÉTODO DE PAGO
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Option A */}
                                <label 
                                    className={`relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 ease-out active:scale-[0.99] flex flex-col gap-2 ${metodoPago === 'transferencia' ? 'border-primary bg-white shadow-[0_12px_30px_rgba(41,39,36,0.08)]' : 'border-stone-200 bg-white/70 hover:-translate-y-0.5 hover:border-stone-300'}`}
                                >
                                    <input 
                                        type="radio" 
                                        name="metodopago" 
                                        value="transferencia" 
                                        onChange={() => setMetodoPago('transferencia')}
                                        checked={metodoPago === 'transferencia'}
                                        className="absolute opacity-0" 
                                    />
                                    <AnimatedQrCode size={24} duration={0.7} className={metodoPago === 'transferencia' ? 'text-primary' : 'text-on-surface-variant'} />
                                    <span className={`font-headline font-bold uppercase ${metodoPago === 'transferencia' ? 'text-primary' : 'text-on-background'}`}>YAPE / PLIN / TRANSFERENCIA</span>
                                    {metodoPago === 'transferencia' && <span className="absolute top-2 right-2 bg-primary text-on-primary p-0.5"><CheckCircle2 size={16}/></span>}
                                </label>

                                {/* Option B */}
                                <label 
                                    className={`relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 ease-out active:scale-[0.99] flex flex-col gap-2 ${metodoPago === 'contra_entrega' ? 'border-primary bg-white shadow-[0_12px_30px_rgba(41,39,36,0.08)]' : 'border-stone-200 bg-white/70 hover:-translate-y-0.5 hover:border-stone-300'}`}
                                >
                                    <input 
                                        type="radio" 
                                        name="metodopago" 
                                        value="contra_entrega" 
                                        checked={metodoPago === 'contra_entrega'}
                                        onChange={() => setMetodoPago('contra_entrega')}
                                        className="absolute opacity-0" 
                                    />
                                    <AnimatedWallet size={24} duration={0.7} className={metodoPago === 'contra_entrega' ? 'text-primary' : 'text-on-surface-variant'} />
                                    <span className={`font-headline font-bold uppercase ${metodoPago === 'contra_entrega' ? 'text-primary' : 'text-on-background'}`}>PAGO CONTRA ENTREGA (EFECTIVO)</span>
                                    {metodoPago === 'contra_entrega' && <span className="absolute top-2 right-2 bg-primary text-on-primary p-0.5"><CheckCircle2 size={16}/></span>}
                                </label>

                                {/* Option C (Mercado Pago) */}
                                {perfil?.mercadopago_active && perfil?.mercadopago_public_key && (
                                    <label 
                                        className={`relative cursor-pointer border-2 p-4 transition-all duration-200 flex flex-col gap-2 md:col-span-2 ${metodoPago === 'tarjeta_mercadopago' ? 'border-primary bg-primary/5 shadow-md' : 'border-[#00A19B]/30 bg-surface-variant hover:border-[#00A19B]'}`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="metodopago" 
                                            value="tarjeta_mercadopago"
                                            checked={metodoPago === 'tarjeta_mercadopago'}
                                            onChange={() => setMetodoPago('tarjeta_mercadopago')}
                                            className="absolute opacity-0" 
                                        />
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-2">
                                                <AnimatedShieldCheck size={28} duration={0.7} className={metodoPago === 'tarjeta_mercadopago' ? 'text-primary' : 'text-[#00A19B]'} />
                                                <span className={`font-headline font-black uppercase text-lg ${metodoPago === 'tarjeta_mercadopago' ? 'text-primary' : 'text-on-background'}`}>
                                                    TARJETA CON MERCADO PAGO
                                                </span>
                                            </div>
                                            <div className="flex gap-1 md:gap-2">
                                                <div className="bg-white rounded px-2 opacity-80 h-6 flex items-center"><img src="https://logospng.org/download/visa/logo-visa-2048.png" className="h-2 object-contain" alt="Visa" /></div>
                                                <div className="bg-white rounded px-2 opacity-80 h-6 flex items-center"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1200px-Mastercard-logo.svg.png" className="h-3 object-contain" alt="MC" /></div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-on-surface-variant max-w-sm mt-1">
                                            Pago instantáneo protegido con cifrado SSL bancario. Tu compra se procesará automáticamente.
                                        </p>
                                        {metodoPago === 'tarjeta_mercadopago' && <span className="absolute top-2 right-2 bg-primary text-on-primary p-0.5 rounded shadow"><CheckCircle2 size={16}/></span>}
                                    </label>
                                )}
                            </div>
                        </section>

                        {/* 3. Escaneo y Voucher Condicional */}
                        {metodoPago === 'transferencia' && (
                            <section className="space-y-6 animate-in slide-in-from-top-4 fade-in duration-300">
                                <h2 className="text-xl font-black font-headline uppercase tracking-widest flex items-center gap-4 text-on-background border-l-4 border-primary pl-4">
                                    <span className="text-primary italic">03.</span> ESCANEO Y VOUCHER
                                </h2>

                                <div className="bg-surface-variant p-6 border border-outline space-y-6 relative overflow-hidden">
                                     {/* Fake barcode for aesthetic */}
                                    <div className="absolute -right-16 -top-16 opacity-5 rotate-45 pointer-events-none">
                                        <div className="flex gap-1 h-64">
                                            <div className="w-2 bg-primary" /><div className="w-1 bg-primary" /><div className="w-4 bg-primary" /><div className="w-2 bg-primary" /><div className="w-6 bg-primary" /><div className="w-1 bg-primary" />
                                        </div>
                                    </div>

                                    <p className="font-body text-sm text-on-surface-variant uppercase tracking-widest">
                                        Total a transferir: <strong className="text-primary font-headline text-lg italic">S/ {total.toFixed(2)}</strong>
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        {perfil?.yape_image_url && (
                                            <div className="text-center bg-background border border-outline p-4 space-y-4">
                                                <div className="aspect-square w-full relative">
                                                    <img src={perfil.yape_image_url} className="absolute inset-0 w-full h-full object-contain" alt="Yape" />
                                                </div>
                                                <span className="font-headline font-black text-white bg-[#742284] px-4 py-1 inline-block uppercase tracking-widest">YAPE</span>
                                            </div>
                                        )}
                                        {perfil?.plin_image_url && (
                                            <div className="text-center bg-background border border-outline p-4 space-y-4">
                                                <div className="aspect-square w-full relative">
                                                    <img src={perfil.plin_image_url} className="absolute inset-0 w-full h-full object-contain" alt="Plin" />
                                                </div>
                                                <span className="font-headline font-black text-white bg-[#00E0D1] px-4 py-1 inline-block uppercase tracking-widest">PLIN</span>
                                            </div>
                                        )}
                                    </div>

                                    {!perfil?.yape_image_url && !perfil?.plin_image_url && (
                                        <div className="text-center p-4 bg-primary/10 border border-primary text-primary font-headline font-bold uppercase tracking-widest">
                                            EL VENDEDOR AÚN NO HA CONFIGURADO SUS MÉTODOS DE PAGO / QRS.
                                        </div>
                                    )}

                                    {/* Subir Comprobante */}
                                    <div className="space-y-2 mt-8">
                                        <label htmlFor="voucher-upload" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">SUBIR COMPROBANTE DE PAGO [REQUERIDO]</label>
                                        <div className="border border-dashed border-primary bg-background p-6 hover:bg-primary/5 transition-colors cursor-pointer relative group">
                                            {previewUrl ? (
                                                <div className="relative w-full aspect-video flex items-center justify-center bg-black">
                                                    <img src={previewUrl} className="max-h-full max-w-full object-contain opacity-80" />
                                                    <div className="absolute top-2 right-2 bg-primary text-on-primary px-2 py-1 flex items-center gap-2 font-headline font-bold text-xs uppercase tracking-widest">
                                                        <CheckCircle2 size={16} /> SUBIDO
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 pointer-events-none">
                                                    <div className="bg-surface-variant w-16 h-16 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                        <AnimatedUpload size={24} duration={0.7} />
                                                    </div>
                                                    <div>
                                                        <p className="font-headline font-bold uppercase text-on-background tracking-widest">HAZ CLIC PARA SUBIR CAPTURA</p>
                                                        <p className="font-label text-xs text-on-surface-variant tracking-widest mt-1">SOPORTE: JPG, PNG</p>
                                                    </div>
                                                </div>
                                            )}
                                            <input
                                                id="voucher-upload"
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onChange={handleFileChange}
                                                required={metodoPago === 'transferencia'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="space-y-4 pt-6 border-t border-outline">
                            <Button 
                                type="submit" 
                                disabled={submitting || (metodoPago === 'transferencia' && !comprobante) || (metodoPago === 'tarjeta_mercadopago' && !/^\S+@\S+\.\S+$/.test(email.trim())) || (!nombre || telefono.length < 7 || direccion.length < 5)}
                                className="w-full bg-primary text-on-primary hover:brightness-110 h-16 font-headline text-lg uppercase tracking-widest font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20"
                            >
                                {submitting ? 'Asegurando bóveda...' : (metodoPago === 'tarjeta_mercadopago' ? 'PAGAR DE FORMA SEGURA 🔒' : 'FINALIZAR ORDEN')}
                            </Button>
                            <p className="text-center font-label text-[10px] uppercase text-on-surface-variant flex items-center justify-center gap-1">
                                <ShieldCheck size={12} /> PROCESO PROTEGIDO POR LINKVENTAS
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* RIGHT: RESUMEN (Sticky on Desktop) */}
            <div className="hidden md:block w-[400px] lg:w-[450px] bg-[#efede7] border-l border-stone-200 p-8 lg:p-12 sticky top-0 h-screen overflow-y-auto order-1 md:order-2">
                <div className="space-y-8">
                    <div className="flex items-center justify-between pb-6 border-b border-outline">
                        <div className="flex items-center gap-3 text-primary">
                            <AnimatedShoppingBag size={24} duration={0.7} />
                            <h2 className="font-black font-headline uppercase tracking-widest italic text-xl">RESUMEN</h2>
                        </div>
                        <span className="bg-primary text-on-primary px-3 py-1 font-headline font-bold text-xs">{cart.reduce((a, b) => a + b.quantity, 0)} ITEMS</span>
                    </div>

                    <div className="space-y-6">
                        {cart.map((item) => (
                            <div key={item.product.id} className="flex gap-4 group">
                                <div className="h-20 w-20 bg-background border border-outline relative shrink-0">
                                    {item.product.image_url ? (
                                        <img src={item.product.image_url} className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <Store className="h-full w-full p-4 text-outline" />
                                    )}
                                    <div className="absolute -top-2 -right-2 bg-on-background text-background font-headline font-bold text-[10px] w-5 h-5 flex items-center justify-center">
                                        {item.quantity}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <p className="font-headline font-bold uppercase text-sm leading-tight text-on-background line-clamp-2">{item.product.name}</p>
                                    {item.variantDetails && (item.variantDetails.talla || item.variantDetails.color) && (
                                        <p className="font-label text-xs text-on-surface-variant mt-1">
                                            {[
                                                item.variantDetails.talla && `Talla: ${item.variantDetails.talla}`,
                                                item.variantDetails.color && `Color: ${item.variantDetails.color}`
                                            ].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="font-headline text-primary font-black mt-2 tracking-tighter italic text-lg">
                                        S/ {(getLineUnitPrice(item) * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-outline space-y-4">
                        <div className="flex justify-between font-label text-xs uppercase tracking-widest text-on-surface-variant">
                            <span>SUBTOTAL</span>
                            <span>S/ {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-label text-xs uppercase tracking-widest text-on-surface-variant">
                            <span>GASTOS DE ENVÍO</span>
                            <span className="text-primary font-bold">--</span>
                        </div>
                        <div className="flex justify-between items-end pt-6 border-t border-outline mt-6">
                            <span className="font-headline font-bold text-on-surface-variant uppercase tracking-widest">TOTAL</span>
                            <span className="font-headline font-black text-4xl text-on-background tracking-tighter italic">
                                S/ {total.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}
