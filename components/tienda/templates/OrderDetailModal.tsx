'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Order } from '@/store/useCustomerStore'

let L: any = null;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

const STATUS_STEPS = [
  { key: 'pendiente_pago', description: 'Esperando pago por parte del cliente' },
  { key: 'pendiente', description: 'En breve iniciaremos la preparación de tu pedido' },
  { key: 'en_preparacion', description: 'Estamos preparando tu pedido' },
  { key: 'alistando', description: 'Estamos alistando tu pedido' },
  { key: 'en_camino', description: 'El repartidor va en camino' },
  { key: 'completado', description: 'Tu pedido ha sido entregado' },
]

export default function OrderDetailModal({ isOpen, onClose, order }: Props) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)

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
      const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
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

  return (
    <div className="fixed inset-0 z-[140] bg-white flex flex-col animate-in fade-in duration-150">
      
      {/* ========== MAP SECTION ========== */}
      <div className="relative w-full h-[38vh] min-h-[200px] max-h-[320px] bg-neutral-200 shrink-0">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Overlay: Order ID Header */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-center pt-3 px-4 z-[500]">
          <div className="bg-[#2d2d2d]/90 backdrop-blur-sm text-white px-6 py-2.5 rounded-lg text-center shadow-lg" style={{ minWidth: '280px' }}>
            <p className="text-[11px] font-medium tracking-wide opacity-90">Pedido en Curso</p>
            <p className="font-mono font-bold text-[13px] tracking-wider mt-0.5">{order.id}</p>
          </div>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 z-[500] bg-white w-9 h-9 rounded-full flex items-center justify-center text-[#333] shadow-lg hover:bg-neutral-100 transition-colors"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* ========== PULL HANDLE ========== */}
      <div className="flex justify-center py-2 bg-white">
        <div className="w-10 h-1 rounded-full bg-neutral-300"></div>
      </div>

      {/* ========== SCROLLABLE CONTENT ========== */}
      <div className="flex-1 overflow-y-auto bg-white">
        
        {/* ---- STATUS TIMELINE ---- */}
        <div className="px-3 py-4 border-b border-neutral-100">
          <div className="grid grid-cols-6 gap-0">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIdx
              const isCurrent = idx === currentStepIdx
              const isActive = isCompleted || isCurrent
              
              return (
                <div 
                  key={step.key} 
                  className={`px-2 py-3 border-r last:border-r-0 border-neutral-100 ${
                    isCurrent ? 'bg-[#E8F5E9]' : isCompleted ? 'bg-[#F1F8F1]' : ''
                  }`}
                >
                  <p className={`text-[10px] leading-[1.4] ${
                    isActive ? 'text-[#444]' : 'text-[#bbb]'
                  }`}>
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ---- ADDRESS ---- */}
        <div className="flex items-start gap-3 px-4 py-3.5 border-b border-neutral-100">
          <div className="mt-0.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p className="text-[13px] text-[#333] leading-snug">{order.direccion}</p>
        </div>

        {/* ---- ESTIMATED TIME ---- */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100">
          <div className="shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <p className="text-[13px] text-[#333]">{order.estimatedTime || '50 - 60 min'}</p>
        </div>

        {/* ---- PRODUCTS ---- */}
        <div className="border-b border-neutral-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="px-4 py-3 border-b border-neutral-50 last:border-b-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[13px] text-[#222]">{item.quantity} - {item.name}</p>
                  {item.options && (
                    <p className="text-[11px] text-[#999] mt-0.5">{item.quantity} - {item.options}</p>
                  )}
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
    </div>
  )
}
