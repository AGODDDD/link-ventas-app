'use client'

import React, { useState, useEffect } from 'react'
import { Profile } from '@/types/tienda'
import { X, MapPin, Store, CreditCard, MessageCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useCustomerStore, generateOrderId, Order, OrderItem } from '@/store/useCustomerStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { isStoreClosed as checkStoreClosed } from '@/lib/storeSchedule'
import Script from 'next/script'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  perfil: Profile;
  savedAddress?: { direccion: string; referencia: string; lat: number; lng: number } | null;
  profileData?: { nombre: string; telefono: string; correo: string };
  onProfileUpdate?: (data: { nombre: string; telefono: string; correo: string }) => void;
}

export default function RestauranteCheckoutModal({ isOpen, onClose, onSuccess, perfil, savedAddress, profileData, onProfileUpdate }: Props) {
  const cartStore = useCartStore()
  const cart = cartStore.carts[perfil.id] || []
  
  // Data State — initialize from profile if available
  const [nombre, setNombre] = useState(profileData?.nombre || '')
  const [telefono, setTelefono] = useState(profileData?.telefono || '')
  const [correo, setCorreo] = useState(profileData?.correo || '')
  const [direccion, setDireccion] = useState(savedAddress?.direccion || '')
  const [metodoPago, setMetodoPago] = useState<'culqi' | 'whatsapp'>(perfil.culqi_active && perfil.culqi_public_key ? 'culqi' : 'whatsapp')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)

  // Sync data back to parent when closing
  const handleClose = () => {
    if (onProfileUpdate) {
      onProfileUpdate({ nombre, telefono, correo })
    }
    onClose()
  }
  
  // Derived amounts
  const deliveryFee = 8.00;
  const subtotal = cartStore.getTotalPrice(perfil.id)
  const total = subtotal + deliveryFee

  // Block scroll on body
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // Estrategia Horaria: bloquear checkout si la tienda está cerrada
  const isStoreClosed = checkStoreClosed((perfil as any).store_schedule ?? null)

  // ── CULQI CALLBACK (Global Listener) ──
  useEffect(() => {
    const win = window as any;
    win.culqi = async () => {
      if (win.Culqi?.token) {
        const token = win.Culqi.token.id;
        const email = win.Culqi.token.email;
        toast.loading('Procesando pago seguro...', { id: 'culqi-charge' });
        try {
          const res = await fetch('/api/checkout/culqi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token_id: token,
              amount: total,
              email: email || correo || 'cliente@linkventas.com',
              store_id: perfil.id,
              order_id: pendingOrderId
            })
          });
          const data = await res.json();
          toast.dismiss('culqi-charge');
          if (!res.ok) {
            toast.error('Transacción denegada: ' + (data.error || 'Verifica tu tarjeta.'));
            return;
          }
          toast.success('¡Pago procesado exitosamente!');
          // Cerrar modal de Culqi primero
          try { win.Culqi.close(); } catch {}
          // Limpiar carrito y cerrar
          useCartStore.getState().clearCart(perfil.id);
          if ((perfil as any).slug) useCartStore.getState().clearCart((perfil as any).slug);
          if (onSuccess) onSuccess();
          else handleClose();
        } catch {
          toast.dismiss('culqi-charge');
          toast.error('Error de red al procesar el pago.');
        }
      } else {
        toast.error(win.Culqi?.error?.user_message || 'El pago fue cancelado.');
      }
    };
  }, [perfil.id, total, correo, pendingOrderId]);

  if (!isOpen) return null;

  const handlePagar = async () => {
     if (!nombre || !telefono || !direccion || !acceptedTerms) {
        alert("Por favor completa los campos requeridos y acepta los términos.");
        return;
     }

     // Sync profile data back
     if (onProfileUpdate) onProfileUpdate({ nombre, telefono, correo });

     // Build order items for history
     const orderItems: OrderItem[] = cart.map(item => {
       let modPrice = 0;
       let optSummary = '';
       if (item.variantDetails?.options && item.product.variants) {
         const groups = item.product.variants as any[];
         Object.entries(item.variantDetails.options as Record<string, string[]>).forEach(([gId, oIds]) => {
           const g = groups.find(x => x.id === gId);
           if (g) oIds.forEach(oId => {
             const o = g.options.find((x:any) => x.id === oId);
             if (o) { modPrice += o.price_modifier; optSummary += `${o.name}, `; }
           });
         });
       }
       return {
         id: item.product.id,
         name: item.product.name,
         quantity: item.quantity,
         unitPrice: item.product.price + modPrice,
         totalPrice: (item.product.price + modPrice) * item.quantity,
         image_url: item.product.image_url || undefined,
         options: optSummary ? optSummary.slice(0, -2) : undefined,
         notes: item.variantDetails?.notes || undefined,
       };
     });

     // Generate store prefix from store name (first 4 chars uppercase)
     const prefix = (perfil.store_name || 'LINK').replace(/\s+/g, '').slice(0, 4).toUpperCase();
     const orderId = generateOrderId(prefix);

     // Save order to persistent store
     const customerStore = useCustomerStore.getState();
     const newOrder: Order = {
       id: orderId,
       storeId: perfil.id,
       storeName: perfil.store_name || '',
       date: new Date().toISOString(),
       status: metodoPago === 'whatsapp' ? 'pendiente_pago' : 'pendiente',
       items: orderItems,
       subtotal,
       deliveryFee,
       total,
       direccion,
       referencia: savedAddress?.referencia,
       lat: savedAddress?.lat,
       lng: savedAddress?.lng,
       cliente: { nombre, telefono, correo },
       metodoPago,
       estimatedTime: '50 - 60 min',
     };
     customerStore.addOrder(newOrder);

      // Save to Supabase for vendor dashboard + realtime tracking (Double Write Strategy)
      try {
        // 1. Guardar el pedido en Legacy (Restaurante) - MODO SOMBRA
        const { error: orderError } = await supabase.from('delivery_orders').insert({
          id: orderId,
          store_id: perfil.id,
          status: newOrder.status,
          customer_name: nombre,
          customer_phone: telefono,
          customer_email: correo,
          direccion,
          referencia: savedAddress?.referencia || null,
          lat: savedAddress?.lat || null,
          lng: savedAddress?.lng || null,
          items: orderItems,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          metodo_pago: metodoPago,
          estimated_time: '50 - 60 min',
        });
        
        if (orderError) console.error('⚠️ Error en tabla legacy:', orderError.message);

        // 2. Guardar el pedido en NUEVO CORE UNIFICADO (Fiel al esquema SQL)
        const { error: coreError } = await supabase.from('orders').insert({
          id: orderId, // Mismo ID para consistencia
          store_id: perfil.id,
          status: newOrder.status,
          order_type: 'delivery',
          customer_name: nombre,
          customer_phone: telefono,
          customer_email: correo,
          direccion: direccion,
          referencia: savedAddress?.referencia || null,
          lat: savedAddress?.lat || null,
          lng: savedAddress?.lng || null,
          delivery_fee: deliveryFee,
          subtotal: subtotal,
          total: total,
          metodo_pago: metodoPago,
          estimated_time: '50 - 60 min',
          legacy_id: orderId // Trazabilidad inmediata
        });

        if (!coreError) {
          // 3. Guardar items en tabla relacional (NUEVO CORE)
          const relationalItems = orderItems.map((item: any) => ({
            order_id: orderId,
            product_id: item.id && item.id.length > 20 ? item.id : null, // Ahora sí tiene ID
            name: item.name,
            price: item.unitPrice, // Cambiado de .price (undefined) a .unitPrice
            quantity: item.quantity,
            modifiers: item.options || {}
          }));
          const { error: itemsError } = await supabase.from('order_items').insert(relationalItems);
          if (itemsError) console.error('⚠️ Error en order_items core:', itemsError.message);
        } else {
          console.error('⚠️ Error en orders core:', coreError.message);
        }

      } catch (e) {
        console.error('❌ Error crítico en persistencia dual:', e);
      }

      // 2. Registrar como Lead (INDEPENDIENTE del pedido para que no se pierda)
      try {
        const { error: leadError } = await supabase.from('store_leads').insert({
          store_id: perfil.id,
          name: nombre,
          phone: telefono || null,
          email: correo || null,
          preference: 'Delivery Restaurante',
        });
        if (leadError) {
          console.error('Error guardando lead:', leadError.message, leadError.details, leadError.hint);
        } else {
          console.log('✅ Lead capturado correctamente:', nombre);
        }
      } catch (e) {
        console.error('Error crítico en lead:', e);
      }
     if (metodoPago === 'whatsapp') {
        let text = `*NUEVO PEDIDO: ${perfil.store_name}*%0A`
        text += `*ID:* ${orderId}%0A%0A`
        text += `*Cliente:* ${nombre}%0A`
        text += `*Teléfono:* ${telefono}%0A`
        text += `*Dirección:* ${direccion}%0A%0A`
        
        cart.forEach(item => {
          let itemModifiersPrice = 0;
          let optionsText = '';
          if (item.variantDetails?.options && item.product.variants) {
             const groups = item.product.variants as any[];
             Object.entries(item.variantDetails.options as Record<string, string[]>).forEach(([groupId, optionIds]) => {
                const group = groups.find(g => g.id === groupId);
                if (group && optionIds.length > 0) {
                   optionsText += `   _${group.name}:_%0A`;
                   optionIds.forEach(optId => {
                      const opt = group.options.find((o:any) => o.id === optId);
                      if (opt) {
                         itemModifiersPrice += opt.price_modifier;
                         optionsText += `   - ${opt.name}${opt.price_modifier > 0 ? ` (+S/ ${opt.price_modifier.toFixed(2)})` : ''}%0A`;
                      }
                   });
                }
             });
          }
          
          const unitPrice = item.product.price + itemModifiersPrice;
          text += `• ${item.quantity}x ${item.product.name} - S/ ${(unitPrice * item.quantity).toFixed(2)}%0A`
          if (optionsText) text += optionsText;
          if (item.variantDetails?.notes) text += `   _Nota: ${item.variantDetails.notes}_%0A`
        })
        
        text += `%0A*- Subtotal:* S/ ${subtotal.toFixed(2)}`
        text += `%0A*- Delivery:* S/ ${deliveryFee.toFixed(2)}`
        text += `%0A*TOTAL FINAL: S/ ${total.toFixed(2)}*%0A%0A`
        
        // Industry Standard Hack para Safari/iOS + Deep Links (WhatsApp)
        // 2. Ejecutamos la limpieza intensiva del estado Zustand (y forzamos variables globales)
        useCartStore.getState().clearCart(perfil.id)
        if ((perfil as any).slug) useCartStore.getState().clearCart((perfil as any).slug)
        const possibleUrlSlug = window.location.pathname.split('/').pop()
        if (possibleUrlSlug) useCartStore.getState().clearCart(possibleUrlSlug)
        
        // 3. Cerramos el checkout y abrimos historial en la ventana base
        if (onSuccess) {
            onSuccess();
        } else {
            handleClose();
        }

        // 4. Redirigimos clásicamente a WhatsApp en una NUEVA pestaña
        const waUrl = `https://wa.me/${perfil.whatsapp_phone || ''}?text=${text}`
        window.open(waUrl, '_blank')
     } else if (metodoPago === 'culqi') {
        // ── Flujo Culqi: crear orden en DB primero, luego abrir modal de pago ──
        const orderId = crypto.randomUUID();

        // Guardar orden como 'pending' en Supabase
        await supabase.from('orders').insert({
          id: orderId,
          merchant_id: perfil.id,
          store_id: perfil.id,
          customer_name: nombre,
          customer_phone: telefono,
          customer_address: direccion,
          total_amount: total,
          total: total,
          status: 'pending',
          payment_proof_url: 'CULQI_PENDING_WEBHOOK',
        });
        // Items
        const culqiItems = cart.map(item => ({
          order_id: orderId,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        }));
        await supabase.from('order_items').insert(culqiItems);

        setPendingOrderId(orderId);

        const win = window as any;
        if (!win.Culqi) {
          toast.error('El módulo de pago aún no ha cargado. Intenta de nuevo en unos segundos.');
          return;
        }
        win.Culqi.publicKey = perfil.culqi_public_key;
        win.Culqi.settings({
          title: perfil.store_name?.substring(0, 50) || 'Tienda',
          currency: 'PEN',
          amount: Math.round(total * 100),
        });
        win.Culqi.options({
          lang: 'es',
          installments: false,
          paymentMethods: { tarjeta: true, yape: true, bancaMovil: false }
        });
        win.Culqi.open();
     }
  }

  return (
    <>
    <Script src="https://checkout.culqi.com/js/v4" strategy="afterInteractive" />
    <div className="fixed inset-0 z-[120] bg-neutral-100/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-[#F8F9FA] w-full max-w-5xl rounded-xl shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-center relative py-5 border-b border-neutral-200 bg-white rounded-t-xl">
          <h2 className="font-bold text-lg text-[#333]">Detalles del pedido</h2>
          <button onClick={handleClose} className="absolute right-4 text-neutral-400 hover:text-black hover:bg-neutral-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            {/* DIRECCIÓN */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-[#333] mb-3">Dirección de entrega</h3>
               <div className="relative">
                 <div className="absolute left-3 top-0 bottom-0 flex items-center justify-center text-neutral-400">
                   <MapPin size={18} />
                 </div>
                 <input 
                   type="text" 
                   value={direccion}
                   onChange={e => setDireccion(e.target.value)}
                   className="w-full bg-white border border-neutral-300 h-12 rounded-md pl-10 pr-4 text-sm text-[#111] focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-neutral-400"
                   placeholder="Ej. Av. Javier Prado 1234, San Isidro"
                 />
               </div>
            </div>

            {/* HORARIO */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm relative overflow-hidden">
               <h3 className="font-bold text-[14px] text-[#333] mb-3">Horario de entrega</h3>
               <div className="flex items-center gap-3">
                 <label className={`flex items-center gap-2 text-sm ${isStoreClosed ? 'opacity-50' : 'cursor-pointer'}`}>
                   <input type="radio" checked={true} readOnly className="w-4 h-4 text-black accent-black focus:ring-black" disabled={isStoreClosed} />
                   <span className="font-bold text-[#333]">Entrega inmediata:</span>
                 </label>
                 {isStoreClosed ? (
                   <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> Tienda cerrada
                   </span>
                 ) : (
                   <span className="text-neutral-500 text-sm">~ 45 mins</span>
                 )}
               </div>
            </div>

            {/* PRODUCTOS */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm space-y-4">
               <h3 className="font-bold text-[14px] text-[#333]">Productos</h3>
               <div className="space-y-3">
                 {cart.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 py-3 border-b border-neutral-100 last:border-0 last:pb-0">
                       <div className="w-12 h-12 rounded-md bg-neutral-100 shrink-0 border border-neutral-200 overflow-hidden relative">
                         {item.product.image_url ? (
                            <img src={item.product.image_url} className="w-full h-full object-cover" />
                         ) : (
                            <Store className="w-full h-full p-3 text-neutral-300" />
                         )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start gap-2">
                           <p className="font-bold text-sm text-[#222]">{item.quantity} - {item.product.name}</p>
                           <p className="font-medium text-sm text-[#222] whitespace-nowrap">S/ {((item.product.price) * item.quantity).toFixed(2)}</p>
                         </div>
                         {/* Display modifiers summary */}
                         {(item.variantDetails?.options) && (
                            <div className="text-xs text-neutral-500 mt-1">
                              {Object.values(item.variantDetails.options).flat().length > 0 ? (
                                <span className="bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-sm inline-block">Ref: Adicionales elegidos</span>
                              ) : null}
                            </div>
                         )}
                       </div>
                    </div>
                 ))}
               </div>
            </div>

            {/* DATOS PERSONALES */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm space-y-4">
               <h3 className="font-bold text-[14px] text-[#333]">Datos personales</h3>
               <div className="space-y-3">
                 <div>
                   <label className="text-xs font-bold text-[#555]">* Nombre completo</label>
                   <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border border-neutral-300 rounded-md h-10 px-3 text-sm text-[#111] bg-white focus:border-black outline-none mt-1" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-[#555]">* Teléfono (WhatsApp)</label>
                   <div className="flex rounded-md border border-neutral-300 focus-within:border-black overflow-hidden mt-1 h-10">
                      <div className="bg-red-50 text-red-600 font-bold px-3 flex items-center justify-center border-r border-red-200 text-sm">
                         +51
                      </div>
                      <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className="flex-1 px-3 text-sm text-[#111] bg-white focus:outline-none" />
                   </div>
                   {!telefono && <p className="text-[10px] text-red-500 mt-1">Por favor, rellena Teléfono</p>}
                 </div>
                 <div>
                   <label className="text-xs font-bold text-[#555]">Correo electrónico (Opcional)</label>
                   <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full border border-neutral-300 rounded-md h-10 px-3 text-sm text-[#111] bg-white focus:border-black outline-none mt-1" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-[#555]">* Tipo de documento</label>
                   <select className="w-full border border-neutral-300 rounded-md h-10 px-3 text-sm text-[#111] focus:border-black outline-none mt-1 bg-white">
                      <option>Boleta simple</option>
                   </select>
                 </div>
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Payment Method */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-[#333] mb-3">Seleccione método de pago</h3>
               <div className="space-y-2">
                 <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${metodoPago === 'whatsapp' ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <input type="radio" name="pago" checked={metodoPago === 'whatsapp'} onChange={() => setMetodoPago('whatsapp')} className="w-4 h-4 text-black accent-black" />
                    <div className="w-8 h-8 rounded-full bg-green-100 flex flex-col items-center justify-center text-green-600 shrink-0"><MessageCircle size={16} /></div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#222]">Coordinar por WhatsApp</p>
                      <p className="text-[10px] text-[#888]">Pago manual contra entrega o Yape/Plin</p>
                    </div>
                 </label>
                 
                 {perfil.culqi_active && perfil.culqi_public_key && (
                 <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${metodoPago === 'culqi' ? 'border-black bg-neutral-50 shadow-sm' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <input type="radio" name="pago" checked={metodoPago === 'culqi'} onChange={() => setMetodoPago('culqi')} className="w-4 h-4 text-black accent-black" />
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex flex-col items-center justify-center text-emerald-600 shrink-0"><ShieldCheck size={16} /></div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#222]">Pago Seguro Online</p>
                      <p className="text-[10px] text-[#888]">Tarjeta crédito/débito o Yape (automático)</p>
                    </div>
                 </label>
                 )}
               </div>
            </div>

            {/* Resume */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-[#333] mb-4">Resumen de la compra</h3>
               <div className="space-y-2 text-sm text-[#666] pb-4 border-b border-neutral-100 mb-4">
                 <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>S/ {subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span>Envío</span>
                    <span>S/ {deliveryFee.toFixed(2)}</span>
                 </div>
               </div>
               <div className="flex justify-between font-bold text-[#111] text-lg">
                  <span>Total</span>
                  <span>S/ {total.toFixed(2)}</span>
               </div>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-[#333] mb-3">Términos y condiciones</h3>
               <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded text-black accent-black" />
                  <span className="text-sm text-[#555]">Acepto los <strong className="text-[#111]">términos y condiciones</strong> de compra.</span>
               </label>
            </div>

            {/* Submit */}
            <Button 
               onClick={handlePagar}
               disabled={isStoreClosed}
               className={`w-full rounded-full h-14 font-extrabold text-[15px] transition-transform ${isStoreClosed ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' : 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98]'}`}
            >
               Pagar
            </Button>

          </div>

        </div>
      </div>
    </div>
    </>
  )
}
