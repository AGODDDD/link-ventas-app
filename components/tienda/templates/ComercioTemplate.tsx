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
  const featured = productos.find((product) => product.stock == null || product.stock > 0) || productos[0]
  const banner = perfil.banner_url || perfil.hero_image_url

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-[#182331] selection:bg-[#66D8BB] selection:text-[#182331]">
      <ComercioNavbar storeId={perfil.id} storeName={storeName} avatarUrl={perfil.avatar_url} whatsappPhone={perfil.whatsapp_phone} categories={categories} />

      <main>
        <section className="bg-white py-5">
          <div className="mx-auto max-w-[1480px] px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-xl bg-[#0d1725] shadow-[0_14px_45px_rgba(24,35,49,0.12)]">
              {banner ? <div className="relative aspect-[16/5] min-h-[230px] max-h-[470px]"><Image src={banner} alt={`Promociones de ${storeName}`} fill priority className="object-cover" sizes="100vw" /></div> : <div className="grid min-h-[340px] items-center lg:grid-cols-[1fr_0.9fr]"><div className="relative z-10 p-8 text-white sm:p-12 lg:p-16"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#66D8BB]">Tecnología y soluciones disponibles</p><h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl">{perfil.description || 'Todo para tu negocio, en un solo lugar.'}</h1><a href="#catalogo" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#66D8BB] px-5 py-3 text-xs font-bold text-[#182331] transition-all hover:bg-white active:scale-95">Comprar ahora <AnimatedChevron size={16} duration={0.45} /></a></div><div className="relative min-h-[300px] self-stretch">{featured?.image_url ? <Image src={featured.image_url} alt={featured.name} fill priority className="object-contain p-8 drop-shadow-[0_25px_40px_rgba(0,0,0,0.4)]" sizes="50vw" /> : <span className="flex h-full items-center justify-center text-white/15"><AnimatedPackage size={90} /></span>}<div className="absolute inset-0 bg-gradient-to-r from-[#0d1725] via-transparent to-transparent" /></div></div>}
              {isReadOnly && <div className="absolute inset-x-0 top-0 bg-amber-300 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-amber-950">Tienda temporalmente en mantenimiento</div>}
            </div>
          </div>
        </section>

        {brands.length > 0 && <section className="border-y border-zinc-200 bg-white"><div className="mx-auto flex max-w-[1480px] items-center gap-8 overflow-hidden px-6 py-7"><p className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">Marcas disponibles</p><div className="flex min-w-0 flex-1 items-center justify-around gap-10 overflow-x-auto [scrollbar-width:none]">{brands.slice(0, 12).map((brand) => <span key={brand} className="shrink-0 text-lg font-black uppercase tracking-[-0.04em] text-zinc-300 transition-colors hover:text-[#182331]">{brand}</span>)}</div></div></section>}

        <section className="border-b border-zinc-200 bg-white"><div className="mx-auto grid max-w-[1480px] grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">{[
          [AnimatedPackage, 'Despacho coordinado', 'Seguimiento de tu pedido'],
          [AnimatedShield, 'Compra protegida', 'Stock validado en tiempo real'],
          [AnimatedCard, 'Pagos flexibles', 'Elige el método más conveniente'],
          [AnimatedHeadset, 'Atención directa', 'Soporte antes y después de comprar'],
        ].map(([Icon, title, copy], index) => { const ServiceIcon = Icon as typeof AnimatedPackage; return <div key={title as string} className={`flex items-center gap-3 border-zinc-200 px-3 py-5 lg:px-6 ${index % 2 === 0 ? 'border-r' : ''} lg:border-r lg:last:border-r-0`}><ServiceIcon size={23} duration={0.55} className="shrink-0 text-[#45b99b]" /><div><p className="text-[11px] font-bold">{title as string}</p><p className="mt-0.5 text-[9px] text-zinc-400">{copy as string}</p></div></div> })}</div></section>

        <ProductGrid productos={productos} perfil={perfil} isReadOnly={isReadOnly} />

        {categories.length > 1 && <section id="ofertas" className="pb-16"><div className="mx-auto max-w-[1480px] px-4 sm:px-6"><div className="grid gap-4 lg:grid-cols-2">{categories.slice(0, 2).map((category, index) => { const product = productos.find((item) => item.category === category && item.image_url); return <a key={category} href="#catalogo" onClick={() => window.dispatchEvent(new CustomEvent('commerce-category', { detail: category }))} className={`group relative min-h-[270px] overflow-hidden rounded-xl p-8 ${index === 0 ? 'bg-[#182331] text-white' : 'bg-[#dce5e7] text-[#182331]'}`}><div className="relative z-10 max-w-xs"><p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${index === 0 ? 'text-[#66D8BB]' : 'text-zinc-500'}`}>Explora la colección</p><h2 className="mt-4 text-3xl font-black tracking-[-0.045em]">{category}</h2><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold">Ver productos <AnimatedChevron size={15} duration={0.45} /></span></div>{product?.image_url && <Image src={product.image_url} alt="" fill className="object-contain object-right p-6 pl-[45%] transition-transform duration-500 group-hover:scale-105" sizes="50vw" />}</a>})}</div></div></section>}
      </main>

      <footer id="pagos" className="bg-[#182331] text-white"><div className="mx-auto grid max-w-[1480px] gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4"><div><p className="text-xl font-black uppercase tracking-[-0.04em]">{storeName}</p><p className="mt-4 max-w-xs text-xs leading-6 text-white/45">Catálogo especializado, atención directa y productos con disponibilidad actualizada.</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#66D8BB]">Categorías</p><div className="mt-4 grid gap-2">{categories.slice(0, 5).map((category) => <a key={category} href="#catalogo" className="text-xs text-white/50 transition-colors hover:text-white">{category}</a>)}</div></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#66D8BB]">Información</p><div className="mt-4 grid gap-2 text-xs text-white/50"><span>Garantía de productos</span><span>Condiciones de entrega</span><span>Atención al cliente</span><span>Privacidad y seguridad</span></div></div><PaymentTrustBadges mercadopagoActive={perfil.mercadopago_active === true} className="text-white" /></div><div className="border-t border-white/10 px-6 py-5 text-center text-[9px] uppercase tracking-[0.14em] text-white/30">© {new Date().getFullYear()} {storeName}. Todos los derechos reservados.</div></footer>
    </div>
  )
}
