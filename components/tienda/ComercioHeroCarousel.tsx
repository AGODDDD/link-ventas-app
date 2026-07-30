'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeftIcon as AnimatedChevronLeft,
  ChevronRightIcon as AnimatedChevronRight,
  PackageOpenIcon as AnimatedPackage,
  PauseIcon as AnimatedPause,
  PlayIcon as AnimatedPlay,
} from '@animateicons/react/lucide'
import { Product, Profile } from '@/types/tienda'

type Props = {
  perfil: Profile
  productos: Product[]
  isReadOnly?: boolean
}

type Slide = {
  id: string
  image?: string
  fullBanner?: boolean
  eyebrow: string
  title: string
  copy?: string
  price?: number
}

export default function ComercioHeroCarousel({ perfil, productos, isReadOnly = false }: Props) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const storeName = perfil.store_name || 'Tu tienda'

  const slides = useMemo<Slide[]>(() => {
    const available = productos.filter((product) => (product.stock == null || product.stock > 0) && product.image_url)
    const result: Slide[] = []
    const banners = Array.from(new Set([perfil.banner_url, perfil.hero_image_url].filter(Boolean) as string[]))

    banners.forEach((image, index) => result.push({
      id: `banner-${index}`,
      image,
      fullBanner: true,
      eyebrow: 'Promoción destacada',
      title: storeName,
    }))

    available.slice(0, 4).forEach((product) => result.push({
      id: product.id,
      image: product.image_url,
      eyebrow: product.brand || product.category || 'Recién llegado',
      title: product.name,
      copy: product.description || 'Disponible para compra inmediata mientras dure el stock.',
      price: product.price,
    }))

    if (!result.length) result.push({ id: 'fallback', eyebrow: 'Catálogo disponible', title: perfil.description || 'Todo para tu negocio, en un solo lugar.' })
    return result
  }, [perfil.banner_url, perfil.description, perfil.hero_image_url, productos, storeName])

  useEffect(() => {
    if (paused || slides.length < 2) return
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5200)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  const move = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length)

  return (
    <section className="bg-white py-5">
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6">
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="group relative min-h-[250px] overflow-hidden rounded-xl bg-[#0d1725] shadow-[0_14px_45px_rgba(24,35,49,0.12)] sm:min-h-[330px] lg:min-h-[410px]">
          <div data-commerce-hero-track className="flex h-full min-h-[250px] transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)] sm:min-h-[330px] lg:min-h-[410px]" style={{ transform: `translate3d(-${active * 100}%,0,0)` }}>
            {slides.map((slide, index) => <article key={slide.id} className="relative min-w-full overflow-hidden">
              {slide.fullBanner && slide.image ? <Image src={slide.image} alt={`Promoción de ${storeName}`} fill priority={index === 0} className="object-cover" sizes="100vw" /> : <div className="grid h-full min-h-[250px] items-center lg:grid-cols-[1fr_0.9fr]">
                <div className="relative z-10 p-7 text-white sm:p-10 lg:p-16"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#66D8BB]">{slide.eyebrow}</p><h1 className="mt-4 max-w-2xl text-3xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-6xl">{slide.title}</h1>{slide.copy && <p className="mt-4 line-clamp-2 max-w-lg text-xs leading-6 text-white/55 sm:text-sm">{slide.copy}</p>}<div className="mt-6 flex items-center gap-3"><a href="#catalogo" className="inline-flex items-center gap-2 rounded-lg bg-[#66D8BB] px-5 py-3 text-xs font-bold text-[#182331] transition-all hover:bg-white active:scale-95">Comprar ahora <AnimatedChevronRight size={15} duration={0.45} /></a>{slide.price != null && <span className="text-sm font-black text-white">S/ {slide.price.toFixed(2)}</span>}</div></div>
                <div className="absolute inset-y-0 right-0 w-[52%] lg:relative lg:h-full lg:w-auto">{slide.image ? <Image src={slide.image} alt={slide.title} fill priority={index === 0} className="object-contain p-5 opacity-35 drop-shadow-[0_25px_40px_rgba(0,0,0,0.4)] sm:opacity-70 lg:p-10 lg:opacity-100" sizes="50vw" /> : <span className="flex h-full items-center justify-center text-white/10"><AnimatedPackage size={90} /></span>}<div className="absolute inset-0 bg-gradient-to-r from-[#0d1725] via-[#0d1725]/20 to-transparent" /></div>
              </div>}
              {slide.fullBanner && <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />}
            </article>)}
          </div>

          {slides.length > 1 && <><button type="button" onClick={() => move(-1)} aria-label="Promoción anterior" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d1725]/60 text-white opacity-0 backdrop-blur-xl transition-all hover:bg-white hover:text-[#182331] active:scale-95 group-hover:opacity-100 sm:left-5"><AnimatedChevronLeft size={18} duration={0.45} /></button><button type="button" onClick={() => move(1)} aria-label="Promoción siguiente" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d1725]/60 text-white opacity-0 backdrop-blur-xl transition-all hover:bg-white hover:text-[#182331] active:scale-95 group-hover:opacity-100 sm:right-5"><AnimatedChevronRight size={18} duration={0.45} /></button>
            <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2"><div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0d1725]/55 px-3 py-2 backdrop-blur-xl">{slides.map((slide, index) => <button key={slide.id} type="button" onClick={() => setActive(index)} aria-label={`Ver promoción ${index + 1}`} className={`h-1.5 rounded-full transition-all duration-500 ${active === index ? 'w-7 bg-[#66D8BB]' : 'w-1.5 bg-white/40 hover:bg-white'}`} />)}<button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Reanudar carrusel' : 'Pausar carrusel'} className="ml-1 text-white/65 transition-colors hover:text-white">{paused ? <AnimatedPlay size={12} duration={0.4} /> : <AnimatedPause size={12} duration={0.4} />}</button></div></div></>}
          {isReadOnly && <div className="absolute inset-x-0 top-0 bg-amber-300 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-amber-950">Tienda temporalmente en mantenimiento</div>}
        </div>
      </div>
    </section>
  )
}
