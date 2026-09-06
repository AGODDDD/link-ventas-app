import { NextResponse } from 'next/server'
import { getRateLimitKey } from '@/lib/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import { boundedBody, InvalidRequestBody } from '@/lib/requestBody'
import { MAX_PROOF_BYTES, normalizePaymentProof } from '@/lib/paymentProof'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServiceClient()
    const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: getRateLimitKey(request, 'payment-proof'),
      p_limit: 5,
      p_window_seconds: 3600,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })
    const bytes = await boundedBody(request, MAX_PROOF_BYTES + 64 * 1024)
    const form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData()
    const storeId = String(form.get('store_id') || '').trim()
    const file = form.get('file')
    if (!uuidPattern.test(storeId) || !(file instanceof File)) {
      return NextResponse.json({ error: 'Comprobante inválido. Usa JPG, PNG o WEBP de hasta 5 MB.' }, { status: 400 })
    }

    const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).eq('is_active', true).maybeSingle()
    if (!store) return NextResponse.json({ error: 'Tienda no disponible.' }, { status: 404 })

    const normalized = await normalizePaymentProof(file)
    const path = `${storeId}/${crypto.randomUUID()}.webp`
    const { data: quota, error: quotaError } = await supabase.rpc('reserve_payment_proof_upload', { p_store_id: storeId, p_path: path })
    if (quotaError) throw quotaError
    if (!quota) return NextResponse.json({ error: 'No se pueden recibir más comprobantes por el momento.' }, { status: 429 })
    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(path, normalized, { contentType: 'image/webp', upsert: false })
    if (uploadError) throw uploadError

    return NextResponse.json({ path }, { status: 201 })
  } catch (error) {
    if (error instanceof InvalidRequestBody) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Payment proof upload error:', error)
    return NextResponse.json({ error: 'No se pudo subir el comprobante.' }, { status: 500 })
  }
}

