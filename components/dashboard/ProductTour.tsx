'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react'

type ProductTourProps = {
  userId: string
}

type TourStep = {
  title: string
  description: string
  target?: string
  eyebrow: string
}

type HighlightRect = {
  top: number
  left: number
  width: number
  height: number
}

const TOUR_VERSION = 'v1'
const SPOTLIGHT_GAP = 8
const TOOLTIP_WIDTH = 368

const STEPS: TourStep[] = [
  {
    eyebrow: 'Bienvenido a LinkVentas',
    title: 'Tu negocio, en un solo lugar.',
    description: 'En menos de un minuto conocerás dónde crear productos, atender pedidos y preparar tu tienda para vender.',
  },
  {
    eyebrow: 'Tu centro de operaciones',
    title: 'Empieza cada día desde aquí.',
    description: 'Este resumen te muestra ingresos confirmados, pedidos pendientes y oportunidades que requieren atención.',
    target: '#tour-dashboard-summary',
  },
  {
    eyebrow: 'Construye tu catálogo',
    title: 'Publica tu primer producto.',
    description: 'Agrega fotos, precio, stock y variantes. Recuerda activar el producto para que aparezca en tu tienda.',
    target: '#tour-create-product',
  },
  {
    eyebrow: 'Opera tus ventas',
    title: 'Gestiona cada pedido.',
    description: 'Revisa nuevos pedidos, confirma pagos y actualiza su estado hasta completar la entrega.',
    target: '[data-tour="orders"]',
  },
  {
    eyebrow: 'Hazla tuya',
    title: 'Configura la experiencia.',
    description: 'Define identidad, plantilla, pagos, horarios y logística desde Ajustes Tienda.',
    target: '[data-tour="settings"]',
  },
  {
    eyebrow: 'Ya puedes comenzar',
    title: 'Mira tu tienda como cliente.',
    description: 'Abre tu vitrina pública, comprueba la experiencia y comparte el enlace con tus clientes.',
    target: '#tour-public-store',
  },
]

function isVisibleTarget(element: Element, rect: DOMRect) {
  const style = window.getComputedStyle(element)
  return style.visibility !== 'hidden'
    && style.display !== 'none'
    && rect.width > 0
    && rect.height > 0
    && rect.right > 0
    && rect.left < window.innerWidth
    && rect.bottom > 0
    && rect.top < window.innerHeight
}

