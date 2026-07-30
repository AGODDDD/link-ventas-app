'use client'

import React from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUpRight, Box, ShieldCheck, Truck } from 'lucide-react'
import { Product, Profile } from '@/types/tienda'
import ProductGrid from '@/components/tienda/ProductGrid'
import PaymentTrustBadges from './PaymentTrustBadges'

interface Props {
  perfil: Profile
  productos: Product[]
  extensionData?: { deliverySettings?: any; menuCategories?: any[] }
  isReadOnly?: boolean
}

export default function ComercioTemplate({ perfil, productos, isReadOnly }: Props) {
  return <main className="min-h-screen bg-[#FCFCFC] text-zinc-900">
    <section id="inicio" className="relative mx-auto max-w-[1440px] scroll-mt-24 overflow-hidden px-5 pb-16 pt-28 sm:px-8 lg:px-12 lg:pb-24 lg:pt-40">
      <div className="grid items-end gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400"><span className="h-px w-8 bg-zinc-900/30" />{isReadOnly ? 'Catálogo en pausa' : 'Comercio seleccionado'}</div>
          <h1 className="mt-8 max-w-4xl text-6xl font-semibold leading-[0.9] tracking-[-0.09em] sm:text-8xl lg:text-[9.5rem]">{perfil.store_name || 'Tu tienda'}<span className="text-zinc-300">.</span></h1>
          <p className="mt-8 max-w-md text-base leading-7 text-zinc-500 sm:text-lg">{perfil.description || 'Productos que resuelven. Compra rápido, recibe claro.'}</p>
          <a href="#catalogo" className="mt-10 inline-flex items-center gap-3 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-zinc-700 active:scale-95">Explorar catálogo <ArrowDown size={16} /></a>
        </div>
        <div className="relative min-h-[380px] overflow-hidden rounded-[2rem] bg-[#F3F1EC] lg:min-h-[540px]">
          {perfil.hero_image_url || perfil.banner_url ? <Image src={perfil.hero_image_url || perfil.banner_url || ''} alt="" fill priority className="object-cover transition-transform duration-700 hover:scale-[1.03]" sizes="(max-width: 1024px) 100vw, 45vw" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#ffffff_0,transparent_35%),linear-gradient(135deg,#ebe8e1,#f7f6f3)]" />}
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between rounded-2xl border border-white/50 bg-white/55 p-4 backdrop-blur-xl"><span className="max-w-[180px] text-xs leading-5 text-zinc-600">Una selección precisa para el día a día.</span><ArrowUpRight size={20} className="text-zinc-900" /></div>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-3 border-t border-zinc-900/10 pt-5 sm:grid-cols-3"><div className="flex items-center gap-3 text-sm text-zinc-600"><Box size={17} strokeWidth={1.4} />Compra directa, sin configuraciones</div><div className="flex items-center gap-3 text-sm text-zinc-600"><Truck size={17} strokeWidth={1.4} />Coordinamos la entrega contigo</div><div className="flex items-center gap-3 text-sm text-zinc-600"><ShieldCheck size={17} strokeWidth={1.4} />Pago y pedido acompañados</div></div>
    </section>
    <ProductGrid productos={productos} perfil={perfil} isReadOnly={isReadOnly} />
    <footer className="border-t border-zinc-900/10 px-5 py-16 sm:px-8 lg:px-12"><PaymentTrustBadges mercadopagoActive={perfil.mercadopago_active === true} className="mx-auto max-w-md text-zinc-900" /><p className="mt-8 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-400">© {new Date().getFullYear()} {perfil.store_name || 'Tienda'}. Todos los derechos reservados.</p></footer>
  </main>
}
