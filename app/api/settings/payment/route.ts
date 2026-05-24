import { NextResponse } from 'next/server'
import { encryptText } from '@/lib/encryption'
import { getAuthenticatedUser, getSupabaseServiceClient, hasProFeatures } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { culqi_secret_key, culqi_public_key, culqi_active } = body

    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido o expirado' }, { status: 401 })
    }

    const supabase = getSupabaseServiceClient()
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
    if (culqi_secret_key && culqi_secret_key.trim() !== '' && !culqi_secret_key.includes('***')) {
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
