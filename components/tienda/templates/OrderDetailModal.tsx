'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, MapPin, Clock, Check } from 'lucide-react'
import { Order } from '@/store/useCustomerStore'

let L: any = null;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

const STATUS_STEPS: { key: Order['status']; label: string; description: string }[] = [
  { key: 'pendiente_pago', label: 'Pagar pedido', description: 'Esperando pago por parte del cliente' },
  { key: 'pendiente', label: 'Pendiente', description: 'En breve iniciaremos la preparación de tu pedido' },
  { key: 'en_preparacion', label: 'En preparación', description: 'Estamos preparando tu pedido' },
  { key: 'alistando', label: 'Alistando tu pedido', description: 'Estamos alistando tu pedido' },
  { key: 'en_camino', label: 'En camino', description: 'El repartidor va en camino' },
  { key: 'completado', label: 'Completado', description: 'Tu pedido ha sido entregado' },
]

export default function OrderDetailModal({ isOpen, onClose, order }: Props) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)

  // Current step index
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status)

  // Load leaflet
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      if (!L) {
        const leaflet = await import('leaflet')
        L = leaflet.default || leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
      }
      setMapReady(true)
    }
    load()
  }, [isOpen])

  // Init map
  useEffect(() => {
    if (!mapReady || !isOpen || !mapContainerRef.current || mapRef.current) return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
      document.head.appendChild(link)
    }
    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;
      const lat = order.lat || -12.0464
      const lng = order.lng || -77.0428
      const map = L.map(mapContainerRef.current).setView([lat, lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map)
      L.marker([lat, lng]).addTo(map)
      mapRef.current = map
    }, 250)
    return () => {
      clearTimeout(timer)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [mapReady, isOpen])

  // Cleanup
  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [isOpen])

  // Block scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null;

  const orderDate = new Date(order.date)
  const dateStr = orderDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-[140] bg-white flex flex-col animate-in fade-in duration-150">
      {/* Header with map */}
      <div className="relative w-full h-[200px] md:h-[260px] bg-neutral-200">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Overlay header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center pt-3 z-[500]">
          <div className="bg-[#333]/90 backdrop-blur-sm text-white px-5 py-2 rounded-lg text-center">
            <p className="text-xs font-medium">Pedido en Curso</p>
            <p className="font-mono font-bold text-sm">{order.id}</p>
          </div>
        </div>
        
        <button onClick={onClose} className="absolute top-3 right-3 z-[500] bg-white/90 backdrop-blur-sm w-9 h-9 rounded-full flex items-center justify-center text-[#333] hover:bg-white shadow-md transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Status Timeline */}
        <div className="px-4 py-5 border-b border-neutral-100">
          <div className="flex items-start gap-0 overflow-x-auto hide-scrollbar pb-2">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIdx
              const isCurrent = idx === currentStepIdx
              const isPending = idx > currentStepIdx
              
              return (
                <div key={step.key} className="flex-1 min-w-[120px] flex flex-col items-center text-center px-1">
                  {/* Circle */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                    'bg-neutral-200 text-neutral-400'
                  }`}>
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : 
                     <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  {/* Label */}
                  <p className={`text-[10px] font-bold leading-tight ${
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-[#aaa]'
                  }`}>{step.label}</p>
                  {/* Description */}
                  <p className={`text-[9px] leading-tight mt-0.5 ${
                    isCurrent || isCompleted ? 'text-[#666]' : 'text-[#ccc]'
                  }`}>{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Address */}
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
          <MapPin size={16} className="text-[#888] shrink-0" />
          <p className="text-sm text-[#333]">{order.direccion}</p>
        </div>

        {/* Time */}
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
          <Clock size={16} className="text-[#888] shrink-0" />
          <p className="text-sm text-[#333]">{order.estimatedTime || '50 - 60 min'}</p>
        </div>

        {/* Products */}
        <div className="px-4 py-4 border-b border-neutral-100 space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-[#222] font-medium">{item.quantity} - {item.name}</p>
                {item.options && <p className="text-[11px] text-[#999] mt-0.5">{item.options}</p>}
              </div>
              <p className="text-sm font-medium text-[#222] whitespace-nowrap">S/ {item.totalPrice.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-4 py-4 space-y-2">
          <div className="flex justify-between text-sm text-[#666]">
            <span>Subtotal</span>
            <span>S/ {order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#666]">
            <span>Envío</span>
            <span>S/ {order.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-[#111] pt-2 border-t border-neutral-100">
            <span>Total</span>
            <span>S/ {order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Date */}
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-[#aaa]">Pedido realizado el {dateStr}</p>
        </div>
      </div>
    </div>
  )
}
