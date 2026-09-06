import { NextResponse } from 'next/server'
import { getAdminContext, uuidPattern } from '@/lib/admin'
import { deleteStoragePrefix } from '@/lib/deleteStoreFiles'

export async function GET(request: Request) {
  const admin = await getAdminContext(request, 'deletion-requests', 30)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const { supabase } = admin
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('id, user_id, status, requested_at, due_at, reviewed_at, reviewed_by, resolution_note, completed_at')
    .order('requested_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las solicitudes.' }, { status: 500 })

  const ids = (data || []).flatMap((item) => item.user_id ? [item.user_id] : [])
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, email').in('id', ids)
    : { data: [] as { id: string; email: string | null }[] }
  const emails = new Map((profiles || []).map((profile) => [profile.id, profile.email]))
  return NextResponse.json({ requests: (data || []).map((item) => ({ ...item, email: item.user_id ? emails.get(item.user_id) || null : null })) })
}

export async function PATCH(request: Request) {
  const admin = await getAdminContext(request, 'deletion-requests', 20)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const requestId = typeof body?.requestId === 'string' ? body.requestId : ''
  const action = body?.action
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : ''
  if (!uuidPattern.test(requestId) || !['start_review', 'reject', 'complete'].includes(action)) {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  if (action === 'reject' && !note) return NextResponse.json({ error: 'Indica el motivo del rechazo.' }, { status: 400 })
  if (action === 'complete' && body?.confirmation !== 'ELIMINAR CUENTA') {
    return NextResponse.json({ error: 'Confirma la eliminación escribiendo ELIMINAR CUENTA.' }, { status: 400 })
  }

  const { supabase } = admin
  const { data: deletionRequest, error: requestError } = await supabase
    .from('account_deletion_requests').select('id, user_id, status').eq('id', requestId).maybeSingle()
  if (requestError || !deletionRequest) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })

  if (action === 'start_review') {
    if (deletionRequest.status !== 'pending') return NextResponse.json({ error: 'La solicitud ya fue atendida.' }, { status: 409 })
    const { error } = await supabase.from('account_deletion_requests').update({ status: 'in_review', reviewed_at: new Date().toISOString(), reviewed_by: admin.user.id }).eq('id', requestId)
    if (error) return NextResponse.json({ error: 'No se pudo iniciar la revisión.' }, { status: 500 })
    return NextResponse.json({ status: 'in_review' })
  }

  if (action === 'reject') {
    if (!['pending', 'in_review'].includes(deletionRequest.status)) return NextResponse.json({ error: 'La solicitud ya fue atendida.' }, { status: 409 })
    const { error } = await supabase.from('account_deletion_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: admin.user.id, resolution_note: note }).eq('id', requestId)
    if (error) return NextResponse.json({ error: 'No se pudo rechazar la solicitud.' }, { status: 500 })
    return NextResponse.json({ status: 'rejected' })
  }

  if (!['in_review', 'completed'].includes(deletionRequest.status) || !deletionRequest.user_id) {
    return NextResponse.json({ error: 'Inicia la revisión antes de completar la eliminación.' }, { status: 409 })
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('platform_billing_subscriptions').select('id, provider_subscription_id').eq('user_id', deletionRequest.user_id)
    .in('status', ['pending', 'authorized', 'paused'])
  if (subscriptionError) return NextResponse.json({ error: 'No se pudieron revisar las suscripciones.' }, { status: 500 })
  for (const subscription of subscriptions || []) {
    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ error: 'No se puede cancelar la suscripción sin la configuración de facturación.' }, { status: 503 })
    const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ status: 'cancelled' }),
    })
    if (!response.ok) return NextResponse.json({ error: 'No se pudo cancelar la suscripción antes de eliminar la cuenta.' }, { status: 502 })
    const { error: cancelError } = await supabase.from('platform_billing_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', subscription.id)
    if (cancelError) return NextResponse.json({ error: 'No se pudo registrar la cancelación.' }, { status: 500 })
  }

  const { data: stores, error: storeError } = await supabase.from('stores').update({ is_active: false }).eq('owner_id', deletionRequest.user_id).select('id')
  if (storeError) return NextResponse.json({ error: 'No se pudo detener la recepción de archivos.' }, { status: 500 })
  try {
    await deleteStoragePrefix(supabase, 'productos', deletionRequest.user_id)
    await deleteStoragePrefix(supabase, 'avatars', deletionRequest.user_id)
    for (const store of stores || []) await deleteStoragePrefix(supabase, 'comprobantes', store.id)
  } catch {
    return NextResponse.json({ error: 'No se pudieron retirar todos los archivos. Puedes reintentar la eliminación.' }, { status: 500 })
  }
  if (deletionRequest.status === 'in_review') {
    const { error: anonymizeError } = await supabase.rpc('anonymize_account_for_deletion', { p_request_id: requestId, p_reviewer_id: admin.user.id })
    if (anonymizeError) return NextResponse.json({ error: 'No se pudieron anonimizar los datos de la cuenta.' }, { status: 500 })
  }
  const { error: authError } = await supabase.auth.admin.deleteUser(deletionRequest.user_id)
  if (authError && authError.code !== 'user_not_found') return NextResponse.json({ error: 'Los datos fueron anonimizados, pero no se pudo cerrar la cuenta de acceso. Reintenta la eliminación.' }, { status: 500 })
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', deletionRequest.user_id)
  if (profileError) return NextResponse.json({ error: 'La cuenta de acceso se eliminó, pero falta retirar su perfil.' }, { status: 500 })
  return NextResponse.json({ status: 'completed' })
}
