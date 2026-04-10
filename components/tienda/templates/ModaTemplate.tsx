import React from 'react'
import Image from 'next/image'
import { Profile, Product } from '@/types/tienda'
import ClientCatalog from '@/components/tienda/ClientCatalog'

interface Props {
  perfil: Profile;
  productos: Product[];
}

export default function ModaTemplate({ perfil, productos }: Props) {
  return (
    <main className="min-h-screen bg-background text-on-background font-sans pt-20">
      {/* Editorial Hero */}
      <div className="relative w-full h-[60vh] md:h-[80vh] bg-stone-200 overflow-hidden">
        <Image 
          src={perfil.banner_url || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2670&auto=format&fit=crop"} 
          alt={perfil.store_name || "Moda"} 
          fill 
          priority
          className="object-cover object-center brightness-[0.85] transform scale-105"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white bg-black/10">
          <h1 className="text-5xl md:text-8xl font-light tracking-[0.2em] uppercase mb-6 drop-shadow-md">
            {perfil.store_name}
          </h1>
          <p className="text-xs md:text-sm tracking-[0.3em] uppercase max-w-xl mx-auto drop-shadow-md font-medium text-white/90">
            {perfil.description || "Nueva Colección Exclusiva"}
          </p>
          <a href="#catalogo" className="mt-12 px-8 py-3 border border-primary bg-primary/20 text-white hover:bg-primary hover:text-black transition-colors uppercase tracking-[0.2em] text-xs font-semibold backdrop-blur-sm">
            DESCUBRIR
          </a>
        </div>
      </div>

      <div id="catalogo" className="scroll-mt-20">
         {/* We reuse ClientCatalog but pass isModa to render ModaProductCard */}
         <ClientCatalog initialProducts={productos} perfil={perfil} isModa={true} />
      </div>
    </main>
  )
}
