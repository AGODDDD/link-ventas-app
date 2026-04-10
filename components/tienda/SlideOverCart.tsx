'use client'

import React, { useEffect } from 'react'
import { X, ShoppingBag, Plus, Minus, Store, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Props {
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
  onCheckout?: () => void;
  templateType?: string;
}

export default function SlideOverCart({ storeId, isOpen, onClose, onCheckout, templateType }: Props) {
  const router = useRouter()
  const cartStore = useCartStore()
  const isMinimalist = templateType === 'restaurante';
  
  // To prevent hydration errors, we ensure store binds correctly
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
  const totalPrice = cartStore.getTotalPrice(storeId)

  // Prevent scrolling when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const handleUpdateQuantity = (productId: string, variantDetails: any, delta: number) => {
    cartStore.updateQuantity(storeId, productId, variantDetails, delta)
  }

  const handleCheckout = () => {
    onClose();
    if (onCheckout) {
      onCheckout()
    } else {
      router.push(`/tienda/${storeId}/checkout`)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] ${isMinimalist ? 'bg-white border-neutral-200' : 'bg-background border-outline'} border-l shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isMinimalist ? 'border-neutral-100 bg-white' : 'border-outline bg-surface-variant'}`}>
          <div className="flex items-center gap-3">
             <ShoppingBag className={isMinimalist ? 'text-black' : 'text-primary'} />
             <h2 className={`font-headline font-black text-xl italic uppercase tracking-widest ${isMinimalist ? 'text-black' : 'text-on-background'}`}>TU CARRITO</h2>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors group ${isMinimalist ? 'hover:bg-neutral-100' : 'hover:bg-black/10'}`}
          >
            <X className={`transition-colors ${isMinimalist ? 'text-neutral-500 group-hover:text-black' : 'text-on-surface-variant group-hover:text-primary'}`} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
              <ShoppingBag size={64} className={`mb-4 ${isMinimalist ? 'text-neutral-300' : 'text-outline-variant'}`} strokeWidth={1} />
              <p className={`font-headline font-bold uppercase tracking-widest text-lg ${isMinimalist ? 'text-black' : 'text-on-surface-variant'}`}>Tu carrito está vacío</p>
              <p className={`font-body text-sm mt-2 ${isMinimalist ? 'text-neutral-500' : 'text-on-surface-variant/70'}`}>Aprovecha nuestras ofertas y comienza a comprar.</p>
              {isMinimalist ? (
                <button onClick={onClose} className="mt-8 px-6 py-3 rounded-full border border-neutral-300 bg-white text-[#333] text-sm font-bold hover:bg-neutral-50 transition-colors">
                  SEGUIR COMPRANDO
                </button>
              ) : (
                <Button onClick={onClose} variant="outline" className="mt-8 rounded-none font-headline font-bold uppercase tracking-widest border-primary text-primary hover:bg-primary/10">
                  SEGUIR COMPRANDO
                </Button>
              )}
            </div>
          ) : (
             cart.map((item, index) => (
                <div key={`${item.product.id}-${index}`} className="flex gap-4 bg-surface-container-low p-3 border border-outline relative group">
                   <div className="w-20 h-20 bg-black shrink-0 relative flex items-center justify-center">
                     {item.product.image_url ? (
                        <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover opacity-80" />
                     ) : (
                        <Store className="text-outline-variant" />
                     )}
                   </div>
                   <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                       <div>
                        {item.product.brand && <p className={`text-[10px] font-headline font-black uppercase tracking-widest leading-none mb-1 truncate ${isMinimalist ? 'text-neutral-500' : 'text-on-surface-variant'}`}>{item.product.brand}</p>}
                        <h4 className={`font-bold font-headline uppercase text-sm leading-tight line-clamp-2 pr-6 ${isMinimalist ? 'text-black' : 'text-on-background'}`}>{item.product.name}</h4>
                        {item.variantDetails && (
                          <div className="flex flex-col gap-1 mt-1 pb-1">
                        {item.variantDetails.talla && <span className="bg-slate-200 w-fit text-slate-800 text-[10px] px-2 py-0.5 rounded font-bold">Talla: {item.variantDetails.talla}</span>}
                        {item.variantDetails.color && <span className="bg-slate-200 w-fit text-slate-800 text-[10px] px-2 py-0.5 rounded font-bold">Color: {item.variantDetails.color}</span>}
                        {item.variantDetails.options && item.product.variants && (
                            <div className="flex flex-col gap-0.5 w-full text-[11px] text-neutral-500 mt-1">
                               {Object.entries(item.variantDetails.options as Record<string, string[]>).map(([groupId, optIds]) => {
                                  const group = (item.product.variants as any[]).find(g => g.id === groupId);
                                  if (!group || optIds.length === 0) return null;
                                  const selectedNames = optIds.map(optId => {
                                      const opt = group.options.find((o: any) => o.id === optId);
                                      if (!opt) return null;
                                      return opt.price_modifier > 0 ? `${opt.name} (+S/ ${opt.price_modifier})` : opt.name;
                                  }).filter(Boolean);
                                  return (
                                    <span key={groupId} className="leading-tight">
                                       <strong className="text-neutral-700">{group.name}:</strong> {selectedNames.join(', ')}
                                    </span>
                                  )
                               })}
                            </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`font-black font-headline italic text-base md:text-lg ${isMinimalist ? 'text-black' : 'text-primary'}`}>
                      S/ {(() => {
                         let itemModifiersPrice = 0;
                         if (item.variantDetails?.options && item.product.variants) {
                            const groups = item.product.variants as any[];
                            Object.entries(item.variantDetails.options as Record<string, string[]>).forEach(([groupId, optionIds]) => {
                               const group = groups.find(g => g.id === groupId);
                               if (group) {
                                  optionIds.forEach(optId => {
                                     const opt = group.options.find((o:any) => o.id === optId);
                                     if (opt) itemModifiersPrice += opt.price_modifier;
                                  });
                               }
                            });
                         }
                         return (item.product.price + itemModifiersPrice).toFixed(2);
                      })()}
                    </span>
                        
                        {/* Quantity Controller */}
                        <div className={`flex items-center gap-2 px-2 py-1 ml-2 shrink-0 ${isMinimalist ? 'bg-neutral-100 rounded-full border-transparent' : 'bg-surface-variant border border-outline'}`}>
                          <button onClick={() => handleUpdateQuantity(item.product.id, item.variantDetails, -1)} className={isMinimalist ? "text-neutral-500 hover:text-black" : "text-on-surface-variant hover:text-primary"}><Minus size={14} /></button>
                          <span className={`font-bold text-sm w-4 text-center ${isMinimalist ? 'text-black' : 'text-on-background'}`}>{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.product.id, item.variantDetails, 1)} className={isMinimalist ? "text-neutral-500 hover:text-black" : "text-on-surface-variant hover:text-primary"}><Plus size={14} /></button>
                        </div>
                      </div>
                   </div>
                   <button 
                     onClick={() => cartStore.removeFromCart(storeId, item.product.id, item.variantDetails)}
                     className={`absolute top-2 right-2 p-1.5 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error hover:text-white ${isMinimalist ? 'bg-white border shadow-sm border-neutral-200 text-neutral-500' : 'bg-background border border-outline'}`}
                   >
                     <X size={12} />
                   </button>
                </div>
             ))
          )}
        </div>

        {/* Footer Checkout */}
        {cart.length > 0 && (
          <div className={`p-6 ${isMinimalist ? 'border-t border-neutral-100 bg-white' : 'border-t border-primary/20 bg-surface-container-high'}`}>
            {isMinimalist ? (
               <div className="space-y-4">
                  <div className="space-y-2 text-[14px] text-neutral-500 font-medium font-body">
                     <div className="flex justify-between">
                        <span>Productos:</span>
                        <span>S/ {totalPrice.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Delivery:</span>
                        <span>S/ 8.00</span>
                     </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                     <span className="font-bold text-black text-lg">Total:</span>
                     <span className="font-bold text-black text-lg">S/ {(totalPrice + 8).toFixed(2)}</span>
                  </div>
                  <div className="grid gap-3 pt-2">
                     <Button 
                        onClick={handleCheckout}
                        className="w-full bg-black hover:bg-neutral-800 text-white rounded-full h-12 font-medium transition-transform active:scale-[0.98]"
                     >
                        Realizar el pedido
                     </Button>
                     <button 
                        onClick={onClose}
                        className="w-full border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 rounded-full h-12 font-medium text-sm transition-colors"
                     >
                        Seguir comprando
                     </button>
                  </div>
               </div>
            ) : (
               <div className="space-y-4">
                 <div className="flex justify-between font-body text-on-surface-variant">
                    <span>SUBTOTAL ({totalItems} items)</span>
                    <span>S/ {totalPrice.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between font-black font-headline text-2xl uppercase tracking-tighter italic text-on-background">
                    <span>TOTAL</span>
                    <span className="text-primary">S/ {totalPrice.toFixed(2)}</span>
                 </div>
                 <p className="text-[10px] uppercase font-label tracking-widest text-center pb-2 text-on-surface-variant">Gastos de envío calculados en el checkout</p>
                 <Button 
                    onClick={handleCheckout}
                    className="w-full border-none text-white h-14 font-headline font-black text-lg tracking-widest uppercase flex items-center justify-between px-6 transition-transform active:scale-[0.98] bg-gradient-to-r from-primary to-secondary hover:brightness-110 rounded-none"
                 >
                    <span>PROCEDER AL PAGO</span>
                    <ArrowRight />
                 </Button>
               </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
