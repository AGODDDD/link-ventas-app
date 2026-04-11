'use client'

import React, { useState } from 'react'
import { X, ChevronRight, Package, MessageCircle } from 'lucide-react'
import { Order, useCustomerStore } from '@/store/useCustomerStore'
import OrderDetailModal from './OrderDetailModal'

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeLat?: number | null;
  storeLng?: number | null;
  whatsappPhone?: string | null;  // para reconstituir el link de pago
}

const STATUS_LABELS: Record<Order['status'], string> = {
  pendiente_pago: 'Pendiente de pago',
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  alistando: 'Alistando tu pedido',
  en_camino: 'En camino',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<Order['status'], string> = {
  pendiente_pago: 'bg-red-50 text-red-600 border-red-200',
  pendiente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  en_preparacion: 'bg-blue-50 text-blue-600 border-blue-200',
  alistando: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  en_camino: 'bg-green-50 text-green-600 border-green-200',
  completado: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  cancelado: 'bg-red-100 text-red-700 border-red-300',
}

// Genera el mensaje de WhatsApp igual que el checkout original
function buildWhatsappUrl(order: Order, phone: string): string {
  const items = order.items.map(i =>
    `• ${i.quantity}x ${i.name}${i.options ? ` (${i.options})` : ''} - S/ ${i.totalPrice.toFixed(2)}`
  ).join('\n')
  const msg = [
    `🛵 *Recordatorio de pago – Pedido ${order.id}*`,
    ``,
    `📋 *Productos:*`,
    items,
    ``,
    `📦 Subtotal: S/ ${order.subtotal.toFixed(2)}`,
    `🚚 Envío: S/ ${order.deliveryFee.toFixed(2)}`,
    `💰 *Total: S/ ${order.total.toFixed(2)}*`,
    ``,
    `📍 Dirección: ${order.direccion}`,
    order.referencia ? `🗺️ Referencia: ${order.referencia}` : '',
    ``,
    `⏳ Por favor confirme el pago para iniciar la preparación.`,
  ].filter(Boolean).join('\n')

  const cleaned = phone.replace(/\D/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`
}

export default function OrderHistoryPanel({ isOpen, onClose, storeId, storeLat, storeLng, whatsappPhone }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const customerStore = useCustomerStore()
  const [mounted, setMounted] = useState(false)

  React.useEffect(() => setMounted(true), [])

  // ── Sincronizar statuses desde Supabase al abrir ──
  React.useEffect(() => {
    if (!isOpen || !mounted) return
    const storeOrders = customerStore.orders.filter(o => o.storeId === storeId)
    if (!storeOrders.length) return

    const ids = storeOrders.map(o => o.id)
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('delivery_orders')
        .select('id, status')
        .in('id', ids)
        .then(({ data }) => {
          if (!data) return
          data.forEach(row => {
            const local = storeOrders.find(o => o.id === row.id)
            if (local && local.status !== row.status) {
              customerStore.updateOrderStatus(row.id, row.status as Order['status'])
            }
          })
        })
    })
  }, [isOpen, mounted, storeId])

  const orders = mounted ? customerStore.orders.filter(o => o.storeId === storeId) : []

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-center relative py-4 border-b border-neutral-200">
            <h2 className="font-bold text-lg text-[#111]">Historial de pedidos</h2>
            <button onClick={onClose} className="absolute right-4 p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package size={48} className="text-neutral-300 mb-3" strokeWidth={1.5} />
                <p className="font-bold text-[#333] text-sm">No hay pedidos aún</p>
                <p className="text-xs text-[#999] mt-1">Tus pedidos aparecerán aquí</p>
              </div>
            ) : (
              orders.map(order => {
                const isCancelado = order.status === 'cancelado'
                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-xl p-4 shadow-sm space-y-3 ${isCancelado ? 'border-red-200 opacity-70' : 'border-neutral-200'}`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#666]">
                        {isCancelado ? '❌ Pedido cancelado' : 'Pedido en curso'}
                      </span>
                      <span className="text-[13px] font-mono font-bold text-[#222]">{order.id}</span>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>

                      {/* Botón Pagar: redirige a WhatsApp con resumen del pedido */}
                      {order.status === 'pendiente_pago' && whatsappPhone && (
                        <a
                          href={buildWhatsappUrl(order, whatsappPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-[#25D366] text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-[#1ebe5d] active:scale-[0.97] transition-all shadow-sm"
                        >
                          <MessageCircle size={15} />
                          Pagar
                        </a>
                      )}
                    </div>

                    {/* Ver detalles (solo si no está cancelado) */}
                    {!isCancelado && (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center justify-center gap-1 text-sm text-[#555] hover:text-[#111] font-medium transition-colors w-full py-1"
                      >
                        Ver detalles
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-center py-4 border-t border-neutral-100">
            <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-[#666] border border-neutral-300 rounded-full bg-white hover:bg-neutral-50 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          storeLat={storeLat}
          storeLng={storeLng}
        />
      )}
    </>
  )
}
