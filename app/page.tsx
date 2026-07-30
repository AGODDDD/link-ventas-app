'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowUpRight, BarChart3, Check, ChevronDown, Clock3, CreditCard, Globe2,
  LayoutDashboard, Menu, MessageCircle, PanelTop, ShieldCheck, ShoppingBag,
  TrendingUp, X,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const navLinks = [['#product', 'Producto'], ['#workflow', 'Cómo funciona'], ['#pricing', 'Precios'], ['#faq', 'Preguntas']]

const faqs = [
  ['¿Necesito una app para empezar?', 'No. Tu catálogo vive en un link y tus clientes compran desde cualquier navegador, sin descargas ni registros obligatorios.'],
  ['¿Puedo cobrar con tarjeta?', 'Sí. Conecta Mercado Pago para recibir pagos seguros y ver la confirmación dentro del mismo pedido.'],
  ['¿Hay comisiones por venta?', 'No cobramos comisión sobre tus ventas. El plan Pro tiene un precio fijo mensual y puedes cancelarlo cuando quieras.'],
  ['¿Puedo imprimir tickets?', 'Sí. Genera tickets PDF de 80 mm listos para impresoras térmicas con un solo clic desde el panel.'],
]

const orders = [
  { id: '#1048', name: 'Combo familiar BBQ', amount: 'S/ 64.00', time: 'Hace 2 min', color: 'bg-amber-500' },
  { id: '#1047', name: 'Pizza Margarita x2', amount: 'S/ 48.00', time: 'Hace 7 min', color: 'bg-sky-500' },
  { id: '#1046', name: 'Lomo saltado', amount: 'S/ 32.00', time: 'Hace 12 min', color: 'bg-emerald-500' },
]

