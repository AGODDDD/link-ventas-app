'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, BarChart2, Bell, CheckCircle, ChevronDown, CreditCard,
  DollarSign, Globe, LayoutDashboard, Menu, MessageCircle, Package,
  Printer, Shield, ShoppingBag, Sparkles, Star, TrendingUp, X, Zap,
} from 'lucide-react'

const faqs = [
  ['¿Cómo me avisa el panel cuando ingresa un pedido nuevo?', 'El Dashboard actualiza el pipeline en tiempo real y envía una alerta visual y una notificación a tu WhatsApp Business.'],
  ['¿Puedo imprimir los tickets desde el Dashboard?', 'Sí. Cada pedido genera un PDF de 80 mm listo para imprimir en una ticketera térmica compatible.'],
  ['¿El cliente necesita descargar una app?', 'No. El catálogo funciona desde el navegador, sin descargas ni registros obligatorios.'],
  ['¿Cómo se conecta con WhatsApp?', 'WhatsApp recibe notificaciones automáticas cuando el estado del pedido cambia; tú conservas el control desde el panel.'],
  ['¿Cuántos pedidos puedo gestionar simultáneamente?', 'Sin límites. El pipeline organiza cada pedido por estado para operaciones de cualquier tamaño.'],
]

const pipeline = [
  { status: 'Pendiente', panel: 'border-amber-400/20 bg-amber-400/[0.08]', text: 'text-amber-400', dot: 'bg-amber-400', orders: [['#0041', 'Pizza Margarita x2', 'S/ 70'], ['#0042', 'Combo Pollo BBQ', 'S/ 45']] },
  { status: 'En proceso', panel: 'border-blue-400/20 bg-blue-400/[0.08]', text: 'text-blue-400', dot: 'bg-blue-400', orders: [['#0039', 'Ensalada Cesar + Jugo', 'S/ 38'], ['#0040', 'Lomo Saltado Familiar', 'S/ 95']] },
  { status: 'Listo', panel: 'border-emerald-400/20 bg-emerald-400/[0.08]', text: 'text-emerald-400', dot: 'bg-emerald-400', orders: [['#0038', 'Menu del Dia Ejecutivo', 'S/ 28']] },
]

const features = [
  [<LayoutDashboard key="dashboard" size={24} />, 'Dashboard de Pedidos en Tiempo Real', 'Pipeline visual con columnas Kanban para gestionar cada orden sin perder el hilo.', 'text-blue-300 bg-blue-400/10'],
  [<ShoppingBag key="bag" size={24} />, 'Catálogo Autogestionable', 'Tus clientes compran desde su móvil y cada pedido entra al panel en segundos.', 'text-emerald-300 bg-emerald-400/10'],
  [<Printer key="printer" size={24} />, 'Ticketera Térmica PDF', 'Comprobantes vectoriales de 80 mm listos para cualquier impresora.', 'text-violet-300 bg-violet-400/10'],
  [<CreditCard key="card" size={24} />, 'Pasarela Mercado Pago', 'Cobra con tarjetas de forma segura y confirma la venta al instante.', 'text-emerald-300 bg-emerald-400/10'],
  [<MessageCircle key="message" size={24} />, 'WhatsApp Automático', 'Actualizaciones de estado directas al celular de tu cliente.', 'text-green-300 bg-green-400/10'],
  [<BarChart2 key="chart" size={24} />, 'Analíticas de Negocio', 'Ingresos, ticket promedio y productos top para decidir mejor.', 'text-amber-300 bg-amber-400/10'],
] as const

const navLinks = [['#features', 'Características'], ['#calculator', 'Ahorro'], ['#pricing', 'Precios'], ['#faq', 'FAQ']]
const planFeatures = ['Dashboard de control básico', 'Catálogo digital público', 'Pedidos entrantes ilimitados', 'Notificaciones a WhatsApp', '0% de comisiones sobre ventas']

