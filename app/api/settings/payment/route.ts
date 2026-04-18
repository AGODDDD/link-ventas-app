import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encryptText } from '@/lib/encryption'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { culqi_secret_key, culqi_public_key, culqi_active } = body
        
        // Exigir el Authorization header (Access Token del merchant logueado)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Acceso Denegado (No token)' }, { status: 401 })
        }
        const token = authHeader.replace('Bearer ', '')

        // Iniciar un cliente admin de Supabase para forzar modificaciones si RLS lo bloquea
        // O cliente normal. Ya que el token verifica.
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // 1. Autenticar quién es el merchant pidiendo la petición
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
        }

        const storeId = user.id;

        // 2. Encriptación Fuerte
        let encryptedSecretKey = null;
        if (culqi_secret_key && culqi_secret_key.trim() !== '') {
            encryptedSecretKey = encryptText(culqi_secret_key.trim());
        }

        // 3. Guardar en Base de Datos de manera cifrada
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                culqi_active: culqi_active === true,
                culqi_public_key: culqi_public_key ? culqi_public_key.trim() : null,
                // Si mandan vacío, lo borramos. Si mandan un asterisco (ej. **************), ignoramos y no pisamos.
                // Idealmente el cliente no envía el mismo si no cambió.
                ...(culqi_secret_key && !culqi_secret_key.includes('***') ? { culqi_secret_key: encryptedSecretKey } : {})
            })
            .eq('id', storeId)

        if (updateError) {
             console.error('Error insertando en Supabase Profile:', updateError);
             return NextResponse.json({ error: 'Fallo al guardar en base de datos.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Credenciales cifradas y guardadas' })

    } catch (error: any) {
        console.error('Error in /api/settings/payment:', error)
        return NextResponse.json({ error: 'Error del Servidor: ' + error.message }, { status: 500 })
    }
}
