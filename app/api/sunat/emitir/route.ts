import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Esqueleto de Emisión Nativa UBL 2.1 (SUNAT)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )
    
    // 1. Autenticación de la capa de API
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { orderId, tipoComprobante } = await request.json()

    // 2. Extraer Credenciales Sensibles del Servidor
    const { data: profile } = await supabase
      .from('profiles')
      .select('sol_ruc, sol_usuario, sol_password, certificado_digital_url, certificado_password')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.sol_ruc || !profile.certificado_digital_url) {
       return NextResponse.json({ 
           error: 'Faltan credenciales tributarias. Configúralas en Ajustes > Facturación SUNAT.' 
       }, { status: 400 })
    }

    // 3. Extraer Data de la Orden
    const { data: order } = await supabase
       .from('orders')
       .select('*, order_items(*, product:products(*))')
       .eq('id', orderId)
       .single()

    if (!order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // =========================================================
    // AQUI INICIA LA ARQUITECTURA PESADA NATIVA (MOCK)
    // =========================================================
    console.log('[SUNAT ENGINE] Ensamblando XML UBL 2.1...')
    console.log(`[SUNAT ENGINE] Emisor: RUC ${profile.sol_ruc}`)
    console.log(`[SUNAT ENGINE] Extrayendo Certificado PFX desde Storage...`)
    console.log(`[SUNAT ENGINE] Firmando Criptográficamente usando contraseña...`)
    console.log(`[SUNAT ENGINE] Enviando SOAP request al WSDL de Sunat Homologación...`)

    // Simular latencia de ida y vuelta a la API de Sunat (3 segundos)
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Simular un CDR (Constancia de Recepción) exitoso.
    const fakeCDR = {
        exito: true,
        codigo_hash: `hash_mock_${Math.random().toString(36).substring(7)}`,
        mensaje_sunat: `La ${tipoComprobante} F001-000001 ha sido aceptada.`
    }

    // =========================================================

    return NextResponse.json({ 
        success: true, 
        message: fakeCDR.mensaje_sunat,
        hash: fakeCDR.codigo_hash
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error SUNAT:', error)
    return NextResponse.json({ error: 'Fallo interno al procesar XML' }, { status: 500 })
  }
}
