'use client'

import Image from 'next/image'
import {
  ChevronRightIcon as AnimatedChevron,
  CreditCardIcon as AnimatedCard,
  HeadsetIcon as AnimatedHeadset,
  PackageOpenIcon as AnimatedPackage,
  ShieldCheckIcon as AnimatedShield,
} from '@animateicons/react/lucide'
import { Product, Profile } from '@/types/tienda'
import ComercioNavbar from '@/components/tienda/ComercioNavbar'
import ComercioHeroCarousel from '@/components/tienda/ComercioHeroCarousel'
import ProductGrid from '@/components/tienda/ProductGrid'
import PaymentTrustBadges from './PaymentTrustBadges'

interface Props {
  perfil: Profile
  productos: Product[]
  extensionData?: { deliverySettings?: unknown; menuCategories?: unknown[] }
  isReadOnly?: boolean
}

export default function ComercioTemplate({ perfil, productos, isReadOnly = false }: Props) {
  const storeName = perfil.store_name || 'Tu tienda'
  const categories = Array.from(new Set(productos.map((product) => product.category).filter(Boolean) as string[]))
  const brands = Array.from(new Set(productos.map((product) => product.brand).filter(Boolean) as string[]))
  const availableProducts = productos.filter((product) => product.stock == null || product.stock > 0).length
  const offers = productos.filter((product) => product.original_price && product.original_price > product.price).length

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] selection:bg-blue-200 selection:text-[#172033]">
      <ComercioNavbar storeId={perfil.id} storeName={storeName} avatarUrl={perfil.avatar_url} whatsappPhone={perfil.whatsapp_phone} categories={categories} />

      <main>
        <ComercioHeroCarousel perfil={perfil} productos={productos} isReadOnly={isReadOnly} />

        {brands.length > 0 && <section className="border-y border-zinc-200 bg-white"><div className="mx-auto flex max-w-[1480px] items-center gap-8 overflow-hidden px-6 py-7"><p className="relative z-10 shrink-0 bg-white pr-4 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">Marcas disponibles</p><div className="commerce-marquee min-w-0 flex-1 overflow-hidden"><div className="commerce-marquee-track flex w-max items-center gap-14 pr-14">{[...brands, ...brands, ...brands].map((brand, index) => <span key={`${brand}-${index}`} className="shrink-0 text-lg font-black uppercase tracking-[-0.04em] text-zinc-300 transition-colors hover:text-[#182331]">{brand}</span>)}</div></div></div></section>}

        <section className="border-b border-black/[0.07] bg-white"><div className="mx-auto grid max-w-[1480px] grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">{[
          [AnimatedPackage, 'Despacho coordinado', 'Seguimiento de tu pedido'],
          [AnimatedShield, 'Compra protegida', 'Stock validado en tiempo real'],
          [AnimatedCard, 'Pagos flexibles', 'Elige el método más conveniente'],
          [AnimatedHeadset, 'Atención directa', 'Soporte antes y después de comprar'],
        ].map(([Icon, title, copy], index) => { const ServiceIcon = Icon as typeof AnimatedPackage; return <div key={title as string} className={`flex items-center gap-3 border-slate-200 px-3 py-5 lg:px-6 ${index % 2 === 0 ? 'border-r' : ''} lg:border-r lg:last:border-r-0`}><ServiceIcon size={23} duration={0.55} className="shrink-0 text-[#2563EB]" /><div><p className="text-[11px] font-bold">{title as string}</p><p className="mt-0.5 text-[9px] text-zinc-400">{copy as string}</p></div></div> })}</div></section>

        <section className="border-y border-blue-100 bg-[#EDF4FF] text-[#172033]"><div className="mx-auto grid max-w-[1480px] grid-cols-2 divide-x divide-blue-200/60 px-4 sm:px-6 lg:grid-cols-[1.35fr_repeat(3,1fr)]"><div className="col-span-2 flex items-center gap-4 border-b border-blue-200/60 py-6 lg:col-span-1 lg:border-b-0 lg:pr-8"><span className="relative flex h-3 w-3 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB] opacity-30" /><span className="relative inline-flex h-3 w-3 rounded-full bg-[#2563EB]" /></span><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1D5ED8]">Catálogo operativo</p><p className="mt-1 text-xs text-slate-500">Información clara para decidir y comprar sin fricción.</p></div></div>{[[availableProducts, 'productos disponibles'], [brands.length, 'marcas en catálogo'], [offers, 'ofertas activas']].map(([value, label]) => <div key={label as string} className="px-5 py-6 lg:px-8"><strong className="block text-2xl font-black tracking-[-0.05em]">{value}</strong><span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.13em] text-slate-400">{label}</span></div>)}</div></section>

        <ProductGrid productos={productos} perfil={perfil} isReadOnly={isReadOnly} />

        {categories.length > 1 && <section id="ofertas" className="pb-16"><div className="mx-auto max-w-[1480px] px-4 sm:px-6"><div className="grid gap-4 lg:grid-cols-2">{categories.slice(0, 2).map((category, index) => { const product = productos.find((item) => item.category === category && item.image_url); return <a key={category} href="#catalogo" onClick={() => window.dispatchEvent(new CustomEvent('commerce-category', { detail: category }))} className={`group relative min-h-[270px] overflow-hidden rounded-2xl border p-8 text-[#172033] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(37,99,235,0.1)] ${index === 0 ? 'border-blue-100 bg-[#E8F0FF]' : 'border-slate-200 bg-[#ECEFF3]'}`}><div className="relative z-10 max-w-xs"><p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${index === 0 ? 'text-[#2563EB]' : 'text-zinc-500'}`}>Explora la colección</p><h2 className="mt-4 text-3xl font-black tracking-[-0.045em]">{category}</h2><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold">Ver productos <AnimatedChevron size={15} duration={0.45} /></span></div>{product?.image_url && <Image src={product.image_url} alt="" fill className="object-contain object-right p-6 pl-[45%] transition-transform duration-700 group-hover:scale-105" sizes="50vw" />}</a>})}</div></div></section>}
      </main>

      <footer id="pagos" className="bg-[#172033] text-white"><div className="mx-auto grid max-w-[1480px] gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4"><div><p className="text-xl font-black uppercase tracking-[-0.04em]">{storeName}</p><p className="mt-4 max-w-xs text-xs leading-6 text-white/45">Catálogo especializado, atención directa y productos con disponibilidad actualizada.</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">Categorías</p><div className="mt-4 grid gap-2">{categories.slice(0, 5).map((category) => <a key={category} href="#catalogo" className="text-xs text-white/50 transition-colors hover:text-white">{category}</a>)}</div></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">Información</p><div className="mt-4 grid gap-2 text-xs text-white/50"><span>Garantía de productos</span><span>Condiciones de entrega</span><span>Atención al cliente</span><span>Privacidad y seguridad</span></div></div><PaymentTrustBadges mercadopagoActive={perfil.mercadopago_active === true} className="text-white" /></div><div className="border-t border-white/10 px-6 py-5 text-center text-[9px] uppercase tracking-[0.14em] text-white/30">© {new Date().getFullYear()} {storeName}. Todos los derechos reservados.</div></footer>
    </div>
  )
}
