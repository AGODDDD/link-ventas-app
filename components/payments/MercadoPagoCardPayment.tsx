'use client'

import { useEffect, useRef } from 'react'

type Props = {
  publicKey: string
  amount: number
  payerEmail: string
  onSubmit: (data: { token: string; payment_method_id: string; installments: number; issuer_id?: string; payer?: { email?: string } }) => Promise<void>
  onError: (message: string) => void
}

declare global {
  interface Window { MercadoPago?: any }
}

export function MercadoPagoCardPayment({ publicKey, amount, payerEmail, onSubmit, onError }: Props) {
  const containerId = useRef(`mp-card-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let controller: { unmount?: () => Promise<void> } | undefined
    let cancelled = false
    const mount = async () => {
      if (!window.MercadoPago) return onError('No se pudo cargar Mercado Pago.')
      const mp = new window.MercadoPago(publicKey, { locale: 'es-PE' })
      controller = await mp.bricks().create('cardPayment', containerId.current, {
        initialization: { amount, payer: { email: payerEmail } },
        callbacks: {
          onSubmit: async (formData: any) => {
            await onSubmit({
              token: formData.token,
              payment_method_id: formData.payment_method_id,
              installments: Number(formData.installments),
              issuer_id: formData.issuer_id ? String(formData.issuer_id) : undefined,
              payer: formData.payer,
            })
          },
          onError: (error: unknown) => onError(error instanceof Error ? error.message : 'No se pudo validar la tarjeta.'),
        },
      })
      if (cancelled) await controller?.unmount?.()
    }
    const script = document.querySelector<HTMLScriptElement>('script[data-mercadopago-sdk]') || document.createElement('script')
    if (!script.src) {
      script.src = 'https://sdk.mercadopago.com/js/v2'
      script.async = true
      script.dataset.mercadopagoSdk = 'true'
      document.head.appendChild(script)
    }
    script.addEventListener('load', mount, { once: true })
    if (window.MercadoPago) void mount()
    return () => { cancelled = true; void controller?.unmount?.() }
  }, [amount, onError, onSubmit, payerEmail, publicKey])

  return <div id={containerId.current} />
}
