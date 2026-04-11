'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Order } from '@/store/useCustomerStore'
import { supabase } from '@/lib/supabase'

let L: any = null;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

const STATUS_STEPS = [
  { key: 'pendiente_pago', title: 'Pagar pedido', description: 'Esperando pago por parte del cliente' },
  { key: 'pendiente', title: 'Pendiente', description: 'En breve iniciaremos la preparación de tu pedido' },
  { key: 'en_preparacion', title: 'En preparación', description: 'Estamos preparando tu pedido' },
  { key: 'alistando', title: 'Alistando tu pedido', description: 'Estamos alistando tu pedido' },
  { key: 'en_camino', title: 'En camino', description: 'El repartidor va en camino' },
  { key: 'completado', title: 'Completado', description: 'Tu pedido ha sido entregado' },
]

export default function OrderDetailModal({ isOpen, onClose, order: initialOrder }: Props) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const [order, setOrder] = useState(initialOrder)

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status)

  // ========== SUPABASE REALTIME ==========
  useEffect(() => {
    if (!isOpen) return;
    
    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_orders',
          filter: `id=eq.${order.id}`,
        },
        (payload: any) => {
          if (payload.new?.status) {
            setOrder(prev => ({ ...prev, status: payload.new.status }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, order.id])

  // Sync initial order
  useEffect(() => {
    setOrder(initialOrder)
  }, [initialOrder])

  // ========== LEAFLET MAP ==========
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
      
      // Custom marker icon
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:#333;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: '',
      })
      L.marker([lat, lng], { icon }).addTo(map)
      mapRef.current = map
    }, 250)
    return () => {
      clearTimeout(timer)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [mapReady, isOpen])

  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-white flex flex-col">
      
      {/* ========== MAP ========== */}
      <div className="relative w-full h-[38vh] min-h-[200px] max-h-[320px] bg-neutral-200 shrink-0">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Overlay header */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 z-[500]">
          <div className="bg-[#2d2d2d]/90 backdrop-blur-sm text-white px-6 py-2.5 rounded-lg text-center shadow-lg" style={{ minWidth: '280px' }}>
            <p className="text-[11px] font-medium tracking-wide opacity-90">Pedido en Curso</p>
            <p className="font-mono font-bold text-[13px] tracking-wider mt-0.5">{order.id}</p>
          </div>
        </div>
        
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-[500] bg-white w-9 h-9 rounded-full flex items-center justify-center text-[#333] shadow-lg hover:bg-neutral-100 transition-colors">
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Pull handle */}
      <div className="flex justify-center py-2.5 bg-white border-b border-neutral-100">
        <div className="w-10 h-1 rounded-full bg-neutral-300"></div>
      </div>

      {/* ========== SCROLLABLE CONTENT ========== */}
      <div className="flex-1 overflow-y-auto bg-white">
        
        {/* ---- TIMELINE ---- */}
        <div className="px-4 py-5 border-b border-neutral-100 overflow-x-auto">
          <div className="flex items-start min-w-[700px]">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIdx
              const isCurrent = idx === currentStepIdx
              const isLast = idx === STATUS_STEPS.length - 1
              
              return (
                <div key={step.key} className="flex-1 flex flex-col items-start relative">
                  {/* Circle + Line row */}
                  <div className="flex items-center w-full mb-2">
                    {/* Circle */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-[#333] border-[#333]' 
                        : isCurrent 
                          ? 'border-[#333] bg-white' 
                          : 'border-neutral-300 bg-white'
                    }`}>
                      {isCompleted && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full bg-[#333] animate-pulse"></div>
                      )}
                    </div>
                    
                    {/* Connecting line */}
                    {!isLast && (
                      <div className={`flex-1 h-[2px] mx-1 transition-all duration-500 ${
                        isCompleted ? 'bg-[#333]' : 'bg-neutral-200'
                      }`}></div>
                    )}
                  </div>
                  
                  {/* Title */}
                  <p className={`text-[11px] font-bold leading-tight pr-3 ${
                    isCompleted || isCurrent ? 'text-[#333]' : 'text-[#bbb]'
                  }`}>
                    {step.title}
                  </p>
                  
                  {/* Description */}
                  <p className={`text-[10px] leading-[1.35] mt-0.5 pr-3 ${
                    isCurrent ? 'text-[#666]' : isCompleted ? 'text-[#888]' : 'text-[#ccc]'
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

        {/* ---- TIME ---- */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
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