export default function ProductTour({ userId }: ProductTourProps) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)

  const storageKey = useMemo(() => `linkventas:product-tour:${TOUR_VERSION}:${userId}`, [userId])
  const step = STEPS[stepIndex]

  const startTour = useCallback(() => {
    setStepIndex(0)
    setOpen(true)
  }, [])

  useEffect(() => {
    setMounted(true)
    const savedState = window.localStorage.getItem(storageKey)
    const timer = savedState ? undefined : window.setTimeout(startTour, 900)

    const handleStart = () => startTour()
    window.addEventListener('linkventas:start-product-tour', handleStart)

    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('linkventas:start-product-tour', handleStart)
    }
  }, [startTour, storageKey])

  useEffect(() => {
    if (!open) return

    const updateHighlight = () => {
      if (!step.target) {
        setHighlight(null)
        return
      }

      const element = document.querySelector(step.target)
      if (!element) {
        setHighlight(null)
        return
      }

      const rect = element.getBoundingClientRect()
      if (!isVisibleTarget(element, rect)) {
        setHighlight(null)
        return
      }

      setHighlight({
        top: Math.max(8, rect.top - SPOTLIGHT_GAP),
        left: Math.max(8, rect.left - SPOTLIGHT_GAP),
        width: Math.min(window.innerWidth - 16, rect.width + SPOTLIGHT_GAP * 2),
        height: Math.min(window.innerHeight - 16, rect.height + SPOTLIGHT_GAP * 2),
      })
    }

    const frame = window.requestAnimationFrame(updateHighlight)
    window.addEventListener('resize', updateHighlight)
    window.addEventListener('scroll', updateHighlight, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateHighlight)
      window.removeEventListener('scroll', updateHighlight, true)
    }
  }, [open, step.target])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.localStorage.setItem(storageKey, 'skipped')
        setOpen(false)
      }
      if (event.key === 'ArrowRight' && stepIndex < STEPS.length - 1) setStepIndex(current => current + 1)
      if (event.key === 'ArrowLeft' && stepIndex > 0) setStepIndex(current => current - 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, stepIndex, storageKey])

  const finishTour = () => {
    window.localStorage.setItem(storageKey, 'completed')
    setOpen(false)
  }

  const skipTour = () => {
    window.localStorage.setItem(storageKey, 'skipped')
    setOpen(false)
  }

  const nextStep = () => {
    if (stepIndex === STEPS.length - 1) {
      finishTour()
      return
    }
    setStepIndex(current => current + 1)
  }

  const tooltipStyle = useMemo(() => {
    if (!highlight) return undefined
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - 32)
    const belowTop = highlight.top + highlight.height + 16
    const aboveTop = highlight.top - 16 - 300
    const top = belowTop + 300 <= window.innerHeight
      ? belowTop
      : Math.max(16, aboveTop)
    const left = Math.min(
      Math.max(16, highlight.left + highlight.width / 2 - width / 2),
      window.innerWidth - width - 16,
    )
    return { top, left, width }
  }, [highlight])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Visita guiada de LinkVentas">
      {highlight ? (
        <>
          <div className="fixed inset-x-0 top-0 bg-zinc-950/70 backdrop-blur-[1px]" style={{ height: highlight.top }} />
          <div className="fixed left-0 bg-zinc-950/70 backdrop-blur-[1px]" style={{ top: highlight.top, width: highlight.left, height: highlight.height }} />
          <div className="fixed right-0 bg-zinc-950/70 backdrop-blur-[1px]" style={{ top: highlight.top, left: highlight.left + highlight.width, height: highlight.height }} />
          <div className="fixed inset-x-0 bottom-0 bg-zinc-950/70 backdrop-blur-[1px]" style={{ top: highlight.top + highlight.height }} />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed rounded-2xl border-2 border-violet-300 shadow-[0_0_0_4px_rgba(196,181,253,0.22),0_18px_60px_rgba(76,29,149,0.28)] transition-all duration-300 ease-out"
            style={highlight}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-zinc-950/76 backdrop-blur-sm" />
      )}

      <article
        className={`${highlight ? 'fixed' : 'fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2'} overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#171719]/95 text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300`}
        style={tooltipStyle}
      >
        <div className="h-1 bg-[linear-gradient(90deg,#a78bfa,#60a5fa,#6ee7b7)]" />
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200">
              {stepIndex === STEPS.length - 1 ? <Check size={19} /> : <Sparkles size={18} />}
            </div>
            <button type="button" onClick={skipTour} aria-label="Cerrar visita guiada" className="rounded-full p-2 text-white/45 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95">
              <X size={17} />
            </button>
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.19em] text-violet-300">{step.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">{step.title}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{step.description}</p>

          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-label={`Paso ${stepIndex + 1} de ${STEPS.length}`}>
              {STEPS.map((tourStep, index) => (
                <span key={tourStep.title} aria-hidden="true" className={`h-1.5 rounded-full transition-all duration-300 ${index === stepIndex ? 'w-6 bg-violet-300' : index < stepIndex ? 'w-1.5 bg-emerald-300' : 'w-1.5 bg-white/20'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stepIndex === 0 ? (
                <button type="button" onClick={skipTour} className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white/55 transition-all duration-300 hover:bg-white/5 hover:text-white active:scale-95">Ahora no</button>
              ) : (
                <button type="button" onClick={() => setStepIndex(current => current - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95" aria-label="Paso anterior">
                  <ArrowLeft size={16} />
                </button>
              )}
              <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-[0_10px_28px_rgba(255,255,255,0.12)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-violet-100 active:scale-95">
                {stepIndex === STEPS.length - 1 ? 'Terminar' : 'Siguiente'}
                {stepIndex === STEPS.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  )
}
