'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { Order } from '@/store/useCustomerStore'
import { supabase } from '@/lib/supabase'

let L: any = null;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  storeLat?: number | null;
  storeLng?: number | null;
}

const STATUS_STEPS = [
  { key: 'pendiente_pago', title: 'Pagar pedido', description: 'Esperando pago por parte del cliente' },
  { key: 'pendiente', title: 'Pendiente', description: 'En breve iniciaremos la preparación de tu pedido' },
  { key: 'en_preparacion', title: 'En preparación', description: 'Estamos preparando tu pedido' },
  { key: 'alistando', title: 'Alistando tu pedido', description: 'Estamos alistando tu pedido' },
  { key: 'en_camino', title: 'En camino', description: 'El repartidor va en camino' },
  { key: 'completado', title: 'Completado', description: 'Tu pedido ha sido entregado' },
]

const MAP_COLLAPSED_VH = 38   // % when content is visible
const MAP_EXPANDED_VH  = 85   // % when map is expanded

export default function OrderDetailModal({ isOpen, onClose, order: initialOrder, storeLat, storeLng }: Props) {
  const mapRef        = useRef<any>(null)
  const routeRef      = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const dragRef       = useRef<{ startY: number; startH: number } | null>(null)

  const [mapReady, setMapReady]     = useState(false)
  const [order, setOrder]           = useState(initialOrder)
  const [mapHeightVh, setMapHeightVh] = useState(MAP_COLLAPSED_VH)
  const [isMapExpanded, setIsMapExpanded] = useState(false)

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status)

  // ── Sync when parent prop changes ──
  useEffect(() => { setOrder(initialOrder) }, [initialOrder])

  // ── SUPABASE REALTIME (fix: escuchar cualquier UPDATE + polling fallback) ──
  useEffect(() => {
    if (!isOpen || !order.id) return;

    // Canal Realtime
    const channel = supabase
      .channel(`order-detail-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${order.id}` },
        (payload: any) => {
          if (payload.new?.status) {
            setOrder(prev => ({ ...prev, status: payload.new.status }))
          }
        }
      )
      .subscribe((status) => {
        // Si el canal no pudo suscribirse activa polling
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime unavailable, switching to polling')
        }
      })

    // Polling de fallback cada 10 segundos por si el realtime falla
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('delivery_orders')
        .select('status')
        .eq('id', order.id)
        .single()
      if (data?.status && data.status !== order.status) {
        setOrder(prev => ({ ...prev, status: data.status }))
      }
    }, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [isOpen, order.id])

  // ── LEAFLET LOAD ──
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      if (!L) {
        const leaflet = await import('leaflet')
        L = leaflet.default || leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl
      }
      setMapReady(true)
    }
    load()
  }, [isOpen])

  // ── MAP INIT + MARKERS + ROUTE ──
  const drawRoute = useCallback(async (map: any, fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
      )
      const json = await res.json()
      const coords: [number, number][] = json?.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => [lat, lng]) || []
      if (coords.length && routeRef.current) {
        map.removeLayer(routeRef.current)
      }
      if (coords.length) {
        routeRef.current = L.polyline(coords, { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(map)
        map.fitBounds(routeRef.current.getBounds(), { padding: [40, 40] })
      }
    } catch (e) {
      console.warn('Route fetch failed', e)
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !isOpen || !mapContainerRef.current || mapRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
      document.head.appendChild(link)
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const customerLat = order.lat || -12.0464
      const customerLng = order.lng || -77.0428

      const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
        .setView([customerLat, customerLng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

      // ── Marcador Cliente (carrito) ──
      const customerIcon = L.divIcon({
        html: `<div style="width:34px;height:34px;background:#1a1a1a;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.4)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#1a1a1a"/></svg>
        </div>`,
        iconSize: [34, 34], iconAnchor: [17, 17], className: '',
      })
      L.marker([customerLat, customerLng], { icon: customerIcon })
        .bindPopup('📍 Dirección de entrega')
        .addTo(map)

      // ── Marcador Local (si tiene coordenadas) ──
      if (storeLat && storeLng) {
        const storeIcon = L.divIcon({
          html: `<div style="width:34px;height:34px;background:#16a34a;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.4)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="1.5" fill="none"/></svg>
          </div>`,
          iconSize: [34, 34], iconAnchor: [17, 17], className: '',
        })
        L.marker([storeLat, storeLng], { icon: storeIcon })
          .bindPopup('🏠 Nuestro local')
          .addTo(map)

        // Si está en camino: dibujar ruta
        if (order.status === 'en_camino') {
          drawRoute(map, storeLat, storeLng, customerLat, customerLng)
        }
      }

      mapRef.current = map
    }, 250)

    return () => {
      clearTimeout(timer)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; routeRef.current = null }
    }
  }, [mapReady, isOpen])

  // Actualizar ruta cuando cambia a "en_camino"
  useEffect(() => {
    if (mapRef.current && storeLat && storeLng && order.status === 'en_camino') {
      const customerLat = order.lat || -12.0464
      const customerLng = order.lng || -77.0428
      drawRoute(mapRef.current, storeLat, storeLng, customerLat, customerLng)
    }
  }, [order.status, storeLat, storeLng])

  // Cleanup map on close
  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove(); mapRef.current = null; routeRef.current = null
      setMapReady(false); setMapHeightVh(MAP_COLLAPSED_VH); setIsMapExpanded(false)
    }
  }, [isOpen])

  // Block scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // ── DRAG HANDLE: expande/colapsa el mapa ──
  const onDragStart = (clientY: number) => {
    dragRef.current = { startY: clientY, startH: mapHeightVh }
  }
  const onDragMove = (clientY: number) => {
    if (!dragRef.current) return
    const dy = clientY - dragRef.current.startY
    const windowH = window.innerHeight
    const deltaVh = (dy / windowH) * 100
    const newH = Math.min(MAP_EXPANDED_VH, Math.max(MAP_COLLAPSED_VH, dragRef.current.startH + deltaVh))
    setMapHeightVh(newH)
  }
  const onDragEnd = () => {
    if (!dragRef.current) return
    const midPoint = (MAP_COLLAPSED_VH + MAP_EXPANDED_VH) / 2
    if (mapHeightVh > midPoint) {
      setMapHeightVh(MAP_EXPANDED_VH); setIsMapExpanded(true)
    } else {
      setMapHeightVh(MAP_COLLAPSED_VH); setIsMapExpanded(false)
    }
    dragRef.current = null
    // Invalidar tamaño del mapa para que re-renderice
    setTimeout(() => { mapRef.current?.invalidateSize() }, 100)
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-white flex flex-col">
      
      {/* ========== MAP (altura dinámica) ========== */}
      <div
        className="relative w-full bg-neutral-200 shrink-0 transition-all duration-200"
        style={{ height: `${mapHeightVh}vh` }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Overlay header */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-[500] pointer-events-none">
          <div className="bg-[#2d2d2d]/90 backdrop-blur-sm text-white px-6 py-2.5 rounded-lg text-center shadow-lg pointer-events-auto" style={{ minWidth: '280px' }}>
            <p className="text-[11px] font-medium tracking-wide opacity-90">Pedido en Curso</p>
            <p className="font-mono font-bold text-[13px] tracking-wider mt-0.5">{order.id}</p>
          </div>
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-[500] bg-white w-9 h-9 rounded-full flex items-center justify-center text-[#333] shadow-lg hover:bg-neutral-100 transition-colors">
          <X size={20} strokeWidth={2.5} />
        </button>

        {/* Status badge en mapa cuando expandido */}
        {isMapExpanded && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-[12px] font-bold text-[#333]">
            {STATUS_STEPS[currentStepIdx]?.title || 'Procesando'}
          </div>
        )}
      </div>

      {/* ── PULL HANDLE (draggable) ── */}
      <div
        className="flex justify-center items-center py-3 bg-white border-b border-neutral-100 cursor-ns-resize touch-none select-none shrink-0"
        onMouseDown={(e) => onDragStart(e.clientY)}
        onMouseMove={(e) => { if (dragRef.current) onDragMove(e.clientY) }}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
        onClick={() => {
          const next = isMapExpanded ? MAP_COLLAPSED_VH : MAP_EXPANDED_VH
          setMapHeightVh(next); setIsMapExpanded(!isMapExpanded)
          setTimeout(() => { mapRef.current?.invalidateSize() }, 250)
        }}
      >
        <div className="w-10 h-1.5 rounded-full bg-neutral-300 transition-all" />
      </div>

      {/* ========== CONTENT (oculto cuando mapa está expandido) ========== */}
      {!isMapExpanded && (
        <div className="flex-1 overflow-y-auto bg-white">

          {/* ---- TIMELINE ---- */}
          <div className="px-4 py-5 border-b border-neutral-100 overflow-x-auto">
            <div className="flex items-start min-w-[680px]">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIdx
                const isCurrent = idx === currentStepIdx
                const isLast = idx === STATUS_STEPS.length - 1
                return (
                  <div key={step.key} className="flex-1 flex flex-col items-start relative">
                    <div className="flex items-center w-full mb-2">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isCompleted ? 'bg-[#333] border-[#333]' : isCurrent ? 'border-[#333] bg-white' : 'border-neutral-300 bg-white'
                      }`}>
                        {isCompleted && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {isCurrent && <div className="w-2 h-2 rounded-full bg-[#333] animate-pulse" />}
                      </div>
                      {!isLast && (
                        <div className={`flex-1 h-[2px] mx-1 transition-all duration-700 ${isCompleted ? 'bg-[#333]' : 'bg-neutral-200'}`} />
                      )}
                    </div>
                    <p className={`text-[11px] font-bold leading-tight pr-3 ${isCompleted || isCurrent ? 'text-[#333]' : 'text-[#bbb]'}`}>
                      {step.title}
                    </p>
                    <p className={`text-[10px] leading-[1.35] mt-0.5 pr-3 ${isCurrent ? 'text-[#555]' : isCompleted ? 'text-[#888]' : 'text-[#ccc]'}`}>
                      {step.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ---- ADDRESS ---- */}
          <div className="flex items-start gap-3 px-4 py-3.5 border-b border-neutral-100">
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <p className="text-[13px] text-[#333] leading-snug">{order.direccion}</p>
          </div>

          {/* ---- TIME ---- */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <p className="text-[13px] text-[#333]">{order.estimatedTime || '50 - 60 min'}</p>
          </div>

          {/* ---- PRODUCTS ---- */}
          <div className="border-b border-neutral-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="px-4 py-3 border-b border-neutral-50 last:border-b-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[13px] text-[#222]">{item.quantity} - {item.name}</p>
                    {item.options && <p className="text-[11px] text-[#999] mt-0.5">{item.quantity} - {item.options}</p>}
                  </div>
                  <p className="text-[13px] text-[#222] font-medium whitespace-nowrap">S/ {item.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ---- TOTALS ---- */}
          <div className="px-4 py-4">
            <div className="flex justify-between py-1.5">
              <span className="text-[13px] text-[#444]">Subtotal</span>
              <span className="text-[13px] text-[#444]">S/ {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[13px] text-[#444]">Envío</span>
              <span className="text-[13px] text-[#444]">S/ {order.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 mt-1">
              <span className="text-[14px] font-bold text-[#c62828]">Total</span>
              <span className="text-[14px] font-bold text-[#c62828]">S/ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
