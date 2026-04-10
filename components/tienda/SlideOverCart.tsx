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
}

export default function SlideOverCart({ storeId, isOpen, onClose, onCheckout }: Props) {
  const router = useRouter()
  const cartStore = useCartStore()
  
  // To prevent hydration errors, we ensure store binds correctly
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
  const totalPrice = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)

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
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-background border-l border-outline shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline bg-surface-variant">
          <div className="flex items-center gap-3">
             <ShoppingBag className="text-primary" />
             <h2 className="font-headline font-black text-xl italic uppercase tracking-widest text-on-background">TU CARRITO</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded-full transition-colors group"
          >
            <X className="text-on-surface-variant group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
              <ShoppingBag size={64} className="mb-4 text-outline-variant" strokeWidth={1} />
              <p className="font-headline font-bold uppercase tracking-widest text-lg text-on-surface-variant">Tu carrito está vacío</p>
              <p className="font-body text-sm mt-2 text-on-surface-variant/70">Aprovecha nuestras ofertas y comienza a comprar.</p>
              <Button onClick={onClose} variant="outline" className="mt-8 rounded-none border-primary text-primary hover:bg-primary/10 font-headline font-bold uppercase tracking-widest">
                SEGUIR COMPRANDO
              </Button>
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
                        {item.product.brand && <p className="text-[10px] font-headline font-black uppercase text-on-surface-variant tracking-widest leading-none mb-1 truncate">{item.product.brand}</p>}
                        <h4 className="font-bold font-headline uppercase text-sm leading-tight line-clamp-2 text-on-background pr-6">{item.product.name}</h4>
                        {item.variantDetails && (
                          <div className="flex gap-2 mt-1">
                            {item.variantDetails.talla && <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded font-bold">Talla: {item.variantDetails.talla}</span>}
                            {item.variantDetails.color && <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded font-bold">Color: {item.variantDetails.color}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-black font-headline text-primary italic text-base md:text-lg">S/ {item.product.price.toFixed(2)}</span>
                        
                        {/* Quantity Controller */}
                        <div className="flex items-center gap-2 bg-surface-variant border border-outline px-2 py-1 ml-2 shrink-0">
                          <button onClick={() => handleUpdateQuantity(item.product.id, item.variantDetails, -1)} className="text-on-surface-variant hover:text-primary"><Minus size={14} /></button>
                          <span className="font-bold text-sm text-on-background w-4 text-center">{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.product.id, item.variantDetails, 1)} className="text-on-surface-variant hover:text-primary"><Plus size={14} /></button>
                        </div>
                      </div>
                   </div>
                   <button 
                     onClick={() => cartStore.removeFromCart(storeId, item.product.id, item.variantDetails)}
                     className="absolute top-2 right-2 bg-background border border-outline p-1.5 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error hover:text-white"
                   >
                     <X size={12} />
                   </button>
                </div>
             ))
          )}
        </div>

        {/* Footer Checkout */}
        {cart.length > 0 && (
          <div className="border-t border-primary/20 bg-surface-container-high p-6 space-y-4">
             <div className="flex justify-between text-on-surface-variant font-body">
                <span>SUBTOTAL ({totalItems} items)</span>
                <span>S/ {totalPrice.toFixed(2)}</span>
             </div>
             <div className="flex justify-between font-black font-headline text-2xl uppercase tracking-tighter italic text-on-background">
                <span>TOTAL</span>
                <span className="text-primary">S/ {totalPrice.toFixed(2)}</span>
             </div>
             <p className="text-[10px] uppercase font-label tracking-widest text-on-surface-variant text-center pb-2">Gastos de envío calculados en el checkout</p>
             <Button 
                onClick={handleCheckout}
                className="w-full rounded-none border-none bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-white h-14 font-headline font-black text-lg tracking-widest uppercase flex items-center justify-between px-6 transition-transform active:scale-[0.98]"
             >
                <span>PROCEDER AL PAGO</span>
                <ArrowRight />
             </Button>
          </div>
        )}
      </div>
    </>
  )
}