export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [orders, setOrders] = useState(150)
  const [animatedOrders, setAnimatedOrders] = useState(150)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    void import('@/lib/supabase').then(({ supabase }) => supabase.auth.getSession()).then(({ data }) => {
      if (data.session) router.push('/dashboard')
    }).catch(() => undefined)
  }, [router])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (orders === animatedOrders) return
    const start = animatedOrders
    let step = 0
    const timer = window.setInterval(() => {
      step += 1
      setAnimatedOrders(Math.round(start + ((orders - start) * step) / 20))
      if (step === 20) window.clearInterval(timer)
    }, 16)
    return () => window.clearInterval(timer)
  }, [orders, animatedOrders])

  const deliveryCost = animatedOrders * 45 * 0.2
  const savings = deliveryCost - 29
  const headerClass = scrolled
    ? 'bg-[#07071a]/90 py-3 backdrop-blur-xl border-b border-white/5'
    : 'bg-transparent py-5 border-b border-transparent'

  return (
    <main className="min-h-screen bg-[#07071a] font-sans text-white">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${headerClass}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2.5 font-bold text-white">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600"><Zap size={18} /></span>
            <span className="font-[family-name:var(--font-space-grotesk)] text-[1.2rem]">Link<span className="bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">Ventas</span></span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map(([href, label]) => <a key={href} href={href} className="text-sm font-medium text-white/55 transition-colors hover:text-white">{label}</a>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-white/55 transition hover:bg-white/5 hover:text-white">Ingresar</Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-[14px] bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold shadow-[0_0_28px_rgba(16,185,129,.3)] transition hover:-translate-y-px hover:scale-[1.04]">Comenzar Gratis <ArrowRight size={15} /></Link>
          </div>
          <button aria-label="Abrir menú" className="p-2 md:hidden" onClick={() => setMobileMenuOpen(value => !value)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
        </div>
        {mobileMenuOpen && <div className="mt-2 border-t border-white/5 bg-[#07071a]/95 px-6 py-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-4">{navLinks.map(([href, label]) => <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="border-b border-white/5 py-2 text-sm text-white/60">{label}</a>)}</nav>
          <Link href="/login" className="mt-4 flex justify-center rounded-[14px] bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold">Iniciar mi Panel Gratis</Link>
        </div>}
      </header>

      <section className="relative flex min-h-screen items-center overflow-hidden bg-[radial-gradient(ellipse_900px_500px_at_50%_-80px,rgba(16,185,129,.13),transparent_70%),radial-gradient(ellipse_600px_400px_at_90%_30%,rgba(139,92,246,.09),transparent_60%),#07071a] pt-28 pb-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 mb-12 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2 text-[.72rem] font-bold uppercase tracking-[.12em] text-emerald-300"><span className="size-2 rounded-full bg-emerald-400" />Panel activo · +2,400 negocios en control</div>
            <h1 className="mb-5 font-[family-name:var(--font-space-grotesk)] text-[clamp(2.4rem,5.5vw,4.2rem)] font-extrabold leading-[1.05] text-white">Toma el control absoluto de <span className="bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">tus pedidos</span><br />y ventas en línea</h1>
            <p className="mx-auto mb-8 max-w-2xl text-[1.1rem] leading-relaxed text-white/55">Centraliza pedidos, automatiza despachos, acepta pagos seguros y emite tickets PDF al instante. <span className="font-medium text-white/75">Con notificaciones automáticas a WhatsApp.</span></p>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-[14px] bg-gradient-to-br from-emerald-500 to-emerald-600 px-7 py-4 font-bold shadow-[0_0_28px_rgba(16,185,129,.3)] transition hover:-translate-y-px hover:scale-[1.04]"><LayoutDashboard size={19} /> Crear mi Panel Gratis <ArrowRight size={18} /></Link>
            <div className="mt-6 flex flex-wrap justify-center gap-6 text-[.82rem] font-medium text-white/35">{['Sin tarjeta requerida', '0% comisiones sobre ventas', 'Panel activo en minutos'].map(item => <span key={item} className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" />{item}</span>)}</div>
          </div>
          <div className="relative mx-auto max-w-6xl rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#111130] p-3 shadow-[0_40px_100px_rgba(0,0,0,.7)]">
            <div className="flex items-center justify-between rounded-t-xl border-b border-white/5 bg-white/[.03] px-4 py-3"><span className="text-xs text-white/40">linkventas.com/dashboard</span><span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[.12] px-2.5 py-1 text-[.65rem] font-bold text-emerald-300"><Bell size={12} /> EN VIVO</span></div>
            <div className="p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><div><p className="font-[family-name:var(--font-space-grotesk)] font-bold">Panel de Pedidos</p><p className="text-xs text-white/35">Actualizado hace 3s</p></div><div className="hidden gap-2 sm:flex">{[['Pedidos', '12', 'text-emerald-300'], ['Ingresos', 'S/ 486', 'text-blue-300'], ['Ticket', 'S/ 40.50', 'text-violet-300']].map(([label, value, color]) => <div key={label} className="rounded-lg border border-white/5 bg-white/[.04] px-3 py-2"><p className="text-[.6rem] uppercase tracking-wider text-white/35">{label}</p><p className={`font-bold ${color}`}>{value}</p></div>)}</div></div>
              <div className="grid gap-3 md:grid-cols-3">{pipeline.map(column => <div key={column.status} className={`rounded-xl border p-3 ${column.panel}`}><div className="mb-3 flex items-center gap-2"><span className={`size-2 rounded-full ${column.dot}`} /><span className={`text-[.7rem] font-bold uppercase tracking-[.1em] ${column.text}`}>{column.status}</span></div>{column.orders.map(([id, name, amount]) => <div key={id} className="mb-2 rounded-lg border border-white/5 bg-[#10102a] p-2.5 last:mb-0"><div className="flex justify-between text-[.65rem]"><span className={column.text}>{id}</span><span className="text-white/30">2 min</span></div><p className="my-1 truncate text-[.7rem] font-medium text-white/75">{name}</p><p className="text-[.7rem] font-bold text-emerald-400">{amount}</p></div>)}</div>)}</div>
              <div className="mt-4 flex items-end gap-3 rounded-lg border border-white/5 bg-white/[.02] p-3"><span className="whitespace-nowrap text-[.65rem] font-semibold text-white/30">Ingresos 7 días</span><div className="flex h-7 flex-1 items-end gap-1">{['h-[42%]', 'h-[58%]', 'h-[35%]', 'h-[75%]', 'h-[54%]', 'h-[86%]', 'h-full'].map((height, index) => <span key={height} className={`flex-1 rounded-t-sm ${height} ${index === 6 ? 'bg-gradient-to-t from-emerald-600 to-emerald-500' : 'bg-emerald-400/20'}`} />)}</div><span className="flex items-center gap-1 text-[.7rem] font-bold text-emerald-400"><TrendingUp size={12} />+23%</span></div>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-5 text-center md:grid-cols-4">{[['+2,400', 'Comercios activos'], ['S/ 0', 'Comisiones cobradas'], ['1 clic', 'Para imprimir tickets'], ['24/7', 'Panel disponible']].map(([value, label]) => <div key={label}><p className="bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text font-[family-name:var(--font-space-grotesk)] text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-transparent">{value}</p><p className="text-sm text-white/35">{label}</p></div>)}</div>
        </div>
      </section>

      <section id="features" className="bg-[#07071a] py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-16 text-center"><span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.13em] text-emerald-300">Todo en un solo lugar</span><h2 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-[clamp(2rem,4vw,3.2rem)] font-extrabold">La operación completa,<br /><span className="bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">sin fricción</span></h2><p className="mx-auto mt-4 max-w-xl text-white/45">Herramientas que convierten ventas en una operación ordenada.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(([icon, title, description, accent]) => <article key={title} className="rounded-2xl border border-white/6 bg-white/[.03] p-7 transition hover:-translate-y-1 hover:border-white/15"><span className={`mb-5 inline-flex rounded-xl p-3 ${accent}`}>{icon}</span><h3 className="mb-3 font-[family-name:var(--font-space-grotesk)] text-lg font-bold">{title}</h3><p className="text-sm leading-relaxed text-white/50">{description}</p></article>)}</div></div></section>

      <section className="border-y border-white/5 bg-white/[.01] py-20"><div className="mx-auto max-w-5xl px-4 text-center"><span className="text-xs font-bold uppercase tracking-[.13em] text-emerald-300">Tan simple como vender</span><h2 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold">Tu negocio listo en tres pasos</h2><div className="mt-12 grid gap-8 md:grid-cols-3">{[['01', <ShoppingBag key="one" />, 'Crea tu catálogo', 'Añade productos, fotos y precios.'], ['02', <MessageCircle key="two" />, 'Comparte tu link', 'Tus clientes hacen pedidos desde cualquier móvil.'], ['03', <LayoutDashboard key="three" />, 'Gestiona y cobra', 'Controla pedidos, pagos y despachos.']].map(([number, icon, title, text]) => <div key={String(number)}><p className="mb-3 text-xs font-bold tracking-[.12em] text-white/20">{number}</p><span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">{icon}</span><h3 className="font-[family-name:var(--font-space-grotesk)] font-bold">{title}</h3><p className="mt-2 text-sm text-white/40">{text}</p></div>)}</div></div></section>

      <section id="calculator" className="relative overflow-hidden bg-[#07071a] py-24"><div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"><div className="mb-12 text-center"><span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.13em] text-emerald-300">Calculadora de ahorro</span><h2 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold">¿Cuánto te están <span className="text-red-400">cobrando</span> de más?</h2><p className="mt-3 text-white/45">Las plataformas cobran hasta 20% por pedido. Link Ventas cobra S/ 0 de comisión.</p></div><div className="rounded-3xl border border-white/6 bg-white/[.03] p-6 sm:p-8"><div className="flex items-end justify-between"><label htmlFor="orders" className="text-xs font-bold uppercase tracking-[.12em] text-white/45">Pedidos al mes</label><span className="bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text font-[family-name:var(--font-space-grotesk)] text-4xl font-extrabold text-transparent">{animatedOrders}</span></div><input id="orders" type="range" min="10" max="1000" step="10" value={orders} onChange={event => setOrders(Number(event.target.value))} className="mt-5 w-full cursor-pointer accent-emerald-500" /><div className="mt-2 flex justify-between text-xs text-white/25"><span>10 pedidos</span><span>1,000 pedidos</span></div><div className="mt-8 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-red-400/20 bg-red-400/[.06] p-6"><div className="mb-3 flex items-center gap-2"><span className="rounded-xl bg-red-400/[.12] p-2 text-red-400"><Package size={16} /></span><span className="text-sm font-semibold text-white/50">Apps de Delivery (20%)</span></div><p className="font-[family-name:var(--font-space-grotesk)] text-3xl font-extrabold text-red-400">S/ {deliveryCost.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</p><p className="mt-2 text-xs text-red-300/60">Dinero que pierdes cada mes</p></div><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-6"><div className="mb-3 flex items-center gap-2"><span className="rounded-xl bg-emerald-400/[.12] p-2 text-emerald-400"><LayoutDashboard size={16} /></span><span className="text-sm font-semibold text-white/50">Con Link Ventas Pro</span></div><p className="font-[family-name:var(--font-space-grotesk)] text-3xl font-extrabold text-emerald-400">S/ 29</p><p className="mt-2 text-xs text-emerald-300/60">Costo fijo mensual · 0% de comisión</p></div></div><div className="mt-4 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-violet-400/[.07] p-7 text-center"><p className="text-sm font-medium text-white/50">¡Te ahorrarías cada mes!</p><p className="my-2 bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text font-[family-name:var(--font-space-grotesk)] text-[clamp(2.5rem,6vw,4rem)] font-extrabold text-transparent">S/ {Math.max(savings, 0).toLocaleString('es-PE', { maximumFractionDigits: 0 })}</p><p className="text-sm text-white/35">Equivale a {Math.round(Math.max(savings, 0) / 45)} pedidos extra de ganancia pura al mes</p></div></div></div></section>

      <section id="pricing" className="bg-white/[.01] py-24"><div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8"><div className="mb-16 text-center"><span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.13em] text-emerald-300"><DollarSign size={13} className="mr-1" />Precios</span><h2 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold">Simple, justo y <span className="bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">transparente</span></h2></div><div className="grid gap-6 md:grid-cols-2"><PlanCard title="Plan Emprendedor" price="0" description="Para empezar a vender sin invertir un sol." features={planFeatures} /><PlanCard pro title="Plan Pro" price="29" description="Control operativo completo para escalar tus ventas." features={[...planFeatures, 'Pasarela de pagos Mercado Pago', 'Tickets PDF térmicos', 'Analíticas avanzadas']} /></div><p className="mt-8 flex items-center justify-center gap-2 text-sm text-white/25"><Shield size={14} className="text-emerald-400/50" />Sin permanencia · Cancela cuando quieras</p></div></section>

      <section id="faq" className="bg-[#07071a] py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"><div className="mb-16 text-center"><span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.13em] text-emerald-300">Dudas operativas</span><h2 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold">Preguntas <span className="bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">frecuentes</span></h2></div><div className="space-y-3">{faqs.map(([question, answer], index) => { const open = openFaq === index; return <article key={question} className={`overflow-hidden rounded-2xl border bg-white/[.03] transition ${open ? 'border-emerald-400/20' : 'border-white/6'}`}><button className="flex w-full items-center justify-between gap-4 p-6 text-left" onClick={() => setOpenFaq(open ? null : index)}><span className="text-[.95rem] font-semibold leading-snug">{question}</span><span className={`flex size-8 shrink-0 items-center justify-center rounded-full transition ${open ? 'rotate-180 bg-emerald-400/[.15] text-emerald-400' : 'bg-white/5 text-white/30'}`}><ChevronDown size={17} /></span></button>{open && <p className="border-t border-white/5 px-6 py-4 text-sm leading-7 text-white/45">{answer}</p>}</article>})}</div><div className="mt-12 rounded-2xl border border-white/6 bg-white/[.03] p-8 text-center"><p className="text-sm text-white/25">¿Tienes otra pregunta?</p><h3 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-xl font-bold">Hablamos por WhatsApp</h3><a href="https://wa.me/51999999999" className="mt-5 inline-flex items-center gap-2 rounded-[14px] bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-3.5 text-sm font-bold"><MessageCircle size={18} />Chatear ahora</a></div></div></section>

      <section className="bg-gradient-to-br from-emerald-400/[.07] via-[#07071a] to-violet-400/[.06] py-28 text-center"><div className="mx-auto max-w-4xl px-4"><span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.13em] text-emerald-300">Empieza gratis hoy</span><h2 className="mt-6 font-[family-name:var(--font-space-grotesk)] text-[clamp(2rem,5vw,3.8rem)] font-extrabold leading-tight">Tu panel de control,<br /><span className="bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">listo en minutos</span></h2><p className="mx-auto mt-5 max-w-xl text-[1.1rem] text-white/45">Únete a comercios que ya gestionan sus pedidos con control total y sin comisiones.</p><Link href="/login" className="mt-9 inline-flex items-center gap-2 rounded-[14px] bg-gradient-to-br from-emerald-500 to-emerald-600 px-10 py-4 text-lg font-bold shadow-[0_0_28px_rgba(16,185,129,.3)]"><Sparkles size={20} />Iniciar mi Panel Gratis</Link></div></section>

      <footer className="border-t border-white/5 bg-[#040410] py-12"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center sm:flex-row sm:text-left"><div><a href="/" className="flex items-center justify-center gap-2 font-bold sm:justify-start"><span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600"><Zap size={18} /></span><span>Link<span className="text-emerald-400">Ventas</span></span></a><p className="mt-3 text-sm text-white/25">El panel de control para vender más.</p></div><div className="flex items-center gap-2 text-xs text-white/20"><Globe size={13} />PEN (S/) · Perú</div><p className="text-xs text-white/20">© 2026 Link Ventas. Todos los derechos reservados.</p></div></footer>
    </main>
  )
}

