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
    const { culqi_secret_key, culqi_public_key, culqi_active } = body

    const { user, token } = await getAuthenticatedUser(req)
    if (!user || !token) {
      return NextResponse.json({ error: 'Token invalido o expirado' }, { status: 401 })
    }

    const hasSecretKeyChange = Boolean(culqi_secret_key && culqi_secret_key.trim() !== '' && !culqi_secret_key.includes('***'))
    const hasPaymentConfigChange = culqi_active === true || Boolean(culqi_public_key?.trim()) || hasSecretKeyChange

    if (!hasSupabaseServiceRoleKey() && !hasPaymentConfigChange) {
      return NextResponse.json({ success: true, message: 'Sin cambios de pasarela' })
    }

    if (!hasSupabaseServiceRoleKey() && hasPaymentConfigChange) {
      return NextResponse.json(
        { error: 'La configuracion de Culqi requiere SUPABASE_SERVICE_ROLE_KEY en el servidor.' },
        { status: 500 }
      )
    }

    const supabase = hasSupabaseServiceRoleKey()
      ? getSupabaseServiceClient()
      : getSupabaseUserServerClient(token)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'No se pudo validar el plan.' }, { status: 500 })
    }

    if (culqi_active === true && !hasProFeatures(profile?.plan ?? null, profile?.plan_expires_at ?? null)) {
      return NextResponse.json(
        { error: 'Culqi esta disponible solo para planes Pro o trial activo.' },
        { status: 403 }
      )
    }

    let encryptedSecretKey = null
    if (hasSecretKeyChange) {
      encryptedSecretKey = encryptText(culqi_secret_key.trim())
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        culqi_active: culqi_active === true,
        culqi_public_key: culqi_public_key ? culqi_public_key.trim() : null,
        ...(encryptedSecretKey ? { culqi_secret_key: encryptedSecretKey } : {}),
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
