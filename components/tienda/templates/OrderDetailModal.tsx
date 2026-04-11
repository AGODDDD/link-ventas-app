'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { Order } from '@/store/useCustomerStore'
import { supabase } from '@/lib/supabase'

let L: any = null

interface Props {
  isOpen: boolean
  onClose: () => void
  order: Order
  storeLat?: number | null
  storeLng?: number | null
}

const STATUS_STEPS = [
  { key: 'pendiente_pago',  title: 'Pagar pedido',       description: 'Esperando pago por parte del cliente' },
  { key: 'pendiente',       title: 'Pendiente',           description: 'En breve iniciaremos la preparación de tu pedido' },
  { key: 'en_preparacion',  title: 'En preparación',      description: 'Estamos preparando tu pedido' },
  { key: 'alistando',       title: 'Alistando tu pedido', description: 'Estamos alistando tu pedido' },
  { key: 'en_camino',       title: 'En camino',           description: 'El repartidor va en camino' },
  { key: 'completado',      title: 'Completado',          description: 'Tu pedido ha sido entregado' },
]

const MAP_COLLAPSED = 38
const MAP_EXPANDED  = 85

// ── Dibuja una polilínea animada con rAF y devuelve el handle para cancelarla ──
function animatePolyline(dash: any): number {
  let offset = 0
  let rafId  = 0
  const tick = () => {
    offset -= 0.8
    if (offset <= -24) offset = 0
    const el: SVGPathElement | null = (dash as any)._path
    if (el) el.setAttribute('stroke-dashoffset', String(offset))
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
  return rafId
}

export default function OrderDetailModal({
  isOpen, onClose, order: initialOrder, storeLat, storeLng,
}: Props) {
  const mapRef          = useRef<any>(null)
  const routeLayersRef  = useRef<any[]>([])
  const animFrameRef    = useRef<number | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const dragRef         = useRef<{ startY: number } | null>(null)

  const [mapReady, setMapReady]           = useState(false)
  const [order, setOrder]                 = useState(initialOrder)
  const [mapHeightVh, setMapHeightVh]     = useState(MAP_COLLAPSED)
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [routeDrawn, setRouteDrawn]       = useState(false)

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status)
  const isEnCamino     = order.status === 'en_camino'

  // ── Sync ──
  useEffect(() => { setOrder(initialOrder) }, [initialOrder])

  // ── Realtime + polling ──
  useEffect(() => {
    if (!isOpen || !order.id) return
    const channel = supabase
      .channel(`order-detail-${order.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${order.id}` },
        (payload: any) => {
          if (payload.new?.status) setOrder(prev => ({ ...prev, status: payload.new.status }))
        }
      )
      .subscribe()
    const poll = setInterval(async () => {
      const { data } = await supabase.from('delivery_orders').select('status').eq('id', order.id).single()
      if (data?.status && data.status !== order.status)
        setOrder(prev => ({ ...prev, status: data.status }))
    }, 8000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [isOpen, order.id])

  // ── Leaflet ──
  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      if (!L) {
        const lf = await import('leaflet')
        L = lf.default || lf
        delete (L.Icon.Default.prototype as any)._getIconUrl
      }
      setMapReady(true)
    })()
  }, [isOpen])

  // ── clearRoute helper ──
  const clearRoute = useCallback((map: any) => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    routeLayersRef.current.forEach(l => { try { map?.removeLayer(l) } catch (_) {} })
    routeLayersRef.current = []
  }, [])

  // ── drawRoute: línea recta INMEDIATA + ORS real encima si disponible ──
  const drawRoute = useCallback(async (
    map: any,
    fromLat: number, fromLng: number,
    toLat:   number, toLng:   number
  ) => {
    clearRoute(map)

    // 1. Dibujar línea recta INMEDIATAMENTE (siempre visible)
    const straightCoords: [number, number][] = [[fromLat, fromLng], [toLat, toLng]]
    const baseLayer = L.polyline(straightCoords, {
      color: '#15803d', weight: 7, opacity: 0.45, lineCap: 'round',
    }).addTo(map)
    const dashLayer = L.polyline(straightCoords, {
      color: '#4ade80', weight: 5, opacity: 1, lineCap: 'round', dashArray: '14 10',
    }).addTo(map)
    routeLayersRef.current = [baseLayer, dashLayer]
    map.fitBounds(baseLayer.getBounds(), { padding: [70, 70] })
    setRouteDrawn(true)
    // Iniciar animación sobre la línea recta
    animFrameRef.current = animatePolyline(dashLayer)

    // 2. Intentar obtener ruta real de OpenRouteService en background
    const orsKey = process.env.NEXT_PUBLIC_ORS_API_KEY
    if (!orsKey || orsKey === 'PEGA_TU_TOKEN_AQUI') return  // sin key → quedarse con la recta

    try {
      const ctrl = new AbortController()
      const tid  = setTimeout(() => ctrl.abort(), 8000)
      const res  = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${fromLng},${fromLat}&end=${toLng},${toLat}`,
        { signal: ctrl.signal }
      )
      clearTimeout(tid)
      if (!res.ok) return // ORS devolvió error → quedarse con la recta

      const json = await res.json()
      const rawCoords: number[][] = json?.features?.[0]?.geometry?.coordinates ?? []
      if (!rawCoords.length) return

      // ORS devuelve [lng, lat], Leaflet necesita [lat, lng]
      const realCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng])

      // Reemplazar línea recta con la ruta real (misma animación)
      clearRoute(map)
      const realBase = L.polyline(realCoords, {
        color: '#15803d', weight: 7, opacity: 0.45, lineCap: 'round',
      }).addTo(map)
      const realDash = L.polyline(realCoords, {
        color: '#4ade80', weight: 5, opacity: 1, lineCap: 'round', dashArray: '14 10',
      }).addTo(map)
      routeLayersRef.current = [realBase, realDash]
      map.fitBounds(realBase.getBounds(), { padding: [60, 60] })
      animFrameRef.current = animatePolyline(realDash)
    } catch (e) {
      console.warn('ORS no disponible, manteniendo línea recta')
    }
  }, [clearRoute])

  // ── Map init ──
  useEffect(() => {
    if (!mapReady || !isOpen || !mapContainerRef.current || mapRef.current) return

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
      document.head.appendChild(link)
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return

      const cLat = order.lat  || -12.0464
      const cLng = order.lng  || -77.0428
      const map  = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
        .setView([cLat, cLng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

      // Marcador cliente (pin negro)
      L.marker([cLat, cLng], {
        icon: L.divIcon({
          html: `<div style="width:34px;height:34px;background:#111;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#111"/></svg>
          </div>`,
          iconSize: [34, 34], iconAnchor: [17, 17], className: '',
        }),
      }).bindTooltip('📍 Tu dirección').addTo(map)

      // Marcador local (casa verde)
      if (storeLat && storeLng) {
        L.marker([storeLat, storeLng], {
          icon: L.divIcon({
            html: `<div style="width:34px;height:34px;background:#16a34a;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="1.5" fill="none"/></svg>
            </div>`,
            iconSize: [34, 34], iconAnchor: [17, 17], className: '',
          }),
        }).bindTooltip('🏠 Nuestro local').addTo(map)

        // Si ya está en camino al abrir el modal → dibujar ruta
        if (order.status === 'en_camino') {
          drawRoute(map, storeLat, storeLng, cLat, cLng)
        }
      }

      mapRef.current = map
    }, 300)

    return () => {
      clearTimeout(timer)
      clearRoute(mapRef.current)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; routeLayersRef.current = [] }
    }
  }, [mapReady, isOpen])

  // ── Dibujar/quitar ruta al cambiar status ──
  useEffect(() => {
    if (!mapRef.current || !storeLat || !storeLng) return
    const cLat = order.lat || -12.0464
    const cLng = order.lng || -77.0428
    if (order.status === 'en_camino' && !routeDrawn) {
      drawRoute(mapRef.current, storeLat, storeLng, cLat, cLng)
    }
    if (order.status !== 'en_camino' && routeDrawn) {
      clearRoute(mapRef.current)
      setRouteDrawn(false)
    }
  }, [order.status, storeLat, storeLng, routeDrawn, clearRoute])

  // ── Cleanup al cerrar ──
  useEffect(() => {
    if (!isOpen) {
      clearRoute(mapRef.current)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; routeLayersRef.current = [] }
      setMapReady(false); setMapHeightVh(MAP_COLLAPSED); setIsMapExpanded(false); setRouteDrawn(false)
    }
  }, [isOpen, clearRoute])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // ── Drag ──
  const onDragStart = (y: number) => { dragRef.current = { startY: y } }
  const onDragMove  = (y: number) => {
    if (!dragRef.current) return
    const delta = ((y - dragRef.current.startY) / window.innerHeight) * 100
    setMapHeightVh(h => Math.min(MAP_EXPANDED, Math.max(MAP_COLLAPSED, h + delta)))
    dragRef.current.startY = y
  }
  const onDragEnd = () => {
    if (!dragRef.current) return
    dragRef.current = null
    const mid = (MAP_COLLAPSED + MAP_EXPANDED) / 2
    const expanded = mapHeightVh > mid
    setMapHeightVh(expanded ? MAP_EXPANDED : MAP_COLLAPSED)
    setIsMapExpanded(expanded)
    setTimeout(() => mapRef.current?.invalidateSize(), 150)
  }
  const toggleMap = () => {
    const next = !isMapExpanded
    setIsMapExpanded(next); setMapHeightVh(next ? MAP_EXPANDED : MAP_COLLAPSED)
    setTimeout(() => mapRef.current?.invalidateSize(), 250)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[140] bg-white flex flex-col">

      {/* ══ MAP ══ */}
      <div
        className="relative w-full bg-neutral-200 shrink-0 transition-[height] duration-200"
        style={{ height: `${mapHeightVh}vh` }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-[500] pointer-events-none">
          <div className="bg-[#1a1a1a]/90 backdrop-blur-sm text-white px-6 py-2.5 rounded-lg shadow-lg pointer-events-auto text-center" style={{ minWidth: '260px' }}>
            <p className="text-[11px] font-medium tracking-wide opacity-80">Pedido en Curso</p>
            <p className="font-mono font-bold text-[13px] tracking-wider mt-0.5">{order.id}</p>
          </div>
        </div>

        {/* Badge En camino */}
        {isEnCamino && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500]">
            <div className="bg-green-500 text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              Repartidor en camino
            </div>
          </div>
        )}

        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-[500] bg-white w-9 h-9 rounded-full flex items-center justify-center text-[#333] shadow-lg hover:bg-neutral-100">
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* ══ PULL HANDLE ══ */}
      <div
        className="flex justify-center items-center py-3 bg-white border-b border-neutral-100 cursor-ns-resize touch-none select-none shrink-0"
        onMouseDown={e => onDragStart(e.clientY)}
        onMouseMove={e => { if (dragRef.current) onDragMove(e.clientY) }}
        onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        onTouchStart={e => onDragStart(e.touches[0].clientY)}
        onTouchMove={e => onDragMove(e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
        onClick={toggleMap}
      >
        <div className="w-10 h-1.5 rounded-full bg-neutral-300" />
      </div>

      {/* ══ CONTENT ══ */}
      {!isMapExpanded && (
        <div className="flex-1 overflow-y-auto bg-white">

          {/* TIMELINE */}
          <div className="px-4 py-5 border-b border-neutral-100 overflow-x-auto">
            <div className="flex items-start min-w-[680px]">
              {STATUS_STEPS.map((step, idx) => {
                const done    = idx < currentStepIdx
                const current = idx === currentStepIdx
                const last    = idx === STATUS_STEPS.length - 1
                return (
                  <div key={step.key} className="flex-1 flex flex-col items-start">
                    <div className="flex items-center w-full mb-2">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                        done ? 'bg-[#222] border-[#222]' : current ? 'border-[#222] bg-white' : 'border-neutral-300 bg-white'
                      }`}>
                        {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        {current && <div className="w-2 h-2 rounded-full bg-[#222] animate-pulse" />}
                      </div>
                      {!last && <div className={`flex-1 h-[2px] mx-1 transition-all duration-700 ${done ? 'bg-[#222]' : 'bg-neutral-200'}`} />}
                    </div>
                    <p className={`text-[11px] font-bold leading-tight pr-2 ${done || current ? 'text-[#333]' : 'text-[#bbb]'}`}>{step.title}</p>
                    <p className={`text-[10px] leading-[1.35] mt-0.5 pr-2 ${current ? 'text-[#555]' : done ? 'text-[#888]' : 'text-[#ccc]'}`}>{step.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ADDRESS */}
          <div className="flex items-start gap-3 px-4 py-3.5 border-b border-neutral-100">
            <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <p className="text-[13px] text-[#333] leading-snug">{order.direccion}</p>
          </div>

          {/* TIME */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <p className="text-[13px] text-[#333]">{order.estimatedTime || '50 - 60 min'}</p>
          </div>

          {/* PRODUCTS */}
          <div className="border-b border-neutral-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="px-4 py-3 border-b border-neutral-50 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[13px] text-[#222]">{item.quantity} - {item.name}</p>
                    {item.options && <p className="text-[11px] text-[#999] mt-0.5">{item.quantity} - {item.options}</p>}
                  </div>
                  <p className="text-[13px] text-[#222] font-medium whitespace-nowrap">S/ {item.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* TOTALS */}
          <div className="px-4 py-4 pb-8">
            <div className="flex justify-between py-1.5">
              <span className="text-[13px] text-[#555]">Subtotal</span>
              <span className="text-[13px] text-[#555]">S/ {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[13px] text-[#555]">Envío</span>
              <span className="text-[13px] text-[#555]">S/ {order.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 mt-1 border-t border-neutral-100">
              <span className="text-[14px] font-bold text-[#c62828]">Total</span>
              <span className="text-[14px] font-bold text-[#c62828]">S/ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
