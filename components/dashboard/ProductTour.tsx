'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Compass, X } from 'lucide-react'

type ProductTourProps = {
  userId: string
}

type TourStep = {
  title: string
  description: string
  target?: string
  eyebrow: string
  settingsTab?: string
}

type TourConfig = {
  id: string
  version?: string
  steps: TourStep[]
}

type HighlightRect = {
  top: number
  left: number
  width: number
  height: number
}

const TOUR_VERSION = 'v2'
const SPOTLIGHT_GAP = 8
const TOOLTIP_WIDTH = 380
const TOOLTIP_HEIGHT = 330

const TOUR_CONFIGS: Record<string, TourConfig> = {
  dashboard: {
    id: 'dashboard',
    steps: [
      { eyebrow: 'Panel principal', title: 'Tu operación de un vistazo', description: 'Este panel reúne lo importante del día. Aquí podrás detectar rápidamente qué necesita tu atención.' },
      { eyebrow: 'Resumen diario', title: 'Revisa el estado del negocio', description: 'Consulta ingresos confirmados, pedidos recibidos, pendientes y oportunidades comerciales.', target: '[data-tour="dashboard-metrics"]' },
      { eyebrow: 'Catálogo', title: 'Crea un producto cuando lo necesites', description: 'Este acceso abre el formulario para agregar fotos, precio, stock y detalles de venta.', target: '#tour-create-product' },
      { eyebrow: 'Actividad reciente', title: 'Controla los pedidos nuevos', description: 'La bandeja resume las últimas ventas. Usa los filtros para localizar un cliente o estado específico.', target: '[data-tour="dashboard-orders"]' },
      { eyebrow: 'Tienda pública', title: 'Comprueba la experiencia del cliente', description: 'Abre tu tienda pública antes de compartirla y verifica que productos, precios y entrega estén correctos.', target: '#tour-public-store' },
    ],
  },
  orders: {
    id: 'orders',
    steps: [
      { eyebrow: 'Pedidos', title: 'Gestiona cada venta de principio a fin', description: 'Esta sección concentra los pedidos, pagos y entregas de tu tienda.', target: '[data-tour="orders-header"]' },
      { eyebrow: 'Búsqueda y filtros', title: 'Encuentra un pedido rápidamente', description: 'Busca por ID, cliente o teléfono y filtra por estado cuando tengas una bandeja extensa.', target: '[data-tour="orders-filters"]' },
      { eyebrow: 'Vistas de trabajo', title: 'Separa pedidos y oportunidades', description: 'Cambia entre delivery, otros pedidos y oportunidades captadas según el tipo de tienda.', target: '[data-tour="orders-tabs"]' },
      { eyebrow: 'Operación', title: 'Actualiza el avance del pedido', description: 'Abre cada pedido para revisar productos, datos del cliente, comprobantes y cambiar su estado hasta completarlo.', target: '[data-tour="orders-workspace"]' },
    ],
  },
  customers: {
    id: 'customers',
    steps: [
      { eyebrow: 'Clientes', title: 'Conoce quién compra y quién está interesado', description: 'Aquí se separan compradores reales de personas que todavía son oportunidades.', target: '[data-tour="customers-header"]' },
      { eyebrow: 'Dos vistas', title: 'Clientes y oportunidades no son lo mismo', description: 'Clientes muestra compras confirmadas. Oportunidades reúne leads y carritos que puedes recuperar.', target: '[data-tour="customers-views"]' },
      { eyebrow: 'Indicadores', title: 'Identifica clientes valiosos', description: 'Consulta compradores, recurrencia y valor acumulado para entender mejor tu base comercial.', target: '[data-tour="customers-metrics"]' },
      { eyebrow: 'Historial', title: 'Revisa actividad y contacto', description: 'La tabla muestra pedidos, última compra, datos de contacto y valor total por cliente.', target: '[data-tour="customers-list"]' },
      { eyebrow: 'Seguimiento', title: 'Recupera oportunidades por WhatsApp', description: 'En la vista Oportunidades puedes contactar a una persona interesada y convertirla en cliente.', target: '[data-tour="customers-views"]' },
    ],
  },
  products: {
    id: 'products',
    steps: [
      { eyebrow: 'Productos', title: 'Administra todo tu catálogo', description: 'Desde aquí controlas qué vendes, cuánto cuesta, el stock disponible y su visibilidad.', target: '[data-tour="products-header"]' },
      { eyebrow: 'Acciones rápidas', title: 'Crea o importa productos', description: 'Agrega un producto individual o importa varios mediante una hoja de cálculo.', target: '[data-tour="products-actions"]' },
      { eyebrow: 'Visibilidad', title: 'Comprueba qué está publicado', description: 'Un producto oculto no aparece en la tienda. Revisa también el stock antes de compartir tu catálogo.', target: '[data-tour="products-table"]' },
      { eyebrow: 'Edición', title: 'Actualiza o elimina con cuidado', description: 'Usa las acciones de cada fila para editar información. La eliminación es permanente y requiere confirmación.', target: '[data-tour="products-table"]' },
    ],
  },
  analytics: {
    id: 'analytics',
    steps: [
      { eyebrow: 'Analytics', title: 'Convierte tus ventas en decisiones', description: 'Este espacio resume el rendimiento comercial. Si tu plan aún no incluye Analytics, aquí verás las funciones disponibles antes de activarlo.', target: '[data-tour="analytics-header"], [data-tour="analytics-locked"]' },
      { eyebrow: 'Periodo y exportación', title: 'Analiza el rango correcto', description: 'Compara 7 días, 30 días o todo el historial. También puedes exportar los datos a CSV.', target: '[data-tour="analytics-controls"]' },
      { eyebrow: 'Indicadores', title: 'Lee primero los números principales', description: 'Ingresos, ticket promedio, conversión y pedidos completados muestran la salud general de la operación.', target: '[data-tour="analytics-metrics"]' },
      { eyebrow: 'Alertas comerciales', title: 'Detecta señales que requieren atención', description: 'Las observaciones aparecen cuando existen datos suficientes y señalan riesgos u oportunidades concretas.', target: '[data-tour="analytics-insights"]' },
      { eyebrow: 'Tendencias', title: 'Entiende cuándo y cómo te compran', description: 'Los gráficos muestran evolución de ingresos y preferencias de pago para orientar tus siguientes acciones.', target: '[data-tour="analytics-charts"]' },
    ],
  },
  settings: {
    id: 'settings',
    version: 'v3',
    steps: [
      { eyebrow: 'Ajustes de tienda', title: 'Configura cómo se presenta y opera tu negocio', description: 'Los cambios de esta sección afectan la información pública, el checkout y la forma de atender pedidos.', target: '[data-tour="settings-header"]' },
      { eyebrow: 'Cuenta y plan', title: 'Comprueba el estado de tu cuenta', description: 'Aquí puedes consultar el correo asociado y el plan activo. El identificador técnico sirve únicamente para soporte.', target: '[data-tour="settings-account"]', settingsTab: 'general' },
      { eyebrow: 'Identidad pública', title: 'Completa la información básica de tu tienda', description: 'Sube un logo claro, usa el nombre comercial real, define un enlace corto y explica en una frase qué vendes.', target: '[data-tour="settings-identity"]', settingsTab: 'general' },
      { eyebrow: 'Plantilla y experiencia', title: 'Elige el modelo correcto de tienda', description: 'Comercio usa catálogo y checkout estándar; Restaurante prioriza menú y tiempos; Moda incorpora tallas, colores y políticas de cambio. Cambiar la plantilla puede requerir revisar tus productos.', target: '[data-tour="settings-panel-plantilla"]', settingsTab: 'plantilla' },
      { eyebrow: 'Diseño y apariencia', title: 'Construye una identidad consistente', description: 'Sube una portada nítida y elige colores con buen contraste. La foto Hero se utiliza especialmente en la plantilla Moda.', target: '[data-tour="settings-panel-diseno"]', settingsTab: 'diseno' },
      { eyebrow: 'Pagos y facturación', title: 'Define cómo recibirás el dinero', description: 'Configura los métodos manuales disponibles. Si usas Mercado Pago, activa la pasarela solo después de completar y comprobar sus credenciales.', target: '[data-tour="settings-panel-pagos"]', settingsTab: 'pagos' },
      { eyebrow: 'Logística y horarios', title: 'Explica exactamente cómo entregas', description: 'Define delivery, recojo, cobertura, dirección, tiempos y horarios. Las opciones cambian según la plantilla de tu negocio.', target: '[data-tour="settings-panel-logistica"]', settingsTab: 'logistica' },
      { eyebrow: 'Marketing y redes', title: 'Conecta tus canales de atención', description: 'Agrega usuarios o enlaces correctos para Instagram, TikTok, Facebook y WhatsApp. La señal de stock usa inventario real.', target: '[data-tour="settings-panel-marketing"]', settingsTab: 'marketing' },
      { eyebrow: 'Contenido de tienda', title: 'Resuelve dudas antes de la compra', description: 'Publica promociones concretas, hasta cuatro beneficios verificables y preguntas frecuentes sobre envíos, pagos o cambios.', target: '[data-tour="settings-panel-contenido"]', settingsTab: 'contenido' },
      { eyebrow: 'Antes de terminar', title: 'Guarda y revisa tu tienda pública', description: 'Cuando realices un cambio aparecerá la barra Guardar cambios. Después abre tu tienda pública y verifica el resultado como cliente.', target: '#tour-public-store' },
    ],
  },
  productForm: {
    id: 'product-form',
    steps: [
      { eyebrow: 'Ficha de producto', title: 'Completa la información que verá el cliente', description: 'El formulario adapta algunas opciones a Comercio, Restaurante o Moda.', target: '[data-tour="product-form"]' },
      { eyebrow: 'Información principal', title: 'Usa un nombre y descripción claros', description: 'Escribe qué es el producto, su categoría y el beneficio principal. Evita nombres internos o descripciones ambiguas.', target: '#product-name' },
      { eyebrow: 'Precio e inventario', title: 'Define valores listos para vender', description: 'Ingresa el precio final y controla el stock. El precio anterior solo debe usarse cuando exista una comparación real.', target: '#product-price' },
      { eyebrow: 'Contenido visual', title: 'Sube imágenes que ayuden a decidir', description: 'Usa fotografías nítidas y ordena la galería. En Moda, completa también tallas, colores y existencias por variante.', target: '[data-tour="product-form"]' },
      { eyebrow: 'Guardar', title: 'Revisa antes de continuar', description: 'Comprueba nombre, precio, imágenes y stock. Después de guardar, verifica la visibilidad desde Productos.', target: '[data-tour="product-save"]' },
    ],
  },
}

