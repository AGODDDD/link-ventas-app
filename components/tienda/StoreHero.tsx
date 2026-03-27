'use client'

import React from 'react'
import { Store, Facebook, Instagram, Music2 } from 'lucide-react'
import { Profile } from '@/types/tienda'

interface Props {
  perfil: Profile | null;
}

export default function StoreHero({ perfil }: Props) {
  const primaryColor = perfil?.primary_color || '#000000'
  const secondaryColor = perfil?.secondary_color || '#C31432'

  return (
    <div
      className="relative border-b border-white/10 overflow-hidden"
      style={{
        background: perfil?.banner_url ? `url(${perfil.banner_url}) center/cover no-repeat` : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
      }}
    >
      {perfil?.banner_url && <div className="absolute inset-0 bg-black/50"></div>}

      <div className="relative max-w-7xl mx-auto py-20 px-4 sm:py-28 sm:px-6 lg:px-8 text-center text-white z-10">
        <div className="mx-auto h-28 w-28 rounded-full bg-white/10 p-1 shadow-2xl mb-8 flex items-center justify-center overflow-hidden backdrop-blur-sm border border-white/20">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} className="w-full h-full object-cover rounded-full" />
          ) : <Store className="text-white/80" size={48} />}
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl mb-6 drop-shadow-md">
          {perfil?.store_name || 'Bienvenido'}
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-white/90 font-light leading-relaxed drop-shadow-sm">
          {perfil?.description || 'Encuentra los mejores productos seleccionados especialmente para ti.'}
        </p>

        <div className="mt-8 flex justify-center gap-6">
          {perfil?.social_instagram && (
            <a href={`https://instagram.com/${perfil.social_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors bg-white/10 p-2.5 rounded-full hover:bg-white/20 backdrop-blur-sm">
              <Instagram size={28} />
            </a>
          )}
          {perfil?.social_facebook && (
            <a href={perfil.social_facebook} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors bg-white/10 p-2.5 rounded-full hover:bg-white/20 backdrop-blur-sm">
              <Facebook size={28} />
            </a>
          )}
          {perfil?.social_tiktok && (
            <a href={`https://tiktok.com/@${perfil.social_tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors bg-white/10 p-2.5 rounded-full hover:bg-white/20 backdrop-blur-sm">
              <Music2 size={28} />
            </a>
          )}
        </div>
      </div>

      {!perfil?.banner_url && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent opacity-10"></div>}
    </div>
  )
}
