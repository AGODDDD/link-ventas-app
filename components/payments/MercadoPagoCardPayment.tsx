'use client'

import { useCallback, useMemo, useRef } from 'react'
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react'

type MercadoPagoPaymentData = {
  token: string
  payment_method_id: string
  installments: number
  issuer_id?: string
  payer?: { email?: string }
}

type Props = {
  publicKey: string
  amount: number
  payerEmail: string
  onSubmit: (data: MercadoPagoPaymentData) => Promise<void>
  onError: (message: string) => void
}

type CardPaymentFormData = {
  token?: string
  payment_method_id?: string
  installments?: number | string
  issuer_id?: string | number
  payer?: { email?: string }
}

type BrickError = {
  message?: string
  cause?: string
}

const MP_LOCALE = 'es-PE'
let initializedPublicKey: string | null = null

function ensureMercadoPagoInitialized(publicKey: string) {
  if (initializedPublicKey === publicKey) return
  initMercadoPago(publicKey, { locale: MP_LOCALE })
  initializedPublicKey = publicKey
}

function normalizePublicKey(publicKey: string) {
  return publicKey.trim()
}

function isValidAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0
}

function getErrorMessage(error: BrickError) {
  return error.message || error.cause || 'No se pudo validar la tarjeta.'
}

export function MercadoPagoCardPayment({ publicKey, amount, payerEmail, onSubmit, onError }: Props) {
  const containerId = useRef(`mp-card-${Math.random().toString(36).slice(2)}`)
  const normalizedPublicKey = normalizePublicKey(publicKey)
  const validAmount = isValidAmount(amount)
  const initialization = useMemo(
    () => ({
      amount,
      payer: payerEmail.trim() ? { email: payerEmail.trim() } : undefined,
    }),
    [amount, payerEmail],
  )

  const handleSubmit = useCallback(
    async (formData: CardPaymentFormData) => {
      const token = formData.token
      const paymentMethodId = formData.payment_method_id
      const installments = Number(formData.installments)

      if (!token || !paymentMethodId || !Number.isInteger(installments) || installments < 1) {
        onError('Datos de pago invalidos.')
        return
      }

      await onSubmit({
        token,
        payment_method_id: paymentMethodId,
        installments,
        issuer_id: formData.issuer_id ? String(formData.issuer_id) : undefined,
        payer: formData.payer,
      })
    },
    [onError, onSubmit],
  )

  const handleError = useCallback((error: BrickError) => onError(getErrorMessage(error)), [onError])

  if (!normalizedPublicKey) {
    return <p className="text-sm text-red-600">Mercado Pago no esta configurado para esta tienda.</p>
  }

  if (!validAmount) {
    return <p className="text-sm text-red-600">El monto de pago no es valido.</p>
  }

  ensureMercadoPagoInitialized(normalizedPublicKey)

  return (
    <CardPayment
      id={containerId.current}
      initialization={initialization}
      locale={MP_LOCALE}
      onSubmit={handleSubmit}
      onError={handleError}
    />
  )
}
