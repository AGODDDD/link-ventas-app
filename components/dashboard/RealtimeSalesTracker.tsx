'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { BellRing, CheckCircle2 } from 'lucide-react'

export default function RealtimeSalesTracker() {
  useEffect(() => {
    let channel: any

    const setupRealtime = async () => {
      // 1. Get current logged in merchant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 2. Subscribe to the 'orders' table specifically for this merchant
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `merchant_id=eq.${user.id}`, // Only listen to my store's orders
          },
          (payload) => {
            const newOrder = payload.new
            // 3. Trigger giant toast notification
            toast(
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2 text-green-500 font-bold uppercase tracking-widest text-xs">
                  <CheckCircle2 size={16} /> ¡NUEVA VENTA REGISTRADA!
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {newOrder.customer_name} acaba de realizar un pedido.
                </div>
                <div className="text-xl font-black text-slate-900">
                  S/ {parseFloat(newOrder.total_amount).toFixed(2)}
                </div>
                {newOrder.status === 'pending' && newOrder.payment_proof_url === 'CONTRA_ENTREGA' ? (
                   <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-bold w-fit mt-1">EFECTIVO CONTRA ENTREGA</span>
                ) : (
                   <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold w-fit mt-1">TRANSFERENCIA POR REVISAR</span>
                )}
              </div>,
              {
                duration: 10000, // 10 seconds
                position: 'top-center',
                icon: <BellRing size={24} className="text-green-500 animate-pulse" />,
                style: {
                   border: '2px solid #22c55e',
                   background: '#f0fdf4',
                   padding: '16px',
                   width: '100%',
                   minWidth: '350px'
                }
              }
            )
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // This component doesn't render anything visually, it just holds the listener
  return null
}