function getTourConfig(pathname: string): TourConfig | null {
  if (pathname === '/dashboard') return TOUR_CONFIGS.dashboard
  if (pathname === '/dashboard/pedidos') return TOUR_CONFIGS.orders
  if (pathname === '/dashboard/clientes') return TOUR_CONFIGS.customers
  if (pathname === '/dashboard/productos') return TOUR_CONFIGS.products
  if (pathname === '/dashboard/analytics') return TOUR_CONFIGS.analytics
  if (pathname === '/dashboard/configuracion') return TOUR_CONFIGS.settings
  if (pathname === '/dashboard/crear' || pathname.startsWith('/dashboard/editar/')) return TOUR_CONFIGS.productForm
  return null
}

function isVisibleTarget(element: Element, rect: DOMRect) {
  const style = window.getComputedStyle(element)
  return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
}

export default function ProductTour({ userId }: ProductTourProps) {
  const pathname = usePathname()
  const config = getTourConfig(pathname)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)

  const storageKey = useMemo(
    () => config ? `linkventas:product-tour:${config.version ?? TOUR_VERSION}:${userId}:${config.id}` : '',
    [config, userId],
  )
  const steps = config?.steps ?? []
  const step = steps[stepIndex]

  const startTour = useCallback(() => {
    if (!config) return
    setStepIndex(0)
    setOpen(true)
  }, [config])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setOpen(false)
    setStepIndex(0)
    if (!config || !storageKey) return

    const savedState = window.localStorage.getItem(storageKey)
    const timer = savedState ? undefined : window.setTimeout(startTour, 700)
    return () => { if (timer) window.clearTimeout(timer) }
  }, [config, startTour, storageKey])

  useEffect(() => {
    const handleStart = () => startTour()
    window.addEventListener('linkventas:start-product-tour', handleStart)
    return () => window.removeEventListener('linkventas:start-product-tour', handleStart)
  }, [startTour])

  useEffect(() => {
    if (!open || !step) return
    let settleTimer: number | undefined

    if (step.settingsTab) {
      window.dispatchEvent(new CustomEvent('linkventas:tour-setting-tab', { detail: step.settingsTab }))
    }

    const updateHighlight = () => {
      if (!step.target) {
        setHighlight(null)
        return
      }

      const element = Array.from(document.querySelectorAll(step.target)).find(candidate => {
        const candidateRect = candidate.getBoundingClientRect()
        return isVisibleTarget(candidate, candidateRect)
      })
      if (!element) {
        setHighlight(null)
        return
      }

      const rect = element.getBoundingClientRect()
      if (!isVisibleTarget(element, rect)) {
        setHighlight(null)
        return
      }

      if (rect.bottom < 72 || rect.top > window.innerHeight - 40) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        settleTimer = window.setTimeout(updateHighlight, 350)
        return
      }

      const top = Math.max(8, rect.top - SPOTLIGHT_GAP)
      const left = Math.max(8, rect.left - SPOTLIGHT_GAP)
      const right = Math.min(window.innerWidth - 8, rect.right + SPOTLIGHT_GAP)
      const bottom = Math.min(window.innerHeight - 8, rect.bottom + SPOTLIGHT_GAP)
      setHighlight({ top, left, width: right - left, height: bottom - top })
    }

    const frame = window.requestAnimationFrame(() => {
      if (step.settingsTab) settleTimer = window.setTimeout(updateHighlight, 220)
      else updateHighlight()
    })
    window.addEventListener('resize', updateHighlight)
    window.addEventListener('scroll', updateHighlight, true)
    return () => {
      window.cancelAnimationFrame(frame)
      if (settleTimer) window.clearTimeout(settleTimer)
      window.removeEventListener('resize', updateHighlight)
      window.removeEventListener('scroll', updateHighlight, true)
    }
  }, [open, step])

  useEffect(() => {
    if (!open || !storageKey) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.localStorage.setItem(storageKey, 'skipped')
        setOpen(false)
      }
      if (event.key === 'ArrowRight' && stepIndex < steps.length - 1) setStepIndex(current => current + 1)
      if (event.key === 'ArrowLeft' && stepIndex > 0) setStepIndex(current => current - 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, stepIndex, steps.length, storageKey])

  const finishTour = () => {
    window.localStorage.setItem(storageKey, 'completed')
    setOpen(false)
  }

  const skipTour = () => {
    window.localStorage.setItem(storageKey, 'skipped')
    setOpen(false)
  }

  const nextStep = () => {
    if (stepIndex === steps.length - 1) finishTour()
    else setStepIndex(current => current + 1)
  }

  const tooltipStyle = useMemo(() => {
    if (!highlight || typeof window === 'undefined') return undefined
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - 32)
    const spaceBelow = window.innerHeight - highlight.top - highlight.height
    const spaceAbove = highlight.top
    let top = Math.max(16, window.innerHeight - TOOLTIP_HEIGHT - 16)
    if (spaceBelow >= TOOLTIP_HEIGHT + 16) top = highlight.top + highlight.height + 16
    else if (spaceAbove >= TOOLTIP_HEIGHT + 16) top = highlight.top - TOOLTIP_HEIGHT - 16
    const left = Math.min(Math.max(16, highlight.left + highlight.width / 2 - width / 2), window.innerWidth - width - 16)
    return { top, left, width }
  }, [highlight])

  if (!mounted || !open || !config || !step) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={`Guía de ${config.id}`}>
      {highlight ? (
        <>
          <div className="fixed inset-x-0 top-0 bg-slate-950/45" style={{ height: highlight.top }} />
          <div className="fixed left-0 bg-slate-950/45" style={{ top: highlight.top, width: highlight.left, height: highlight.height }} />
          <div className="fixed right-0 bg-slate-950/45" style={{ top: highlight.top, left: highlight.left + highlight.width, height: highlight.height }} />
          <div className="fixed inset-x-0 bottom-0 bg-slate-950/45" style={{ top: highlight.top + highlight.height }} />
          <div aria-hidden="true" className="pointer-events-none fixed rounded-2xl border-2 border-blue-500 shadow-[0_0_0_4px_rgba(37,99,235,0.16),0_18px_55px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out" style={highlight} />
        </>
      ) : (
        <div className="fixed inset-0 bg-slate-950/45" />
      )}

      <article
        className={`${highlight ? 'fixed' : 'fixed left-1/2 top-1/2 w-[min(430px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2'} overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.24)] animate-in fade-in zoom-in-95 duration-200`}
        style={tooltipStyle}
      >
        <div className="h-1 bg-blue-600" />
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              {stepIndex === steps.length - 1 ? <Check size={19} /> : <Compass size={19} />}
            </div>
            <button type="button" onClick={skipTour} aria-label="Cerrar guía" className="rounded-full p-2 text-slate-400 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700 active:scale-95">
              <X size={17} />
            </button>
          </div>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{step.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">{step.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>

          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}>
              {steps.map((tourStep, index) => (
                <span key={tourStep.title} aria-hidden="true" className={`h-1.5 rounded-full transition-all duration-300 ${index === stepIndex ? 'w-6 bg-blue-600' : index < stepIndex ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-slate-200'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stepIndex === 0 ? (
                <button type="button" onClick={skipTour} className="rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-800 active:scale-95">Omitir</button>
              ) : (
                <button type="button" onClick={() => setStepIndex(current => current - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 active:scale-95" aria-label="Paso anterior">
                  <ArrowLeft size={16} />
                </button>
              )}
              <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.20)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700 active:scale-95">
                {stepIndex === steps.length - 1 ? 'Entendido' : 'Siguiente'}
                {stepIndex === steps.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  )
}
