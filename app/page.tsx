'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Zap, LayoutDashboard, ShoppingBag, MessageCircle, CreditCard,
  FileText, BarChart2, CheckCircle, ChevronDown, Menu, X,
  ArrowRight, Star, TrendingUp, Shield, Globe, Instagram, Twitter,
  Facebook, Linkedin, Sparkles, Bell, Clock, Package, ChevronRight,
  Receipt, Printer, Wifi, AlertCircle, Circle, MoveRight, RefreshCw,
  DollarSign, Users, Activity, Layers
} from 'lucide-react'

/* ─────────────────────── TYPES ─────────────────────── */
interface FAQItem { q: string; a: string }

/* ─────────────────────── DATA ──────────────────────── */
const faqs: FAQItem[] = [
  {
    q: '¿Cómo me avisa el panel cuando ingresa un pedido nuevo?',
    a: 'En cuanto un cliente confirma su pedido desde el catálogo digital, el Dashboard actualiza el pipeline en tiempo real con una alerta sonora y visual. Simultáneamente, recibes un mensaje de notificación automático en tu WhatsApp Business con el detalle completo del pedido, para que nunca pierdas una venta aunque no estés mirando la pantalla.',
  },
  {
    q: '¿Puedo imprimir los tickets directamente en mi ticketera física desde el Dashboard?',
    a: '¡Sí, con un solo clic! Desde la tarjeta de cada pedido en el Dashboard, presionas el botón "Imprimir Ticket" y el sistema genera al instante un PDF vectorial de 80mm compatible con cualquier ticketera térmica ESC/POS. También puedes enviarlo digitalmente por WhatsApp al cliente o guardarlo como comprobante.',
  },
  {
    q: '¿El cliente necesita descargar alguna app para hacer un pedido?',
    a: 'Absolutamente no. Tu catálogo digital funciona 100% desde el navegador web del cliente. Sin descargas, sin registros obligatorios. El cliente abre tu link, elige sus productos y confirma el pedido en segundos. La experiencia es tan fluida en el móvil como en el escritorio.',
  },
  {
    q: '¿Cómo se conecta con WhatsApp?',
    a: 'La integración con WhatsApp es un flujo de notificación complementario y totalmente automatizado. No reemplaza tu WhatsApp Business, lo potencia: cuando el estado de un pedido cambia en el Dashboard (ej: "En preparación" → "Listo para despacho"), el cliente recibe un mensaje automático con el update. Tú controlas el proceso desde el panel; WhatsApp es el canal de comunicación con el cliente.',
  },
  {
    q: '¿Cuántos pedidos puedo gestionar simultáneamente?',
    a: 'Sin límites. El pipeline del Dashboard está diseñado para manejar múltiples pedidos concurrentes organizados en columnas (Pendiente, En Proceso, Listo, Despachado). Puedes filtrar por fecha, canal, estado o cliente. Ideal tanto para negocios con 10 pedidos al día como para operaciones de alto volumen.',
  },
]

const orderPipeline = [
  {
    status: 'Pendiente',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    dot: '#f59e0b',
    orders: [
      { id: '#0041', name: 'Pizza Margarita ×2', amount: 'S/ 70', time: '2 min' },
      { id: '#0042', name: 'Combo Pollo BBQ', amount: 'S/ 45', time: '5 min' },
    ],
  },
  {
    status: 'En Proceso',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    dot: '#3b82f6',
    orders: [
      { id: '#0039', name: 'Ensalada César + Jugo', amount: 'S/ 38', time: '12 min' },
      { id: '#0040', name: 'Lomo Saltado Familiar', amount: 'S/ 95', time: '15 min' },
    ],
  },
  {
    status: 'Listo',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    dot: '#10b981',
    orders: [
      { id: '#0038', name: 'Menú del Día Ejecutivo', amount: 'S/ 28', time: '22 min' },
    ],
  },
]

const features = [
  {
    icon: <LayoutDashboard size={26} />,
    title: 'Dashboard de Pedidos en Tiempo Real',
    desc: 'Pipeline visual con columnas Kanban. Centraliza, filtra y gestiona el flujo de cada orden desde que entra hasta que se despacha. Nunca pierdas un pedido.',
    size: 'large',
    badge: null,
    accentColor: '#3b82f6',
  },
  {
    icon: <ShoppingBag size={24} />,
    title: 'Catálogo de Ventas Autogestionable',
    desc: 'Tus clientes compran desde su móvil sin descargar nada. Los pedidos ingresan al panel en segundos, listos para procesar.',
    size: 'normal',
    badge: 'GRATIS',
    accentColor: '#10b981',
  },
  {
    icon: <Printer size={24} />,
    title: 'Motor de Ticketera Térmica PDF',
    desc: 'Un clic desde el Dashboard imprime el comprobante en tu ticketera física. PDF vectorial de 80mm listo para cualquier impresora ESC/POS.',
    size: 'normal',
    badge: 'PRO',
    accentColor: '#a78bfa',
  },
  {
    icon: <CreditCard size={24} />,
    title: 'Pasarela de Pagos Culqi',
    desc: 'Cobra con tarjetas Visa, Mastercard y billeteras digitales. Sin comisiones. El dinero va directo a tu cuenta bancaria.',
    size: 'normal',
    badge: 'PRO',
    accentColor: '#10b981',
  },
  {
    icon: <MessageCircle size={24} />,
    title: 'Notificaciones WhatsApp Automáticas',
    desc: 'Alertas automáticas de estado al celular del cliente en cada cambio de pedido. Tú controlas el panel; WhatsApp es el canal de comunicación.',
    size: 'normal',
    badge: null,
    accentColor: '#25d366',
  },
  {
    icon: <BarChart2 size={24} />,
    title: 'Analíticas de Negocio',
    desc: 'Ingresos por día, ticket promedio, productos top y módulo de rescate de clientes. Inteligencia de datos para decidir mejor.',
    size: 'normal',
    badge: 'PRO',
    accentColor: '#f59e0b',
  },
]