export default function LandingPage() {
  const router = useRouter()
  const page = useRef<main>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [orderCount, setOrderCount] = useState(150)

  useEffect(() => {
    void import('@/lib/supabase').then(({ supabase }) => supabase.auth.getSession()).then(({ data }) => {
      if (data.session) router.push('/dashboard')
    }).catch(() => undefined)
  }, [router])

  useLayoutEffect(() => {
    const scope = page.current
    if (!scope) return
    const ctx = gsap.context(() => {
      gsap.from('.hero-reveal', { y: 34, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.15 })
      gsap.from('.hero-product', { y: 55, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.42 })
      gsap.utils.toArray<HTMLElement>('.scroll-reveal').forEach((element) => {
        gsap.from(element, {
          y: 50, opacity: 0, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 84%', once: true },
        })
      })
    }, scope)
    return () => ctx.revert()
  }, [])

  const platformFees = orderCount * 45 * 0.2
  const savings = Math.max(platformFees - 29, 0)

  return (
    <main ref={page} className="min-h-screen overflow-hidden bg-[#FCFCFC] text-zinc-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/50 bg-[#FCFCFC]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3 text-[17px] font-semibold tracking-[-0.03em]">
            <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-[11px] font-bold tracking-[-0.08em] text-white">LV</span>
            Link Ventas
          </Link>
          <nav className="hidden items-center gap-9 md:flex">
            {navLinks.map(([href, label]) => <a key={href} href={href} className="text-[13px] font-medium text-zinc-500 transition-colors duration-300 hover:text-zinc-900">{label}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="rounded-full px-4 py-2.5 text-[13px] font-medium text-zinc-600 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-900">Ingresar</Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(24,24,27,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-700 active:scale-95">Probar gratis <ArrowUpRight size={15} strokeWidth={1.5} /></Link>
          </div>
          <button aria-label="Abrir menú" className="rounded-full p-2 transition hover:bg-zinc-100 md:hidden" onClick={() => setMobileMenuOpen(value => !value)}>{mobileMenuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}</button>
        </div>
        {mobileMenuOpen && <div className="border-t border-zinc-200/60 bg-[#FCFCFC] px-6 py-5 md:hidden"><nav className="flex flex-col gap-4">{navLinks.map(([href, label]) => <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="text-sm text-zinc-600">{label}</a>)}</nav><Link href="/login" className="mt-5 flex justify-center rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white">Probar gratis</Link></div>}
      </header>

      <section className="relative px-6 pb-20 pt-40 sm:pt-48 lg:px-10 lg:pb-32 lg:pt-52">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-5xl">
            <div className="hero-reveal mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 shadow-[0_5px_18px_rgba(24,24,27,0.04)]"><span className="size-1.5 rounded-full bg-emerald-500" /> Operaciones comerciales, simplificadas</div>
            <h1 className="hero-reveal max-w-5xl text-[clamp(3.3rem,8.2vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.075em] text-zinc-950">Vende más.<br /><span className="text-zinc-400">Administra mejor.</span></h1>
            <div className="mt-9 flex max-w-2xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
              <p className="hero-reveal max-w-lg text-[17px] leading-8 text-zinc-500">El sistema operativo para negocios que quieren convertir cada pedido en una experiencia impecable.</p>
              <div className="hero-reveal flex shrink-0 items-center gap-3"><Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(24,24,27,0.16)] transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-700 active:scale-95">Crear mi panel <ArrowUpRight size={17} strokeWidth={1.5} /></Link><a href="#product" className="rounded-full border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 transition-all duration-300 hover:border-zinc-500 hover:bg-zinc-50">Conoce la plataforma</a></div>
            </div>
          </div>

          <div className="hero-product mt-20 rounded-[2rem] border border-zinc-200/80 bg-white p-2 shadow-[0_30px_80px_rgba(24,24,27,0.09)] sm:p-3 lg:mt-28">
            <DashboardPreview />
          </div>
          <div className="hero-reveal mt-8 grid grid-cols-2 gap-8 border-t border-zinc-200/70 pt-7 sm:grid-cols-4 lg:gap-4">
            {[['+2,400', 'comercios activos'], ['S/ 0', 'comisión por venta'], ['24/7', 'operación disponible'], ['1 link', 'para vender online']].map(([value, label]) => <div key={label}><p className="text-2xl font-semibold tracking-[-0.06em] text-zinc-900 lg:text-3xl">{value}</p><p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-zinc-400">{label}</p></div>)}
          </div>
        </div>
      </section>

      <section id="product" className="bg-zinc-50 px-6 py-24 lg:px-10 lg:py-36">
        <div className="mx-auto max-w-[1440px]">
          <div className="scroll-reveal mb-16 flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Una vista para todo</p><h2 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl">La claridad también<br /><span className="text-zinc-400">se puede diseñar.</span></h2></div><p className="max-w-sm text-[15px] leading-7 text-zinc-500">Pedidos, catálogo, pagos y clientes en un espacio que tu equipo entiende desde el primer día.</p></div>
          <div className="grid auto-rows-[minmax(260px,auto)] gap-5 lg:grid-cols-12">
            <FeatureCard className="lg:col-span-7" icon={<LayoutDashboard size={21} strokeWidth={1.5} />} eyebrow="Control central" title="Todo lo que pasa, en una sola vista." description="Un pipeline claro para saber qué necesita atención, qué está listo y qué ya salió." visual={<MiniKanban />} />
            <FeatureCard className="lg:col-span-5" icon={<ShoppingBag size={21} strokeWidth={1.5} />} eyebrow="Tu tienda, tu identidad" title="Un catálogo que se siente tuyo." description="Publica productos y comparte tu link sin depender de marketplaces." visual={<CatalogVisual />} />
            <FeatureCard className="lg:col-span-5" icon={<BarChart3 size={21} strokeWidth={1.5} />} eyebrow="Decisiones con contexto" title="Entiende qué mueve tu negocio." description="Métricas simples para tomar decisiones con seguridad." visual={<ChartVisual />} />
            <FeatureCard className="lg:col-span-7" icon={<MessageCircle size={21} strokeWidth={1.5} />} eyebrow="Comunicación automática" title="Cada cliente sabe qué sigue." description="Actualiza estados y genera confianza sin escribir el mismo mensaje dos veces." visual={<MessageVisual />} />
          </div>
        </div>
      </section>

      <section id="workflow" className="px-6 py-24 lg:px-10 lg:py-40"><div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24"><div className="scroll-reveal self-start lg:sticky lg:top-32"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Flujo sin fricción</p><h2 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl">Del primer clic<br /><span className="text-zinc-400">a la entrega.</span></h2><p className="mt-7 max-w-sm text-[15px] leading-7 text-zinc-500">Diseñado para que puedas moverte rápido, mantener el control y dedicar tu tiempo a lo que realmente hace crecer el negocio.</p><Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-8 transition hover:decoration-zinc-900">Ver el panel en acción <ArrowUpRight size={16} strokeWidth={1.5} /></Link></div><div className="space-y-8"><WorkflowStep number="01" icon={<ShoppingBag size={22} strokeWidth={1.5} />} title="Publica tu catálogo" text="Carga tus productos, define precios y comparte un link que funciona en cualquier dispositivo." visual={<CatalogVisual large />} /><WorkflowStep number="02" icon={<PanelTop size={22} strokeWidth={1.5} />} title="Ordena tu operación" text="Cada pedido llega al pipeline correcto, con la información que tu equipo necesita." visual={<MiniKanban large />} /><WorkflowStep number="03" icon={<CreditCard size={22} strokeWidth={1.5} />} title="Cobra y mantén informado" text="Confirma pagos, imprime tickets y avisa a tus clientes desde el mismo lugar." visual={<MessageVisual large />} /></div></div></section>

      <section id="calculator" className="bg-zinc-900 px-6 py-24 text-white lg:px-10 lg:py-36"><div className="mx-auto max-w-[1100px]"><div className="scroll-reveal mb-14 max-w-3xl"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Calculadora de ahorro</p><h2 className="text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl">Tu margen merece<br /><span className="text-zinc-500">quedarse contigo.</span></h2></div><div className="scroll-reveal rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10"><div className="flex items-end justify-between gap-4"><label htmlFor="orders" className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Pedidos al mes</label><span className="text-4xl font-semibold tracking-[-0.06em]">{orderCount}</span></div><input id="orders" type="range" min="10" max="1000" step="10" value={orderCount} onChange={event => setOrderCount(Number(event.target.value))} className="mt-8 w-full accent-white" /><div className="mt-2 flex justify-between text-xs text-zinc-500"><span>10</span><span>1,000</span></div><div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-sm text-zinc-400">Comisión de terceros</p><p className="mt-3 text-3xl font-semibold tracking-[-0.06em]">S/ {platformFees.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</p><p className="mt-2 text-xs text-zinc-500">20% que deja de estar en tu margen</p></div><div className="rounded-2xl border border-white/10 bg-white p-6 text-zinc-900"><p className="text-sm text-zinc-500">Con Link Ventas Pro</p><p className="mt-3 text-3xl font-semibold tracking-[-0.06em]">S/ 29</p><p className="mt-2 text-xs text-zinc-500">Precio fijo · 0% de comisión</p></div></div><div className="mt-4 flex flex-col justify-between gap-3 border-t border-white/10 pt-7 sm:flex-row sm:items-end"><div><p className="text-sm text-zinc-400">Ahorro estimado mensual</p><p className="mt-1 text-5xl font-semibold tracking-[-0.07em]">S/ {savings.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</p></div><p className="max-w-xs text-sm leading-6 text-zinc-500 sm:text-right">Más margen para invertir en tu producto, tu equipo y tus próximos pedidos.</p></div></div></div></section>

      <section id="pricing" className="px-6 py-24 lg:px-10 lg:py-36"><div className="mx-auto max-w-[1100px]"><div className="scroll-reveal mb-14 text-center"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Precios claros</p><h2 className="text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl">Empieza simple.<br /><span className="text-zinc-400">Escala cuando quieras.</span></h2></div><div className="grid gap-5 md:grid-cols-2"><PlanCard title="Emprendedor" price="0" description="Para empezar a vender sin invertir un sol." features={['Catálogo digital público', 'Pedidos ilimitados', 'Panel de control básico', '0% de comisiones']} /><PlanCard title="Pro" price="29" description="Para equipos que quieren operar con más velocidad." featured features={['Todo lo del plan Emprendedor', 'Mercado Pago integrado', 'Tickets PDF térmicos', 'Analíticas avanzadas']} /></div><p className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-400"><ShieldCheck size={16} strokeWidth={1.5} /> Sin permanencia. Cancela cuando quieras.</p></div></section>

      <section id="faq" className="bg-zinc-50 px-6 py-24 lg:px-10 lg:py-36"><div className="mx-auto max-w-[900px]"><div className="scroll-reveal mb-14"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Preguntas frecuentes</p><h2 className="text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl">Lo importante,<br /><span className="text-zinc-400">sin letra pequeña.</span></h2></div><div className="scroll-reveal divide-y divide-zinc-200 border-y border-zinc-200">{faqs.map(([question, answer], index) => { const isOpen = openFaq === index; return <div key={question}><button className="flex w-full items-center justify-between gap-6 py-6 text-left" onClick={() => setOpenFaq(isOpen ? -1 : index)}><span className="text-[17px] font-medium tracking-[-0.02em]">{question}</span><span className={`flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 transition-all duration-300 ${isOpen ? 'rotate-180 bg-zinc-900 text-white' : 'text-zinc-500'}`}><ChevronDown size={16} strokeWidth={1.5} /></span></button>{isOpen && <p className="max-w-2xl pb-6 pr-12 text-sm leading-7 text-zinc-500">{answer}</p>}</div>})}</div></div></section>

      <section className="px-6 py-28 lg:px-10 lg:py-40"><div className="scroll-reveal mx-auto max-w-[1100px] rounded-[2rem] bg-zinc-100 px-7 py-16 text-center sm:px-12"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Tu próximo pedido empieza aquí</p><h2 className="mx-auto max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.07em] sm:text-7xl">Una operación más clara<br /><span className="text-zinc-400">está a un link de distancia.</span></h2><Link href="/login" className="mt-9 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-4 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(24,24,27,0.14)] transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-700 active:scale-95">Crear mi panel gratis <ArrowUpRight size={17} strokeWidth={1.5} /></Link></div></section>

      <footer className="border-t border-zinc-200/70 px-6 py-10 lg:px-10"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 sm:flex-row sm:items-center"><Link href="/" className="flex items-center gap-3 text-sm font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-[10px] font-bold text-white">LV</span> Link Ventas</Link><div className="flex items-center gap-5 text-xs text-zinc-400"><span className="flex items-center gap-1.5"><Globe2 size={14} strokeWidth={1.5} /> Perú · PEN</span><span>© 2026 Link Ventas</span></div></div></footer>
    </main>
  )
}

function DashboardPreview() {
  return <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-[#F7F7F5] text-zinc-900"><div className="flex items-center justify-between border-b border-zinc-200/80 bg-white px-5 py-4"><div className="flex items-center gap-3"><span className="size-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold tracking-[-0.01em]">Panel de pedidos</span></div><div className="hidden items-center gap-5 text-[11px] text-zinc-400 sm:flex"><span>Hoy, 30 Jul 2026</span><span className="flex items-center gap-1.5 text-zinc-600"><span className="size-1.5 rounded-full bg-emerald-500" /> Sincronizado</span></div></div><div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.24fr_1fr]"><aside className="hidden space-y-5 border-r border-zinc-200 pr-5 lg:block"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Workspace</div>{['Resumen', 'Pedidos', 'Catálogo', 'Clientes', 'Analíticas'].map((item, index) => <div key={item} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs ${index === 1 ? 'bg-zinc-900 font-semibold text-white' : 'text-zinc-500'}`}><span className={`size-1.5 rounded-full ${index === 1 ? 'bg-white' : 'bg-zinc-300'}`} />{item}</div>)}</aside><div><div className="mb-5 flex items-end justify-between"><div><p className="text-xl font-semibold tracking-[-0.05em] sm:text-2xl">Buenos días, Valeria.</p><p className="mt-1 text-xs text-zinc-400">Aquí tienes el pulso de tu operación.</p></div><button className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium sm:flex"><Clock3 size={13} strokeWidth={1.5} /> Últimos 7 días</button></div><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Pedidos', '48', '+18%'], ['Ingresos', 'S/ 2,486', '+23%'], ['Ticket promedio', 'S/ 51.79', '+4%'], ['Pendientes', '06', 'Ahora']].map(([label, value, change]) => <div key={label} className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4"><p className="text-[10px] text-zinc-400">{label}</p><p className="mt-2 truncate text-base font-semibold tracking-[-0.04em] sm:text-lg">{value}</p><p className="mt-1 text-[10px] font-medium text-emerald-600">{change}</p></div>)}</div><div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]"><div className="rounded-xl border border-zinc-200 bg-white p-4"><div className="mb-4 flex items-center justify-between"><p className="text-xs font-semibold">Pedidos recientes</p><span className="text-[10px] text-zinc-400">Ver todos <ArrowUpRight size={11} className="inline" strokeWidth={1.5} /></span></div>{orders.map(order => <div key={order.id} className="flex items-center gap-3 border-t border-zinc-100 py-3"><span className={`size-2 rounded-full ${order.color}`} /><span className="w-10 text-[10px] font-semibold text-zinc-400">{order.id}</span><span className="flex-1 truncate text-xs font-medium">{order.name}</span><span className="hidden text-[10px] text-zinc-400 sm:block">{order.time}</span><span className="text-xs font-semibold">{order.amount}</span></div>)}</div><div className="rounded-xl border border-zinc-200 bg-zinc-900 p-4 text-white"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Ventas esta semana</p><TrendingUp size={15} strokeWidth={1.5} /></div><p className="mt-6 text-2xl font-semibold tracking-[-0.06em]">S/ 8,420</p><div className="mt-5 flex h-14 items-end gap-1">{[35, 50, 42, 68, 53, 80, 94].map((height, index) => <span key={index} style={{ height: `${height}%` }} className={`flex-1 rounded-t-sm ${index === 6 ? 'bg-white' : 'bg-white/20'}`} />)}</div><p className="mt-3 text-[10px] text-zinc-500">+23% frente a la semana pasada</p></div></div></div></div></div>
}

function FeatureCard({ className = '', icon, eyebrow, title, description, visual }: { className?: string; icon: React.ReactNode; eyebrow: string; title: string; description: string; visual: React.ReactNode }) {
  return <article className={`scroll-reveal group relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-7 transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(24,24,27,0.08)] sm:p-9 ${className}`}><div className="flex items-start justify-between"><div><div className="mb-6 flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">{icon}</div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{eyebrow}</p><h3 className="mt-3 max-w-md text-2xl font-semibold leading-tight tracking-[-0.05em] sm:text-3xl">{title}</h3><p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">{description}</p></div><ArrowUpRight className="text-zinc-300 transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-zinc-900" size={20} strokeWidth={1.5} /></div><div className="mt-8">{visual}</div></article>
}

function MiniKanban({ large = false }) { return <div className={`grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 ${large ? 'min-h-[300px] sm:p-5' : 'min-h-[190px]'}`}>{['Nuevos', 'En proceso', 'Listos'].map((column, columnIndex) => <div key={column}><div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400"><span className={`size-1.5 rounded-full ${['bg-amber-400', 'bg-sky-400', 'bg-emerald-400'][columnIndex]}`} />{column}</div>{Array.from({ length: columnIndex === 2 ? 1 : 2 }).map((_, index) => <div key={index} className="mb-2 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-[0_3px_12px_rgba(24,24,27,0.04)]"><div className="h-1.5 w-2/3 rounded-full bg-zinc-200" /><div className="mt-2 h-1.5 w-1/2 rounded-full bg-zinc-100" /><div className="mt-3 h-1.5 w-1/3 rounded-full bg-zinc-900/80" /></div>)}</div>)}</div> }
function CatalogVisual({ large = false }) { return <div className={`flex items-end gap-2 rounded-2xl bg-[#F2F1ED] p-4 ${large ? 'min-h-[300px] sm:p-6' : 'min-h-[190px]'}`}><div className="w-1/3 rounded-xl bg-white p-2.5 shadow-sm"><div className="aspect-square rounded-lg bg-zinc-200" /><div className="mt-3 h-2 w-4/5 rounded-full bg-zinc-800" /><div className="mt-2 h-2 w-1/2 rounded-full bg-zinc-200" /></div><div className="w-1/3 -translate-y-5 rounded-xl bg-white p-2.5 shadow-[0_12px_30px_rgba(24,24,27,0.10)]"><div className="aspect-square rounded-lg bg-[#D7D4CB]" /><div className="mt-3 h-2 w-4/5 rounded-full bg-zinc-800" /><div className="mt-2 h-2 w-1/2 rounded-full bg-zinc-200" /></div><div className="w-1/3 rounded-xl bg-white p-2.5 shadow-sm"><div className="aspect-square rounded-lg bg-zinc-300" /><div className="mt-3 h-2 w-4/5 rounded-full bg-zinc-800" /><div className="mt-2 h-2 w-1/2 rounded-full bg-zinc-200" /></div></div> }
function ChartVisual() { return <div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-zinc-900 p-5 text-white"><div className="flex items-start justify-between"><span className="text-[10px] text-zinc-500">Ingresos netos</span><span className="text-xs font-semibold text-emerald-400">+23.4%</span></div><p className="mt-2 text-2xl font-semibold tracking-[-0.06em]">S/ 12,840</p><svg viewBox="0 0 500 120" className="absolute inset-x-5 bottom-4 h-20 w-[calc(100%-40px)] overflow-visible"><path d="M0 95 C45 92, 48 56, 90 66 S140 88, 180 54 S235 65, 270 42 S320 80, 355 45 S410 58, 500 8" fill="none" stroke="white" strokeWidth="2" /><path d="M0 95 C45 92, 48 56, 90 66 S140 88, 180 54 S235 65, 270 42 S320 80, 355 45 S410 58, 500 8 V120 H0 Z" fill="white" opacity=".06" /></svg></div> }
function MessageVisual({ large = false }) { return <div className={`flex flex-col gap-2 rounded-2xl bg-zinc-50 p-4 ${large ? 'min-h-[300px] justify-center sm:p-8' : 'min-h-[190px] justify-center'}`}><div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white p-3 shadow-[0_4px_16px_rgba(24,24,27,0.05)]"><p className="text-[10px] leading-5 text-zinc-500">Tu pedido está en camino. ¡Gracias por comprar con nosotros!</p></div><div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-zinc-900 p-3 text-white"><p className="text-[10px] leading-5 text-zinc-300">Perfecto, lo recibimos. Te avisamos cuando llegue.</p></div><div className="ml-2 flex items-center gap-1.5 text-[9px] text-zinc-400"><span className="size-1.5 rounded-full bg-emerald-500" /> Enviado automáticamente</div></div> }
function WorkflowStep({ number, icon, title, text, visual }: { number: string; icon: React.ReactNode; title: string; text: string; visual: React.ReactNode }) { return <article className="scroll-reveal rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-[0_10px_30px_rgba(24,24,27,0.03)] sm:p-8"><div className="mb-8 flex items-start justify-between"><span className="text-xs font-bold tracking-[0.15em] text-zinc-300">{number}</span><span className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">{icon}</span></div><h3 className="text-2xl font-semibold tracking-[-0.05em]">{title}</h3><p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">{text}</p><div className="mt-7">{visual}</div></article> }
function PlanCard({ title, price, description, features, featured = false }: { title: string; price: string; description: string; features: string[]; featured?: boolean }) { return <article className={`scroll-reveal flex flex-col rounded-[1.75rem] border p-7 sm:p-9 ${featured ? 'border-zinc-900 bg-zinc-900 text-white shadow-[0_20px_50px_rgba(24,24,27,0.14)]' : 'border-zinc-200 bg-white'}`}><div className="flex items-center justify-between"><p className={`text-xs font-bold uppercase tracking-[0.16em] ${featured ? 'text-zinc-400' : 'text-zinc-500'}`}>{title}</p>{featured && <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300">Más elegido</span>}</div><div className="mt-5 flex items-end gap-2"><span className="text-5xl font-semibold tracking-[-0.07em]">S/ {price}</span><span className={`mb-1 text-sm ${featured ? 'text-zinc-500' : 'text-zinc-400'}`}>/mes</span></div><p className={`mt-3 text-sm ${featured ? 'text-zinc-400' : 'text-zinc-500'}`}>{description}</p><div className="my-9 flex-1 space-y-4">{features.map(feature => <p key={feature} className={`flex items-start gap-3 text-sm ${featured ? 'text-zinc-300' : 'text-zinc-600'}`}><Check size={16} className={`mt-0.5 shrink-0 ${featured ? 'text-white' : 'text-zinc-900'}`} strokeWidth={1.5} />{feature}</p>)}</div><Link href="/login" className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition-all duration-300 active:scale-95 ${featured ? 'bg-white text-zinc-900 hover:bg-zinc-200' : 'border border-zinc-300 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900'}`}>{featured ? 'Activar plan Pro' : 'Crear cuenta gratis'} <ArrowUpRight size={16} strokeWidth={1.5} /></Link></article> }