function PlanCard({ title, price, description, features, pro = false }: { title: string; price: string; description: string; features: string[]; pro?: boolean }) {
  return <article className={`relative flex flex-col rounded-3xl border p-8 ${pro ? 'border-emerald-400/25 bg-gradient-to-br from-emerald-400/[.07] to-violet-400/[.05]' : 'border-white/6 bg-white/[.03]'}`}>
    {pro && <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold"><Star size={11} className="mr-1 inline" fill="currentColor" />MÁS POPULAR</span>}
    <p className={`text-xs font-bold uppercase tracking-[.14em] ${pro ? 'text-emerald-300' : 'text-white/35'}`}>{title}</p><div className="mt-2 flex items-end gap-2"><span className="font-[family-name:var(--font-space-grotesk)] text-5xl font-extrabold">S/ {price}</span><span className="mb-1 text-sm text-white/30">/mes</span></div><p className="mt-3 text-sm text-white/40">{description}</p><div className="my-8 flex-1 space-y-3">{features.map(feature => <p key={feature} className="flex items-start gap-3 text-sm text-white/60"><CheckCircle size={15} className="mt-0.5 shrink-0 text-emerald-500" />{feature}</p>)}</div><Link href="/login" className={`flex justify-center rounded-[14px] px-6 py-3.5 text-sm font-bold ${pro ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'border border-white/15 text-white/70'}`}>{pro ? 'Activar Plan Pro' : 'Crear cuenta gratis'} <ArrowRight size={16} className="ml-2" /></Link>
  </article>
}
