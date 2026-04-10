'use client'

import React, { useState, useEffect } from 'react'
import { Profile } from '@/types/tienda'
import { X, MapPin, Store, CreditCard, MessageCircle, AlertCircle } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'

interface Props {
  isOpen: boolean;
  onClose: () => void;
  perfil: Profile;
}

export default function RestauranteCheckoutModal({ isOpen, onClose, perfil }: Props) {
  const cartStore = useCartStore()
  const cart = cartStore.carts[perfil.id] || []
  
  // Data State
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [metodoPago, setMetodoPago] = useState<'niubiz' | 'whatsapp'>('whatsapp')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  
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

  // Simple validation based on user constraints logic Phase 1 (Time logic mocked)
  const isStoreClosed = false; // Phase 2 logic will go here

  if (!isOpen) return null;

  const handlePagar = () => {
     if (!nombre || !telefono || !direccion || !acceptedTerms) {
        alert("Por favor completa los campos requeridos y acepta los términos.");
        return;
     }

     if (metodoPago === 'whatsapp') {
        let text = `*NUEVO PEDIDO: ${perfil.store_name}*%0A%0A`
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
        
        window.open(`https://wa.me/${perfil.whatsapp_phone || ''}?text=${text}`, '_blank')
     } else {
        alert("Pasarela Online (Niubiz) programada para conectarse en la Fase 2.");
     }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-neutral-100/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-[#F8F9FA] w-full max-w-5xl rounded-xl shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-center relative py-5 border-b border-neutral-200 bg-white rounded-t-xl">
          <h2 className="font-bold text-lg text-neutral-700">Detalles del pedido</h2>
          <button onClick={onClose} className="absolute right-4 text-neutral-400 hover:text-black hover:bg-neutral-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            {/* DIRECCIÓN */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-neutral-700 mb-3">Dirección de entrega</h3>
               <div className="relative">
                 <div className="absolute left-3 top-0 bottom-0 flex items-center justify-center text-neutral-400">
                   <MapPin size={18} />
                 </div>
                 <input 
                   type="text" 
                   value={direccion}
                   onChange={e => setDireccion(e.target.value)}
                   className="w-full bg-transparent border border-neutral-300 h-12 rounded-md pl-10 pr-4 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-neutral-400"
                   placeholder="Ej. Av. Javier Prado 1234, San Isidro"
                 />
               </div>
            </div>

            {/* HORARIO */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm relative overflow-hidden">
               <h3 className="font-bold text-[14px] text-neutral-700 mb-3">Horario de entrega</h3>
               <div className="flex items-center gap-3">
                 <label className={`flex items-center gap-2 text-sm ${isStoreClosed ? 'opacity-50' : 'cursor-pointer'}`}>
                   <input type="radio" checked={true} readOnly className="w-4 h-4 text-black accent-black focus:ring-black" disabled={isStoreClosed} />
                   <span className="font-bold text-neutral-700">Entrega inmediata:</span>
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
               <h3 className="font-bold text-[14px] text-neutral-700">Productos</h3>
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
                           <p className="font-bold text-sm text-neutral-700">{item.quantity} - {item.product.name}</p>
                           <p className="font-medium text-sm text-neutral-700 whitespace-nowrap">S/ {((item.product.price) * item.quantity).toFixed(2)}</p>
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
               <h3 className="font-bold text-[14px] text-neutral-700 font-headline">Datos personales</h3>
               <div className="space-y-3">
                 <div>
                   <label className="text-xs font-bold text-neutral-500">* Nombre completo</label>
                   <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border border-neutral-300 rounded-md h-10 px-3 text-sm focus:border-black outline-none mt-1" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-neutral-500">* Teléfono (WhatsApp)</label>
                   <div className="flex rounded-md border border-red-500 focus-within:border-black overflow-hidden mt-1 h-10">
                      <div className="bg-red-50 text-red-600 font-bold px-3 flex items-center justify-center border-r border-red-200 text-sm">
                         +51
                      </div>
                      <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className="flex-1 px-3 text-sm focus:outline-none" />
                   </div>
                   {!telefono && <p className="text-[10px] text-red-500 mt-1">Por favor, rellena Teléfono</p>}
                 </div>
                 <div>
                   <label className="text-xs font-bold text-neutral-500">Correo electrónico (Opcional)</label>
                   <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full border border-neutral-300 rounded-md h-10 px-3 text-sm focus:border-black outline-none mt-1" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-neutral-500">* Tipo de documento</label>
                   <select className="w-full border border-neutral-300 rounded-md h-10 px-3 text-sm focus:border-black outline-none mt-1 bg-white text-neutral-700">
                      <option>Boleta simple</option>
                      {/* Factura could be added here in phase 2 */}
                   </select>
                 </div>
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Payment Method */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-neutral-700 mb-3">Seleccione método de pago</h3>
               <div className="space-y-2">
                 <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${metodoPago === 'whatsapp' ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <input type="radio" name="pago" checked={metodoPago === 'whatsapp'} onChange={() => setMetodoPago('whatsapp')} className="w-4 h-4 text-black accent-black" />
                    <div className="w-8 h-8 rounded-full bg-green-100 flex flex-col items-center justify-center text-green-600 shrink-0"><MessageCircle size={16} /></div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-800">Coordinar por WhatsApp</p>
                      <p className="text-[10px] text-neutral-500">Pago manual contra entrega o Yape/Plin</p>
                    </div>
                 </label>
                 
                 <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${metodoPago === 'niubiz' ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <input type="radio" name="pago" checked={metodoPago === 'niubiz'} onChange={() => setMetodoPago('niubiz')} className="w-4 h-4 text-black accent-black" />
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex flex-col items-center justify-center text-blue-600 shrink-0"><CreditCard size={16} /></div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-800">Online - Niubiz</p>
                      <p className="text-[10px] text-neutral-500">Paga en línea con tarjeta crédito/débito</p>
                    </div>
                 </label>
               </div>
            </div>

            {/* Resume */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-neutral-700 mb-4">Resumen de la compra</h3>
               <div className="space-y-2 text-sm text-neutral-500 pb-4 border-b border-neutral-100 mb-4">
                 <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>S/ {subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span>Envío</span>
                    <span>S/ {deliveryFee.toFixed(2)}</span>
                 </div>
               </div>
               <div className="flex justify-between font-bold text-black text-lg">
                  <span>Total</span>
                  <span>S/ {total.toFixed(2)}</span>
               </div>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-lg p-5 border border-neutral-200 shadow-sm">
               <h3 className="font-bold text-[14px] text-neutral-700 mb-3">Términos y condiciones</h3>
               <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded text-black accent-black" />
                  <span className="text-sm text-neutral-600">Acepto los <strong className="text-black">términos y condiciones</strong> de compra.</span>
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
  )
}
