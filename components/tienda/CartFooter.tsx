'use client'

import React from 'react'
import { ShoppingCart } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/useCartStore'
import { Profile } from '@/types/tienda'

interface Props {
  perfil: Profile | null;
}

export default function CartFooter({ perfil }: Props) {
  const router = useRouter()
  const primaryColor = perfil?.primary_color || '#000000'
  const secondaryColor = perfil?.secondary_color || '#C31432'
  const storeId = perfil?.id || ''
  
  const totalItems = useCartStore(state => state.getTotalItems(storeId))
  const totalPrice = useCartStore(state => state.getTotalPrice(storeId))

  if (totalItems === 0) return null;

  return (
    <div id="cart-summary" className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 pb-8 md:pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-full"
            style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
          >
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Total ({totalItems} items)</p>
            <p
              className="text-3xl font-extrabold tracking-tight"
              style={{ color: primaryColor }}
            >
              S/ {totalPrice.toFixed(2)}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
          className="w-full sm:w-auto text-white px-12 rounded-full font-bold text-lg h-14 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-0"
          onClick={() => router.push(`/tienda/${storeId}/checkout`)}
        >
          Pagar Ahora ✨
        </Button>
      </div>
    </div>
  )
}
