'use client'

import Image from 'next/image'
import {
  ChevronRightIcon as AnimatedChevron,
  PackageOpenIcon as AnimatedPackage,
  ShieldCheckIcon as AnimatedShield,
  ShoppingCartIcon as AnimatedCart,
  ZapIcon as AnimatedZap,
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

const money = (value: number) => `S/ ${value.toFixed(2)}`

export default function ComercioTemplate({ perfil, productos, isReadOnly = false }: Props) {
  const featured = productos.find((product) => product.stock == null || product.stock > 0) || productos[0]
  const heroImage = featured?.image_url || perfil.hero_image_url || perfil.banner_url
  const storeName = perfil.store_name || 'Tu tienda'

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-[#181A19] selection:bg-[#D7FF64] selection:text-[#181A19]">
      <ComercioNavbar storeId={perfil.id} storeName={storeName} avatarUrl={perfil.avatar_url} />

      <main>
        <section id="inicio" className="px-3 pb-3 pt-[5.75rem] sm:px-5 sm:pb-5 sm:pt-[6.25rem]">
          <div className="relative mx-auto min-h-[680px] max-w-[1480px] overflow-hidden rounded-[2rem] bg-[#171918] text-white sm:min-h-[720px] lg:min-h-[760px]">
            <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_75%_40%,rgba(215,255,100,0.13),transparent_33%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:auto,72px_72px,72px_72px]" />

            {heroImage && (
              <div className="absolute inset-x-0 bottom-12 top-[50%] lg:bottom-0 lg:left-[45%] lg:right-0 lg:top-0">
                <Image src={heroImage} alt={featured?.name || `Productos de ${storeName}`} fill priority className="object-contain object-center p-5 drop-shadow-[0_40px_55px_rgba(0,0,0,0.38)] transition-transform duration-700 hover:scale-[1.025] lg:p-16" sizes="(max-width: 1024px) 100vw, 55vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171918] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#171918] lg:via-transparent lg:to-transparent" />
              </div>
            )}

            <div className="relative z-10 flex min-h-[680px] flex-col justify-between p-7 sm:min-h-[720px] sm:p-10 lg:min-h-[760px] lg:w-[56%] lg:p-16">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                <span className={`h-2 w-2 rounded-full ${isReadOnly ? 'bg-amber-300' : 'bg-[#D7FF64]'}`} />
                {isReadOnly ? 'Catálogo temporalmente en pausa' : 'Compra directa · Stock actualizado'}
              </div>

              <div className="my-auto max-w-2xl py-16 lg:py-10">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#D7FF64]">{featured?.brand || 'Selección de la semana'}</p>
                <h1 className="text-5xl font-medium leading-[0.94] tracking-[-0.065em] sm:text-7xl lg:text-[5.8rem]">
                  {featured?.name || storeName}
                </h1>
                <p className="mt-6 max-w-lg text-sm leading-7 text-white/55 sm:text-base">{featured?.description || perfil.description || 'Productos confiables para trabajar, reparar y avanzar. Sin pasos innecesarios.'}</p>

                <div className="mt-9 flex items-center gap-3">
                  <a href="#catalogo" className="group inline-flex h-13 items-center gap-3 rounded-xl bg-[#D7FF64] px-5 text-sm font-semibold text-[#171918] transition-all duration-300 hover:bg-white active:scale-95">
                    <AnimatedCart size={19} duration={0.55} /> Ver productos
                    <AnimatedChevron size={16} duration={0.45} className="transition-transform group-hover:translate-x-0.5" />
                  </a>
                  {featured && <span className="hidden rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm font-medium text-white/80 backdrop-blur-xl sm:block">Desde {money(featured.price)}</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-white/10 bg-[#171918]/65 p-3 backdrop-blur-xl sm:rounded-2xl sm:bg-white/[0.045] sm:p-4"><AnimatedZap size={18} className="text-[#D7FF64] sm:h-5 sm:w-5" duration={0.55} /><p className="mt-3 text-[10px] font-semibold leading-4 sm:mt-4 sm:text-xs">Compra rápida</p><p className="mt-1 hidden text-[11px] leading-5 text-white/40 sm:block">Agrega y continúa. Sin variantes.</p></div>
                <div className="rounded-xl border border-white/10 bg-[#171918]/65 p-3 backdrop-blur-xl sm:rounded-2xl sm:bg-white/[0.045] sm:p-4"><AnimatedPackage size={18} className="text-[#D7FF64] sm:h-5 sm:w-5" duration={0.55} /><p className="mt-3 text-[10px] font-semibold leading-4 sm:mt-4 sm:text-xs">Stock visible</p><p className="mt-1 hidden text-[11px] leading-5 text-white/40 sm:block">Disponibilidad visible al instante.</p></div>
                <div className="rounded-xl border border-white/10 bg-[#171918]/65 p-3 backdrop-blur-xl sm:rounded-2xl sm:bg-white/[0.045] sm:p-4"><AnimatedShield size={18} className="text-[#D7FF64] sm:h-5 sm:w-5" duration={0.55} /><p className="mt-3 text-[10px] font-semibold leading-4 sm:mt-4 sm:text-xs">Pedido seguro</p><p className="mt-1 hidden text-[11px] leading-5 text-white/40 sm:block">Confirmación clara y segura.</p></div>
              </div>
            </div>
          </div>
        </section>

        <ProductGrid productos={productos} perfil={perfil} isReadOnly={isReadOnly} />

        <section id="servicio" className="px-3 pb-3 sm:px-5 sm:pb-5">
          <div className="mx-auto grid max-w-[1480px] overflow-hidden rounded-[2rem] bg-[#E9E9E3] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Diseñado para avanzar</p>
              <div className="mt-24 lg:mt-40"><h2 className="max-w-xl text-4xl font-medium leading-[1.02] tracking-[-0.055em] sm:text-6xl">Encuentra. Agrega. Recibe.</h2><p className="mt-6 max-w-md text-sm leading-7 text-zinc-500">Una experiencia de compra breve para productos que no necesitan explicaciones interminables.</p></div>
            </div>
            <div className="grid border-t border-zinc-900/10 lg:border-l lg:border-t-0">
              {[
                ['01', 'Elige el producto', 'Explora por categoría o utiliza la búsqueda precisa.'],
                ['02', 'Agrégalo al carrito', 'La cantidad respeta automáticamente el stock disponible.'],
                ['03', 'Confirma tu pedido', 'Completa tus datos y selecciona el medio de pago.'],
              ].map(([number, title, copy]) => <div key={number} className="group grid grid-cols-[44px_1fr_auto] items-center gap-5 border-b border-zinc-900/10 p-7 last:border-0 sm:p-10"><span className="text-xs font-semibold text-zinc-400">{number}</span><div><h3 className="text-base font-semibold tracking-[-0.025em]">{title}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{copy}</p></div><AnimatedChevron size={20} duration={0.45} className="text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-zinc-900" /></div>)}
            </div>
          </div>
        </section>
      </main>

      <footer id="contacto" className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-8 border-t border-zinc-900/10 pt-10 md:flex-row">
          <div><p className="text-lg font-semibold tracking-[-0.03em]">{storeName}</p><p className="mt-2 text-xs text-zinc-400">© {new Date().getFullYear()} · Comercio independiente</p></div>
          <PaymentTrustBadges mercadopagoActive={perfil.mercadopago_active === true} className="text-zinc-900" />
          <a href="#inicio" className="group inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-900">Volver arriba <AnimatedChevron size={15} duration={0.45} className="-rotate-90 transition-transform group-hover:-translate-y-0.5" /></a>
        </div>
      </footer>
    </div>
  )
}
