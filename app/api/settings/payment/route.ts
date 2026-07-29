import { NextResponse } from 'next/server'
import { encryptText } from '@/lib/encryption'
import {
  getAuthenticatedUser,
  getSupabaseServiceClient,
  getSupabaseUserServerClient,
  hasProFeatures,
  hasSupabaseServiceRoleKey,
} from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mercadopago_access_token, mercadopago_public_key, mercadopago_active } = body

    const { user, token } = await getAuthenticatedUser(req)
    if (!user || !token) {
      return NextResponse.json({ error: 'Token invalido o expirado' }, { status: 401 })
    }

    const hasSecretKeyChange = Boolean(mercadopago_access_token && mercadopago_access_token.trim() !== '' && !mercadopago_access_token.includes('***'))
    const hasPaymentConfigChange = mercadopago_active === true || Boolean(mercadopago_public_key?.trim()) || hasSecretKeyChange

    if (!hasSupabaseServiceRoleKey() && !hasPaymentConfigChange) {
      return NextResponse.json({ success: true, message: 'Sin cambios de pasarela' })
    }

    if (!hasSupabaseServiceRoleKey() && hasPaymentConfigChange) {
      return NextResponse.json(
        { error: 'La configuracion de Mercado Pago requiere SUPABASE_SERVICE_ROLE_KEY en el servidor.' },
        { status: 500 }
      )
    }

    const supabase = hasSupabaseServiceRoleKey()
      ? getSupabaseServiceClient()
      : getSupabaseUserServerClient(token)

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'No se encontró la tienda Core.' }, { status: 409 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'No se pudo validar el plan.' }, { status: 500 })
    }

    if (mercadopago_active === true && !hasProFeatures(profile?.plan ?? null, profile?.plan_expires_at ?? null)) {
      return NextResponse.json(
        { error: 'Mercado Pago esta disponible solo para planes Pro o trial activo.' },
        { status: 403 }
      )
    }

    let encryptedSecretKey = null
    if (hasSecretKeyChange) {
      encryptedSecretKey = encryptText(mercadopago_access_token.trim())
    }

    const { error: configError } = await supabase
      .from('store_config')
      .upsert({
        store_id: store.id,
        mercadopago_active: mercadopago_active === true,
        mercadopago_public_key: mercadopago_public_key ? mercadopago_public_key.trim() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'store_id' })

    if (configError) {
      console.error('Error guardando configuracion publica de Mercado Pago:', configError)
      return NextResponse.json({ error: 'Fallo al guardar la configuracion de pasarela.' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ...(encryptedSecretKey ? { mercadopago_access_token: encryptedSecretKey } : {}),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error guardando credenciales de pago:', updateError)
      return NextResponse.json({ error: 'Fallo al guardar en base de datos.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Credenciales guardadas de forma segura' })
  } catch (error: any) {
    console.error('Error in /api/settings/payment:', error)
    return NextResponse.json({ error: 'Error del Servidor: ' + error.message }, { status: 500 })
  }
}
