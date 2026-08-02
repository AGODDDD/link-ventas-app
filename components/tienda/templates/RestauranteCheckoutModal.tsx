'use client'

import React, { useState, useEffect } from 'react'
import { Profile } from '@/types/tienda'
import { X, MapPin, Store, CreditCard, MessageCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useCustomerStore, Order } from '@/store/useCustomerStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { isStoreClosed as checkStoreClosed, shouldEnforceStoreSchedule } from '@/lib/storeSchedule'
import { toast } from 'sonner'
import { MercadoPagoCardPayment } from '@/components/payments/MercadoPagoCardPayment'

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  perfil: Profile;
  deliveryFee?: number;
  savedAddress?: { direccion: string; referencia: string; lat: number; lng: number } | null;
  profileData?: { nombre: string; telefono: string; correo: string };
  onProfileUpdate?: (data: { nombre: string; telefono: string; correo: string }) => void;
}

export default function RestauranteCheckoutModal({ isOpen, onClose, onSuccess, perfil, deliveryFee: configuredDeliveryFee = 0, savedAddress, profileData, onProfileUpdate }: Props) {
  const cartStore = useCartStore()
  const cart = cartStore.carts[perfil.id] || []
  
  // Data State — initialize from profile if available
  const [nombre, setNombre] = useState(profileData?.nombre || '')
  const [telefono, setTelefono] = useState(profileData?.telefono || '')
  const [correo, setCorreo] = useState(profileData?.correo || '')
  const [direccion, setDireccion] = useState(savedAddress?.direccion || '')
  const [metodoPago, setMetodoPago] = useState<'mercadopago' | 'whatsapp'>(perfil.mercadopago_active && perfil.mercadopago_public_key ? 'mercadopago' : 'whatsapp')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<{ orderId: string; legacyId: string; total: number } | null>(null)
  const operations = perfil.operations_config || {}
  const deliveryEnabled = operations.deliveryEnabled !== false
  const pickupEnabled = operations.pickupEnabled === true
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>(deliveryEnabled ? 'delivery' : 'pickup')

  // Sync data back to parent when closing
  const handleClose = () => {
    if (onProfileUpdate) {
      onProfileUpdate({ nombre, telefono, correo })
    }
    onClose()
  }
  
  // Derived amounts
  const deliveryFee = orderType === 'delivery' && Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee > 0 ? configuredDeliveryFee : 0;
  const subtotal = cartStore.getTotalPrice(perfil.id)
  const total = subtotal + deliveryFee

  // Block scroll on body
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // Estrategia Horaria: bloquear checkout si la tienda está cerrada
  const isStoreClosed = shouldEnforceStoreSchedule(operations.acceptsOrdersAlways)
    && checkStoreClosed(perfil.store_schedule ?? null)

  if (!isOpen) return null;

  const handlePagar = async () => {
     if (!deliveryEnabled && !pickupEnabled) {
        toast.error('El restaurante no está recibiendo pedidos en este momento.')
        return
     }
     if (!nombre || !telefono || (orderType === 'delivery' && !direccion) || !acceptedTerms) {
        toast.error('Completa los campos requeridos y acepta los términos.')
        return;
     }
     if (operations.minOrderAmount && subtotal < operations.minOrderAmount) {
        toast.error(`El pedido mínimo es S/ ${operations.minOrderAmount.toFixed(2)}.`)
        return;
     }
     if (metodoPago === 'mercadopago' && !/^\S+@\S+\.\S+$/.test(correo.trim())) {
        toast.error('Ingresa un correo válido para pagar con tarjeta.')
        return
     }
     const merchantWhatsapp = perfil.whatsapp_phone?.replace(/\D/g, '') || ''
     if (metodoPago === 'whatsapp' && !merchantWhatsapp) {
        toast.error('La tienda aún no configuró un número de WhatsApp para recibir pedidos.')
        return
     }

     // Sync profile data back
     if (onProfileUpdate) onProfileUpdate({ nombre, telefono, correo });

     const orderItems: any[] = cart.map(item => {
       let modPrice = 0;
       let optSummary = '';
       let modsList: any[] = [];
       if (item.variantDetails?.options && item.product.variants) {
         const groups = item.product.variants as any[];
         Object.entries(item.variantDetails.options as Record<string, string[]>).forEach(([gId, oIds]) => {
           const g = groups.find(x => x.id === gId);
           if (g) oIds.forEach(oId => {
             const o = g.options.find((x:any) => x.id === oId);
             if (o) { 
               modPrice += o.price_modifier; 
               optSummary += `${o.name}, `; 
               modsList.push({ name: o.name, price: o.price_modifier });
             }
           });
         });
       }
       return {
         id: item.product.id,
         name: item.product.name,
         quantity: item.quantity,
         unitPrice: item.product.price + modPrice,
         basePrice: item.product.price,
         modifiersList: modsList,
         totalPrice: (item.product.price + modPrice) * item.quantity,
         image_url: item.product.image_url || undefined,
         options: optSummary ? optSummary.slice(0, -2) : undefined,
         notes: item.variantDetails?.notes || undefined,
       };
     });

     const createOrderResponse = await fetch('/api/orders', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         store_id: perfil.id,
         order_type: orderType,
         payment_method: metodoPago,
         customer_name: nombre,
         customer_phone: telefono,
         customer_email: correo,
         address: orderType === 'delivery' ? direccion : perfil.store_address || 'Recojo en tienda',
         reference: savedAddress?.referencia || null,
         lat: savedAddress?.lat || null,
         lng: savedAddress?.lng || null,
         items: cart.map((item) => ({
           product_id: item.product.id,
           quantity: item.quantity,
           variant_details: item.variantDetails || null,
         })),
       }),
     });
     const createOrderData = await createOrderResponse.json();
     if (!createOrderResponse.ok || !createOrderData.order) {
       throw new Error(createOrderData.error || 'No se pudo crear el pedido.');
     }
     const persistedOrder = createOrderData.order;

      if (metodoPago === 'mercadopago') {
        setPendingPayment({ orderId: persistedOrder.order_id, legacyId: persistedOrder.legacy_id, total: Number(persistedOrder.total) })
        return;
      }

     const customerStore = useCustomerStore.getState();
     customerStore.addOrder({
       id: persistedOrder.legacy_id,
       coreId: persistedOrder.order_id,
       storeId: perfil.id,
       storeName: perfil.store_name || '',
       date: new Date().toISOString(),
       status: persistedOrder.status,
       items: orderItems,
       subtotal: Number(persistedOrder.subtotal),
       deliveryFee: Number(persistedOrder.delivery_fee),
       total: Number(persistedOrder.total),
       direccion: orderType === 'delivery' ? direccion : perfil.store_address || 'Recojo en tienda',
       referencia: savedAddress?.referencia,
       lat: savedAddress?.lat,
       lng: savedAddress?.lng,
       cliente: { nombre, telefono, correo },
       metodoPago,
       estimatedTime: '50 - 60 min',
     });

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
        text += `*ID:* ${persistedOrder.legacy_id}%0A%0A`
        text += `*Cliente:* ${nombre}%0A`
        text += `*Teléfono:* ${telefono}%0A`
        text += orderType === 'delivery'
          ? `*Dirección:* ${direccion}%0A%0A`
          : `*Modalidad:* Recojo en tienda%0A%0A`
        
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
        
        text += `%0A*- Subtotal:* S/ ${Number(persistedOrder.subtotal).toFixed(2)}`
        text += `%0A*- Delivery:* S/ ${Number(persistedOrder.delivery_fee).toFixed(2)}`
        text += `%0A*TOTAL FINAL: S/ ${Number(persistedOrder.total).toFixed(2)}*%0A%0A`
        
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

        // 4. Navegamos en la misma pestaña: los navegadores bloquean window.open
        // cuando se ejecuta después de esperar la creación asíncrona del pedido.
        const waUrl = `https://wa.me/${merchantWhatsapp}?text=${text}`
        window.location.assign(waUrl)
     }
  }

  return (
    <>
    {pendingPayment && perfil.mercadopago_public_key && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg bg-white p-6"><div className="mb-4 flex justify-between"><h3 className="font-bold">Pago seguro con Mercado Pago</h3><button onClick={() => setPendingPayment(null)}>Cerrar</button></div><MercadoPagoCardPayment publicKey={perfil.mercadopago_public_key} amount={pendingPayment.total} payerEmail={correo} onError={(message) => toast.error(message)} onSubmit={async (payment) => { const response = await fetch('/api/checkout/mercadopago', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payment, email: payment.payer?.email || correo, order_id: pendingPayment.orderId, store_id: perfil.id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo iniciar el pago.'); useCartStore.getState().clearCart(perfil.id); if ((perfil as any).slug) useCartStore.getState().clearCart((perfil as any).slug); setPendingPayment(null); toast.success('Pago recibido; confirmaremos tu pedido en breve.'); if (onSuccess) onSuccess(); else handleClose(); }} /></div></div>}
    <div className="fixed inset-0 z-[120] bg-neutral-100/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-[#F8F9FA] w-full max-w-5xl rounded-xl shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-center relative py-5 border-b border-neutral-200 bg-white rounded-t-xl">
          <h2 className="font-bold text-lg text-[#333]">Detalles del pedido</h2>
          <button onClick={handleClose} aria-label="Cerrar checkout" className="absolute right-4 text-neutral-400 hover:text-black hover:bg-neutral-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
              <h3 className="font-bold text-[14px] text-[#333] mb-3">¿Cómo recibirás tu pedido?</h3>
              <div className="grid grid-cols-2 gap-3">
                {deliveryEnabled && (
                  <button type="button" onClick={() => setOrderType('delivery')} className={`rounded-lg border p-3 text-sm font-bold ${orderType === 'delivery' ? 'border-black bg-black text-white' : 'border-neutral-200 text-neutral-700'}`}>
                    Delivery
                  </button>
                )}
                {pickupEnabled && (
                  <button type="button" onClick={() => setOrderType('pickup')} className={`rounded-lg border p-3 text-sm font-bold ${orderType === 'pickup' ? 'border-black bg-black text-white' : 'border-neutral-200 text-neutral-700'}`}>
                    Recojo
                  </button>
                )}
              </div>
            </div>
            
            {/* DIRECCIÓN */}
            {orderType === 'delivery' && <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
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
            </div>}

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
                 {cart.map((item, idx) => {
                     const modPriceLine = (() => {
                       let mp = 0;
                       if (item.variantDetails?.options && item.product.variants) {
                         const groups = item.product.variants as any[];
                         Object.entries(item.variantDetails.options as Record<string, string[]>).forEach(([gId, oIds]) => {
                           const g = groups.find(x => x.id === gId);
                           if (g) oIds.forEach(oId => {
                             const o = g.options.find((x:any) => x.id === oId);
                             if (o) mp += o.price_modifier;
                           });
                         });
                       }
                       return mp;
                     })();
                     return (
                    <div key={idx} className="flex gap-4 p-3 bg-white border border-neutral-100 rounded-xl shadow-sm">
                       <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-100">
                         {item.product.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                         ) : (
                            <Store className="w-full h-full p-3 text-neutral-300" />
                         )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start gap-2">
                           <p className="font-bold text-sm text-[#222]">{item.quantity} - {item.product.name}</p>
                           <p className="font-medium text-sm text-[#222] whitespace-nowrap">S/ {((item.product.price + modPriceLine) * item.quantity).toFixed(2)}</p>
                         </div>
                         {/* Display modifiers summary */}
                         {(item.variantDetails?.options) && (
                            <div className="text-xs text-neutral-500 mt-1">
                              {Object.values(item.variantDetails.options).flat().length > 0 ? (
                              <span className="bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-sm inline-block text-neutral-600 max-w-full truncate">
                                + Extras: {
                                  Object.entries(item.variantDetails.options as Record<string, string[]>).flatMap(([gId, oIds]) => {
                                    const g = item.product.variants?.find((v:any) => v.id === gId) as any;
                                    if (!g) return [];
                                    return oIds.map(oId => {
                                      const o = g.options.find((opt:any) => opt.id === oId);
                                      if (!o) return null;
                                      return o.price_modifier > 0 ? `${o.name} (+S/ ${o.price_modifier.toFixed(2)})` : o.name;
                                    }).filter(Boolean);
                                  }).join(', ')
                                }
                              </span>
                              ) : null}
                            </div>
                         )}
                         {/* Display customer notes */}
                         {item.variantDetails?.notes && (
                            <div className="text-xs text-amber-600 mt-1 italic flex items-center gap-1">
                               <span>📝</span>
                               <span>{item.variantDetails.notes}</span>
                            </div>
                         )}
                       </div>
                     </div>
                 )})}
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
                 
                 {perfil.mercadopago_active && perfil.mercadopago_public_key && (
                 <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${metodoPago === 'mercadopago' ? 'border-black bg-neutral-50 shadow-sm' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <input type="radio" name="pago" checked={metodoPago === 'mercadopago'} onChange={() => setMetodoPago('mercadopago')} className="w-4 h-4 text-black accent-black" />
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex flex-col items-center justify-center text-emerald-600 shrink-0"><ShieldCheck size={16} /></div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#222]">Mercado Pago</p>
                      <p className="text-[10px] text-[#888]">Tarjeta crédito o débito (automático)</p>
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
                    <span>{orderType === 'delivery' ? 'Envío' : 'Recojo'}</span>
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
               onClick={() => void handlePagar().catch((error) => {
                 console.error('Restaurant checkout failed:', error)
                 toast.error(error instanceof Error ? error.message : 'No se pudo crear el pedido.')
               })}
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