const proofStats = [
  { value: '+2,400', label: 'Comercios activos' },
  { value: 'S/ 0', label: 'Comisiones cobradas' },
  { value: '1 clic', label: 'Para imprimir tickets' },
  { value: '24/7', label: 'Panel disponible' },
]

/* ─────────────────────── COMPONENT ─────────────────── */
export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [orders, setOrders] = useState(150)
  const [animatedOrders, setAnimatedOrders] = useState(150)
  const [scrolled, setScrolled] = useState(false)
  const [activeOrder, setActiveOrder] = useState<string | null>(null)

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) router.push('/dashboard')
      } catch { /* env not configured, stay on landing */ }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const target = orders
    const start = animatedOrders
    const diff = target - start
    if (diff === 0) return
    const steps = 20
    let step = 0
    const timer = setInterval(() => {
      step++
      setAnimatedOrders(Math.round(start + (diff * step) / steps))
      if (step >= steps) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [orders])

  const avgTicket = 45
  const deliveryCost = animatedOrders * avgTicket * 0.20
  const linkVentasCost = 29
  const savings = deliveryCost - linkVentasCost

  return (
    <div className="min-h-screen" style={{ background: '#07071a', fontFamily: "'Inter', sans-serif" }}>

      {/* ── GLOBAL STYLES ───────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

        .lv-root { background: #07071a; }

        /* Background aurora */
        .aurora {
          background: #07071a;
          background-image:
            radial-gradient(ellipse 900px 500px at 50% -80px, rgba(16,185,129,0.13) 0%, transparent 70%),
            radial-gradient(ellipse 600px 400px at 90% 30%, rgba(139,92,246,0.09) 0%, transparent 60%),
            radial-gradient(ellipse 500px 350px at 5% 70%, rgba(59,130,246,0.07) 0%, transparent 60%);
        }
        .dot-grid {
          background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 36px 36px;
        }

        /* Glass */
        .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.06); }
        .glass-dark { background: rgba(7,7,26,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }

        /* Dashboard mockup frame */
        .dash-frame {
          background: linear-gradient(145deg, #0d0d2b 0%, #111130 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .dash-titlebar {
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px 16px 0 0;
        }

        /* Buttons */
        .btn-emerald {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 0 28px rgba(16,185,129,0.3), 0 4px 12px rgba(16,185,129,0.15);
          color: white; font-weight: 700; border-radius: 14px;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-emerald:hover { transform: scale(1.04) translateY(-1px); box-shadow: 0 0 45px rgba(16,185,129,0.45), 0 8px 20px rgba(16,185,129,0.25); }
        .btn-emerald:active { transform: scale(0.97); }
        .btn-outline {
          border: 1.5px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
          border-radius: 14px; background: transparent;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-outline:hover { border-color: rgba(16,185,129,0.5); color: #34d399; background: rgba(16,185,129,0.06); }

        /* Text gradients */
        .g-emerald { background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .g-blue-purple { background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .g-white { background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Section label */
        .section-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.22); color: #34d399; font-size: 11px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; }

        /* Nav link */
        .nav-a { color: rgba(255,255,255,0.55); font-size: 0.875rem; font-weight: 500; transition: color 0.18s; }
        .nav-a:hover { color: #fff; }

        /* Card hover */
        .feat-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .feat-card:hover { transform: translateY(-4px); }

        /* Pulse dot */
        .pulse-dot { animation: pulse-ring 2s ease-out infinite; }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }

        /* Float animations */
        .float-a { animation: fa 4s ease-in-out infinite; }
        .float-b { animation: fb 4.8s ease-in-out infinite; }
        @keyframes fa { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fb { 0%,100% { transform: translateY(-3px); } 50% { transform: translateY(5px); } }

        /* Range slider */
        input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg,#10b981,#059669); cursor: pointer; box-shadow: 0 0 14px rgba(16,185,129,0.5); border: 2px solid rgba(255,255,255,0.25); }
        input[type='range']::-webkit-slider-runnable-track { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); }
        input[type='range'] { -webkit-appearance: none; height: 5px; border-radius: 3px; outline: none; }

        /* FAQ */
        .faq-body { max-height: 0; overflow: hidden; transition: max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease; opacity: 0; }
        .faq-body.open { max-height: 250px; opacity: 1; }

        /* Pricing pro card */
        .price-pro { background: linear-gradient(155deg, rgba(16,185,129,0.07) 0%, rgba(139,92,246,0.05) 100%); border: 1px solid rgba(16,185,129,0.22); position: relative; overflow: hidden; }
        .price-pro::before { content: ''; position: absolute; top:0; left:0; right:0; height: 2px; background: linear-gradient(90deg, #10b981, #a78bfa, #10b981); }

        /* Ticker badge */
        .live-dot { animation: live 1.8s ease-in-out infinite; }
        @keyframes live { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #07071a; }
        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.25); border-radius: 3px; }
      `}} />

      {/* ══════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(7,7,26,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
          padding: scrolled ? '12px 0' : '20px 0',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <Zap size={18} color="white" />
            </div>
            <span style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'1.2rem', color:'white', letterSpacing:'-0.02em' }}>
              Link<span className="g-emerald">Ventas</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[['#features','Características'],['#calculator','Ahorro'],['#pricing','Precios'],['#faq','FAQ']].map(([href,label]) => (
              <a key={href} href={href} className="nav-a">{label}</a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="nav-a px-4 py-2 rounded-xl hover:bg-white/5 transition-all">Ingresar</Link>
            <Link href="/login" className="btn-emerald px-5 py-2.5 text-sm">
              Comenzar Gratis <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button id="mobile-menu-btn" className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 border-t border-white/5" style={{ background:'rgba(7,7,26,0.98)', backdropFilter:'blur(20px)' }}>
            <nav className="flex flex-col px-6 py-4 gap-4">
              {[['#features','Características'],['#calculator','Ahorro'],['#pricing','Precios'],['#faq','FAQ']].map(([href,label]) => (
                <a key={href} href={href} className="nav-a py-2 border-b border-white/5" onClick={() => setMobileMenuOpen(false)}>{label}</a>
              ))}
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/login" className="btn-outline px-5 py-3 justify-center text-sm">Ingresar</Link>
                <Link href="/login" className="btn-emerald px-5 py-3 justify-center text-sm">Iniciar mi Panel Gratis <ArrowRight size={16} /></Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════
          HERO — Dashboard Focus
      ══════════════════════════════════════════════════ */}
      <section className="aurora dot-grid relative min-h-screen flex flex-col justify-center pt-28 pb-16 overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute pointer-events-none" style={{ width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)', top:-200, left:'50%', transform:'translateX(-50%)', filter:'blur(40px)' }} />
        <div className="absolute pointer-events-none right-0 bottom-0" style={{ width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter:'blur(50px)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">

          {/* Top copy */}
          <div className="text-center mb-12 relative z-10">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full"
              style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)' }}>
              <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span style={{ color:'#34d399', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>
                Panel activo · +2,400 negocios en control
              </span>
            </div>

            <h1 style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(2.4rem,5.5vw,4.2rem)', lineHeight:1.05, letterSpacing:'-0.03em', color:'white', marginBottom:'1.25rem' }}>
              Toma el control absoluto de{' '}
              <span className="g-emerald">tus pedidos</span>
              <br />y ventas en línea
            </h1>

            <p style={{ fontSize:'1.1rem', color:'rgba(255,255,255,0.55)', lineHeight:1.7, maxWidth:640, margin:'0 auto 2rem' }}>
              Centraliza tus pedidos en un solo Dashboard, automatiza tus despachos, acepta pagos digitales de forma segura y emite tickets en PDF al instante.{' '}
              <span style={{ color:'rgba(255,255,255,0.75)', fontWeight:500 }}>Con notificaciones automáticas a WhatsApp.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" id="hero-cta-primary" className="btn-emerald px-8 py-4 text-base">
                <LayoutDashboard size={20} />
                Iniciar mi Panel Gratis
              </Link>
              <a href="#features" id="hero-cta-tour" className="btn-outline px-8 py-4 text-base">
                <ChevronRight size={20} />
                Ver Tour de Funciones
              </a>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap justify-center gap-6 mt-6" style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.82rem', fontWeight:500 }}>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} style={{ color:'#10b981' }} /> Sin tarjeta requerida</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} style={{ color:'#10b981' }} /> 0% comisiones sobre ventas</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} style={{ color:'#10b981' }} /> Panel activo en minutos</span>
            </div>
          </div>

          {/* ── DASHBOARD MOCKUP ─────────────────────── */}
          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="dash-frame">
              {/* Title bar */}
              <div className="dash-titlebar flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex items-center gap-2 px-4 py-1 rounded-lg" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Wifi size={11} style={{ color:'#34d399' }} />
                  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.7rem', fontFamily:'Inter' }}>linkventas.com/dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)' }}>
                    <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <span style={{ color:'#34d399', fontSize:'0.65rem', fontWeight:700 }}>EN VIVO</span>
                  </div>
                </div>
              </div>

              {/* Dashboard inner */}
              <div className="flex" style={{ minHeight: 380 }}>

                {/* Sidebar */}
                <div className="hidden sm:flex flex-col gap-1 p-3 border-r border-white/5" style={{ width:52 }}>
                  {[LayoutDashboard, ShoppingBag, Users, BarChart2, Receipt, CreditCard].map((Icon, i) => (
                    <div key={i} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                      style={{ background: i === 0 ? 'rgba(16,185,129,0.15)' : 'transparent' }}>
                      <Icon size={16} style={{ color: i === 0 ? '#10b981' : 'rgba(255,255,255,0.25)' }} />
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-4 overflow-hidden">

                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <div style={{ fontFamily:'Space Grotesk', fontWeight:700, color:'white', fontSize:'1rem' }}>Panel de Pedidos</div>
                      <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.72rem' }}>Martes 20 de mayo, 2026 · Actualizado hace 3s</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mini stats */}
                      {[
                        { label:'Hoy', val:'S/ 1,842', color:'#10b981' },
                        { label:'Pedidos', val:'24', color:'#60a5fa' },
                        { label:'Promedio', val:'S/ 76', color:'#a78bfa' },
                      ].map((s, i) => (
                        <div key={i} className="px-3 py-2 rounded-xl hidden md:block"
                          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</div>
                          <div style={{ color:s.color, fontFamily:'Space Grotesk', fontWeight:700, fontSize:'0.9rem' }}>{s.val}</div>
                        </div>
                      ))}
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer"
                        style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)' }}>
                        <Bell size={13} style={{ color:'#10b981' }} />
                        <span style={{ color:'#34d399', fontSize:'0.72rem', fontWeight:700 }}>3</span>
                      </div>
                    </div>
                  </div>

                  {/* Kanban pipeline */}
                  <div className="grid grid-cols-3 gap-3">
                    {orderPipeline.map((col) => (
                      <div key={col.status} className="rounded-xl p-3" style={{ background:col.bg, border:`1px solid ${col.border}` }}>
                        {/* Column header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full pulse-dot" style={{ background:col.dot }} />
                          <span style={{ color:col.color, fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>{col.status}</span>
                          <span className="ml-auto px-1.5 py-0.5 rounded-full text-white/50" style={{ fontSize:'0.6rem', background:'rgba(255,255,255,0.08)' }}>{col.orders.length}</span>
                        </div>

                        {/* Order cards */}
                        <div className="space-y-2">
                          {col.orders.map((ord) => (
                            <div key={ord.id}
                              className="rounded-lg p-2.5 cursor-pointer transition-all"
                              style={{
                                background: activeOrder === ord.id ? 'rgba(255,255,255,0.08)' : 'rgba(7,7,26,0.5)',
                                border: activeOrder === ord.id ? `1px solid ${col.dot}40` : '1px solid rgba(255,255,255,0.05)',
                              }}
                              onClick={() => setActiveOrder(activeOrder === ord.id ? null : ord.id)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span style={{ color:col.color, fontSize:'0.65rem', fontWeight:700 }}>{ord.id}</span>
                                <span className="flex items-center gap-1" style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.6rem' }}>
                                  <Clock size={9} /> {ord.time}
                                </span>
                              </div>
                              <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', fontWeight:500 }} className="mb-1 truncate">{ord.name}</div>
                              <div className="flex items-center justify-between">
                                <span style={{ color:'#10b981', fontSize:'0.7rem', fontWeight:700 }}>{ord.amount}</span>
                                <div className="flex gap-1">
                                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background:'rgba(255,255,255,0.05)' }}>
                                    <Printer size={10} style={{ color:'rgba(255,255,255,0.4)' }} />
                                  </div>
                                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background:'rgba(255,255,255,0.05)' }}>
                                    <MoveRight size={10} style={{ color:'rgba(255,255,255,0.4)' }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom bar — mini chart */}
                  <div className="mt-3 rounded-xl p-3 flex items-end gap-1.5 justify-between"
                    style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.65rem', fontWeight:600, whiteSpace:'nowrap', marginRight:4 }}>Ingresos 7 días</div>
                    <div className="flex items-end gap-1 flex-1" style={{ height:28 }}>
                      {[35,55,42,78,62,88,100].map((h,i) => (
                        <div key={i} className="flex-1 rounded-sm transition-all"
                          style={{ height:`${h}%`, background: i===6 ? 'linear-gradient(180deg,#10b981,#059669)' : 'rgba(16,185,129,0.18)' }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <TrendingUp size={12} style={{ color:'#10b981' }} />
                      <span style={{ color:'#10b981', fontSize:'0.7rem', fontWeight:700 }}>+23%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            {/* Ticket PDF */}
            <div className="float-a absolute -right-4 sm:-right-8 top-12 hidden md:block z-20">
              <div className="glass rounded-2xl p-3.5 flex items-center gap-3 shadow-2xl">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:'rgba(167,139,250,0.15)' }}>
                  <Receipt size={20} style={{ color:'#a78bfa' }} />
                </div>
                <div>
                  <div style={{ color:'white', fontSize:'0.75rem', fontWeight:700 }}>Ticket #0042 — PDF</div>
                  <div style={{ color:'#a78bfa', fontSize:'0.65rem' }}>Generado · Listo para imprimir ✓</div>
                </div>
              </div>
            </div>

            {/* WhatsApp notification */}
            <div className="float-b absolute -left-4 sm:-left-8 bottom-20 hidden md:block z-20">
              <div className="glass rounded-2xl p-3.5 flex items-center gap-3 shadow-2xl" style={{ maxWidth:220 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:'rgba(37,211,102,0.12)' }}>
                  <MessageCircle size={20} style={{ color:'#25d366' }} />
                </div>
                <div className="min-w-0">
                  <div style={{ color:'white', fontSize:'0.72rem', fontWeight:700 }}>WhatsApp · Cliente</div>
                  <div style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.63rem' }} className="truncate">✓ Tu pedido #0041 está en camino 🛵</div>
                </div>
              </div>
            </div>

            {/* Mobile catalog miniature */}
            <div className="float-a absolute -right-4 sm:-right-8 bottom-8 hidden lg:block z-20">
              <div className="glass rounded-2xl p-3 shadow-2xl">
                <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.6rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Catálogo Móvil</div>
                <div className="rounded-xl overflow-hidden" style={{ width:100, background:'#0d0d2b', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div className="p-2 text-center" style={{ background:'linear-gradient(135deg,#065f46,#047857)' }}>
                    <div style={{ color:'white', fontSize:'0.6rem', fontWeight:700 }}>🍕 Don Marco</div>
                    <div style={{ color:'#86efac', fontSize:'0.55rem' }}>⭐ 4.9 · Abierto</div>
                  </div>
                  {[['Pizza Margarita','S/35'],['Combo BBQ','S/45']].map(([n,p],i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1.5 border-t border-white/5">
                      <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.55rem' }} className="truncate">{n}</span>
                      <span style={{ color:'#10b981', fontSize:'0.6rem', fontWeight:700 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Social proof stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-12 border-t border-white/5 max-w-3xl mx-auto relative z-10">
            {proofStats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="g-emerald mb-1" style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(1.6rem,3vw,2.2rem)' }}>{s.value}</div>
                <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.8rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURES — Bento Grid
      ══════════════════════════════════════════════════ */}
      <section id="features" className="py-24" style={{ background:'#07071a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="section-pill mb-4"><Layers size={12} /> Los Pilares del Control</div>
            <h2 style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(2rem,4vw,3.2rem)', color:'white', marginBottom:'1rem', letterSpacing:'-0.02em' }}>
              Herramientas operativas para{' '}
              <span className="g-emerald">vender sin caos</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'1.05rem', maxWidth:560, margin:'0 auto' }}>
              Un ecosistema completo que pone el control del negocio en tus manos, no en las de la app de delivery.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large hero feature */}
            <div className="feat-card glass rounded-2xl p-7 lg:col-span-2 relative overflow-hidden" style={{ border:'1px solid rgba(59,130,246,0.15)', background:'linear-gradient(145deg,rgba(59,130,246,0.05),rgba(7,7,26,0.8))' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(circle at 80% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)' }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background:'rgba(59,130,246,0.12)' }}>
                  <LayoutDashboard size={26} style={{ color:'#60a5fa' }} />
                </div>
                <h3 style={{ fontFamily:'Space Grotesk', fontWeight:700, color:'white', fontSize:'1.25rem', marginBottom:'0.75rem' }}>
                  Dashboard de Pedidos en Tiempo Real
                </h3>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.9rem', lineHeight:1.7, marginBottom:'1.25rem', maxWidth:460 }}>
                  Pipeline visual tipo Kanban con columnas <strong style={{color:'rgba(255,255,255,0.75)'}}>Pendiente → En Proceso → Listo → Despachado</strong>. Filtra, gestiona y despacha cada orden sin perder el hilo. El corazón de tu operación en una sola pantalla.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['Actualizaciones instantáneas','Filtro por estado','Alertas sonoras','Multi-pedido'].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)', color:'#93c5fd' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Normal features */}
            {features.slice(1).map((f, i) => (
              <div key={i} className="feat-card glass rounded-2xl p-6 relative overflow-hidden">
                {f.badge && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={f.badge === 'PRO'
                      ? { background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.25)', color:'#c4b5fd' }
                      : { background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#6ee7b7' }}>
                    {f.badge}
                  </div>
                )}
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background:`${f.accentColor}15` }}>
                  <span style={{ color:f.accentColor }}>{f.icon}</span>
                </div>
                <h3 style={{ fontFamily:'Space Grotesk', fontWeight:700, color:'white', fontSize:'1rem', marginBottom:'0.5rem' }}>{f.title}</h3>
                <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.85rem', lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          HOW IT WORKS — Quick Steps
      ══════════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden" style={{ background:'rgba(255,255,255,0.01)' }}>
        <div className="absolute inset-0 dot-grid pointer-events-none opacity-40" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-14">
            <div className="section-pill mb-4"><Activity size={12} /> Cómo Funciona</div>
            <h2 style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(1.8rem,3.5vw,2.8rem)', color:'white', letterSpacing:'-0.02em' }}>
              Tu panel, activo en <span className="g-emerald">menos de 5 minutos</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { n:'01', icon:<Zap size={22}/>, title:'Crea tu cuenta', desc:'Registro gratuito en segundos. Sin tarjeta de crédito.' },
              { n:'02', icon:<ShoppingBag size={22}/>, title:'Publica tu catálogo', desc:'Agrega productos, precios e imágenes. Tu link ya está listo.' },
              { n:'03', icon:<Bell size={22}/>, title:'Recibe pedidos', desc:'Los pedidos entran al Dashboard y a tu WhatsApp al instante.' },
              { n:'04', icon:<Printer size={22}/>, title:'Despacha e imprime', desc:'Un clic para mover el estado y emitir el ticket PDF térmico.' },
            ].map((step, i) => (
              <div key={i} className="glass rounded-2xl p-5 text-center feat-card">
                <div className="text-xs font-bold mb-3" style={{ color:'rgba(255,255,255,0.2)', letterSpacing:'0.12em' }}>{step.n}</div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background:'rgba(16,185,129,0.1)' }}>
                  <span style={{ color:'#10b981' }}>{step.icon}</span>
                </div>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:700, color:'white', fontSize:'0.9rem', marginBottom:'0.4rem' }}>{step.title}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem', lineHeight:1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          SAVINGS CALCULATOR
      ══════════════════════════════════════════════════ */}
      <section id="calculator" className="py-24 relative overflow-hidden" style={{ background:'#07071a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="section-pill mb-4"><DollarSign size={12} /> Calculadora de Ahorro</div>
            <h2 style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(1.8rem,3.5vw,2.8rem)', color:'white', letterSpacing:'-0.02em', marginBottom:'0.75rem' }}>
              ¿Cuánto te están <span style={{ background:'linear-gradient(135deg,#ef4444,#f87171)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>cobrando</span> de más?
            </h2>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'1rem' }}>
              Las plataformas de delivery cobran hasta <strong style={{ color:'rgba(255,255,255,0.7)' }}>20% por pedido</strong>. Link Ventas cobra <strong style={{ color:'#10b981' }}>S/ 0 de comisión</strong>.
            </p>
          </div>

          <div className="glass rounded-3xl p-8 sm:p-12">
            {/* Slider */}
            <div className="mb-10">
              <div className="flex justify-between items-end mb-4">
                <label style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.8rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.12em' }}>Pedidos al Mes</label>
                <div className="g-emerald" style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'2.5rem' }}>{animatedOrders}</div>
              </div>
              <input
                id="orders-slider"
                type="range" min={10} max={500} step={5}
                value={orders}
                onChange={e => setOrders(Number(e.target.value))}
                style={{ width:'100%', accentColor:'#10b981', cursor:'pointer' }}
              />
              <div className="flex justify-between mt-2" style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.72rem' }}>
                <span>10</span><span>500 pedidos</span>
              </div>
            </div>

            {/* Comparison */}
            <div className="grid sm:grid-cols-2 gap-5 mb-8">
              <div className="rounded-2xl p-6" style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'rgba(239,68,68,0.12)' }}>
                    <Package size={16} style={{ color:'#f87171' }} />
                  </div>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', fontWeight:600 }}>Apps de Delivery (20%)</span>
                </div>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:800, color:'#f87171', fontSize:'2rem', marginBottom:'0.25rem' }}>
                  S/ {deliveryCost.toLocaleString('es-PE', { maximumFractionDigits:0 })}
                </div>
                <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.72rem' }}>20% × S/{avgTicket} × {animatedOrders} pedidos</div>
                <div style={{ color:'rgba(248,113,113,0.6)', fontSize:'0.72rem', marginTop:'0.5rem' }}>⚠ Dinero que pierdes cada mes</div>
              </div>

              <div className="rounded-2xl p-6" style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.18)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'rgba(16,185,129,0.12)' }}>
                    <LayoutDashboard size={16} style={{ color:'#10b981' }} />
                  </div>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', fontWeight:600 }}>Con Link Ventas Pro</span>
                </div>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:800, color:'#10b981', fontSize:'2rem', marginBottom:'0.25rem' }}>
                  S/ {linkVentasCost}
                </div>
                <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.72rem' }}>Costo fijo mensual · 0% de comisión</div>
                <div style={{ color:'rgba(16,185,129,0.6)', fontSize:'0.72rem', marginTop:'0.5rem' }}>✓ Sin sorpresas al final del mes</div>
              </div>
            </div>

            {/* Result */}
            <div className="rounded-2xl p-7 text-center" style={{ background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(139,92,246,0.07))', border:'1px solid rgba(16,185,129,0.18)' }}>
              {savings > 0 ? (
                <>
                  <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', marginBottom:'0.5rem', fontWeight:500 }}>¡Te ahorrarías cada mes!</div>
                  <div className="g-emerald" style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(2.5rem,6vw,4rem)', lineHeight:1, marginBottom:'0.5rem' }}>
                    S/ {savings.toLocaleString('es-PE', { maximumFractionDigits:0 })}
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.85rem' }}>
                    Equivale a <strong style={{ color:'white' }}>{Math.round(savings / avgTicket)} pedidos extra</strong> de ganancia pura al mes
                  </div>
                </>
              ) : (
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.9rem' }}>Sube el slider y ve cómo crece el ahorro 🚀</div>
              )}
            </div>

            <div className="mt-8 text-center">
              <Link href="/login" className="btn-emerald px-8 py-4 text-base">
                <Sparkles size={20} /> Empezar a Ahorrar Ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24" style={{ background:'rgba(255,255,255,0.01)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="section-pill mb-4"><DollarSign size={12} /> Precios</div>
            <h2 style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(1.8rem,3.5vw,2.8rem)', color:'white', marginBottom:'0.75rem', letterSpacing:'-0.02em' }}>
              Simple, justo y <span className="g-emerald">transparente</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'1rem' }}>Sin letra pequeña. Sin comisiones. Solo tu tarifa mensual fija.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="glass rounded-3xl p-8 flex flex-col">
              <div className="mb-6">
                <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:'0.5rem' }}>Plan Emprendedor</div>
                <div className="flex items-end gap-2 mb-2">
                  <span style={{ fontFamily:'Space Grotesk', fontWeight:800, color:'white', fontSize:'3rem' }}>S/ 0</span>
                  <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.85rem', marginBottom:'0.5rem' }}>/mes</span>
                </div>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.85rem' }}>Para empezar a vender sin invertir un sol.</p>
              </div>
              <div className="flex-1 space-y-3 mb-8">
                {[
                  'Dashboard de control básico',
                  'Catálogo digital público (30 productos)',
                  'Pedidos entrantes ilimitados',
                  'Notificaciones a WhatsApp',
                  '0% de comisiones sobre ventas',
                  'Soporte estándar por email',
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle size={15} style={{ color:'#10b981', marginTop:2, flexShrink:0 }} />
                    <span style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.85rem' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" id="pricing-free-cta" className="btn-outline px-6 py-3.5 justify-center font-semibold text-sm">
                Crear cuenta gratis <ArrowRight size={16} />
              </Link>
            </div>

            {/* Pro */}
            <div className="price-pro rounded-3xl p-8 flex flex-col relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#10b981,#059669)' }}>
                  <Star size={11} fill="white" /> MÁS POPULAR
                </div>
              </div>
              <div className="mb-6">
                <div style={{ color:'#34d399', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:'0.5rem' }}>Plan Pro</div>
                <div className="flex items-end gap-2 mb-2">
                  <span style={{ fontFamily:'Space Grotesk', fontWeight:800, color:'white', fontSize:'3rem' }}>S/ 29</span>
                  <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.85rem', marginBottom:'0.5rem' }}>/mes</span>
                </div>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem' }}>Control operativo completo para escalar tus ventas.</p>
              </div>
              <div className="flex-1 space-y-3 mb-8">
                {[
                  'Todo del Plan Emprendedor',
                  'Productos ilimitados en el catálogo',
                  'Pipeline Kanban completo + filtros avanzados',
                  'Pasarela de pagos Culqi (Visa / Mastercard / billeteras)',
                  'Tickets PDF térmicos de 80mm (impresión directa)',
                  'Módulo analítico avanzado en tiempo real',
                  'Alertas de rescate de clientes inactivos',
                  'Soporte prioritario 24/7',
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle size={15} style={{ color:'#10b981', marginTop:2, flexShrink:0 }} />
                    <span style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.85rem' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" id="pricing-pro-cta" className="btn-emerald px-6 py-3.5 justify-center font-bold text-sm">
                Activar Plan Pro <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-2" style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.82rem' }}>
              <Shield size={14} style={{ color:'rgba(16,185,129,0.5)' }} />
              Sin permanencia · Cancela cuando quieras · Sin comisiones ocultas
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════ */}
      <section id="faq" className="py-24 relative overflow-hidden" style={{ background:'#07071a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(139,92,246,0.05) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="section-pill mb-4">Dudas Operativas</div>
            <h2 style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(1.8rem,3.5vw,2.8rem)', color:'white', marginBottom:'0.75rem', letterSpacing:'-0.02em' }}>
              Preguntas <span className="g-emerald">frecuentes</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'1rem' }}>Las preguntas que hacen los dueños de negocio antes de empezar.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} id={`faq-${i}`} className="glass rounded-2xl overflow-hidden transition-all duration-200"
                style={{ border: openFaq === i ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span style={{ fontWeight:600, color:'white', fontSize:'0.95rem', lineHeight:1.4 }}>{faq.q}</span>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: openFaq === i ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      color: openFaq === i ? '#10b981' : 'rgba(255,255,255,0.3)',
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
                    <ChevronDown size={17} />
                  </div>
                </button>
                <div className={`faq-body ${openFaq === i ? 'open' : ''}`}>
                  <div className="px-6 pb-6 border-t border-white/5 pt-4"
                    style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.875rem', lineHeight:1.75 }}>
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 glass rounded-2xl p-8 text-center">
            <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.8rem', marginBottom:'0.5rem' }}>¿Tienes otra pregunta?</div>
            <h3 style={{ fontFamily:'Space Grotesk', fontWeight:700, color:'white', fontSize:'1.3rem', marginBottom:'1.25rem' }}>Hablamos por WhatsApp 💬</h3>
            <a href="https://wa.me/51999999999?text=Hola,%20tengo%20una%20consulta%20sobre%20Link%20Ventas"
              target="_blank" rel="noopener noreferrer"
              className="btn-emerald px-6 py-3.5 text-sm">
              <MessageCircle size={18} /> Chatear ahora
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════ */}
      <section className="py-28 relative overflow-hidden" style={{ background:'rgba(255,255,255,0.01)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(135deg,rgba(16,185,129,0.07) 0%,rgba(7,7,26,1) 50%,rgba(139,92,246,0.06) 100%)' }} />
        <div className="absolute inset-0 dot-grid pointer-events-none opacity-50" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="section-pill mb-6 inline-flex">Empieza gratis hoy</div>
          <h2 style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:'clamp(2rem,5vw,3.8rem)', color:'white', lineHeight:1.05, letterSpacing:'-0.03em', marginBottom:'1.25rem' }}>
            Tu panel de control,<br />
            <span className="g-emerald">listo en minutos</span>
          </h2>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'1.1rem', maxWidth:500, margin:'0 auto 2.5rem' }}>
            Únete a +2,400 comercios que ya gestionan sus pedidos con control total y sin pagar comisiones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" id="final-cta" className="btn-emerald px-10 py-4 text-lg">
              <LayoutDashboard size={22} /> Iniciar mi Panel Gratis
            </Link>
            <Link href="/login" className="btn-outline px-10 py-4 text-lg">
              Ingresar a mi cuenta
            </Link>
          </div>
          <p style={{ marginTop:'1.25rem', color:'rgba(255,255,255,0.18)', fontSize:'0.82rem' }}>
            Sin tarjeta · Sin permanencia · Sin comisiones
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'4rem', paddingBottom:'3rem', background:'#040410' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <a href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#10b981,#059669)' }}>
                  <Zap size={18} color="white" />
                </div>
                <span style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'1.15rem', color:'white' }}>
                  Link<span className="g-emerald">Ventas</span>
                </span>
              </a>
              <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.83rem', lineHeight:1.7, maxWidth:280, marginBottom:'1.25rem' }}>
                El panel de control definitivo para gestionar pedidos, emitir tickets y cobrar en línea. SaaS B2B para negocios locales que quieren vender más.
              </p>
              <div className="flex gap-3">
                {[Instagram, Twitter, Facebook, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{ border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.25)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='white'; (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.07)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.background='transparent' }}>
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Producto */}
            <div>
              <h4 style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:'1rem' }}>Producto</h4>
              <ul className="space-y-3">
                {[['#features','Dashboard'],['#features','Catálogo Digital'],['#features','Ticketera PDF'],['#features','Pagos Culqi'],['#pricing','Precios']].map(([href,label],i) => (
                  <li key={i}><a href={href} style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.83rem', transition:'color 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='white'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.28)'}>{label}</a></li>
                ))}
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <h4 style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:'1rem' }}>Recursos</h4>
              <ul className="space-y-3">
                {[['#faq','Preguntas Frecuentes'],['#','Guía de Inicio'],['#','Blog'],['#','Soporte WhatsApp'],['#','Estado del Sistema']].map(([href,label],i) => (
                  <li key={i}><a href={href} style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.83rem', transition:'color 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='white'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.28)'}>{label}</a></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:'1rem' }}>Legal</h4>
              <ul className="space-y-3">
                {['Política de Privacidad','Términos de Uso','Cookies','Reembolsos'].map((l,i) => (
                  <li key={i}><a href="#" style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.83rem', transition:'color 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='white'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.28)'}>{l}</a></li>
                ))}
              </ul>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all"
                style={{ border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.25)', fontSize:'0.72rem' }}>
                <Globe size={13} />
                <span>PEN (S/) · Perú</span>
                <ChevronDown size={11} />
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-8">
            <p style={{ color:'rgba(255,255,255,0.18)', fontSize:'0.8rem' }}>© 2026 Link Ventas. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2" style={{ color:'rgba(255,255,255,0.18)', fontSize:'0.72rem' }}>
              <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Todos los sistemas operativos
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}