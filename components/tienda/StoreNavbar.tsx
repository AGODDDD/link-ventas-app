'use client'

import React from 'react'
import { ShoppingCart } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { Profile } from '@/types/tienda'

interface Props {
  perfil: Profile | null;
}

export default function StoreNavbar({ perfil }: Props) {
  const primaryColor = perfil?.primary_color || '#000000'
  const secondaryColor = perfil?.secondary_color || '#C31432'
  const storeId = perfil?.id || ''
  
  const totalItems = useCartStore(state => state.getTotalItems(storeId))

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-md supports-[backdrop-filter]:bg-opacity-80 text-white transition-colors duration-300"
      style={{
        backgroundColor: `${primaryColor}CC`
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {perfil?.avatar_url && (
              <img src={perfil.avatar_url} alt="Logo" className="h-9 w-9 rounded-full object-cover border-2 border-white/20" />
            )}
            <span className="text-xl font-bold tracking-tight text-white">
              {perfil?.store_name || 'Tienda'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:text-white/80 hover:bg-white/10"
                onClick={() => {
                  const cartSection = document.getElementById('cart-summary');
                  cartSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ShoppingCart size={22} strokeWidth={1.5} />
                {totalItems > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
