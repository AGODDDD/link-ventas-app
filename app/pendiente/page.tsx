'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PendientePage() {
    const [email, setEmail] = useState('')
    const [nombre, setNombre] = useState('')
    const [plan, setPlan] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setEmail(user.email || '')
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('store_name, plan, plan_expires_at')
                    .eq('id', user.id)
                    .single()
                if (profile?.store_name) setNombre(profile.store_name)
                setPlan(profile?.plan ?? null)
            }
            setLoading(false)
        }
        getUser()
    }, [])

    const handleLogout = async () => {
        // Limpiar cookie de plan antes de cerrar sesión
        document.cookie = 'sb-plan-status=; path=/; max-age=0'
        await supabase.auth.signOut()
        window.location.href = '/'
    }

    const handleDowngradeToFree = async () => {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
            const res = await fetch('/api/billing/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ plan: 'free' }),
            })
            if (!res.ok) {
                setLoading(false)
                alert('Error al cambiar de plan. Intenta de nuevo.')
                return
            }
            document.cookie = 'sb-plan-status=free; path=/; SameSite=Lax'
            window.location.href = '/dashboard'
        }
    }

    const trialExpired = plan === 'trial' || plan === null
    const isInactive = plan === 'inactivo'

    const whatsappMessage = encodeURIComponent(
        `Hola, quiero activar mi Plan Pro de LinkVentas. Mi correo es: ${email}`
    )

    if (loading) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(109,40,217,0.15) 0%, #0a0a0f 60%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* Logo */}
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span style={{ color: '#a78bfa' }}>⚡</span> LinkVentas
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Panel de control comercial</p>
            </div>

            <div style={{
                maxWidth: '460px',
                width: '100%',
                background: 'rgba(19,19,26,0.9)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '20px',
                padding: '40px 36px',
                textAlign: 'center',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}>
                {/* Ícono */}
                <div style={{
                    width: '68px', height: '68px',
                    background: 'rgba(109,40,217,0.15)',
                    border: '1px solid rgba(109,40,217,0.35)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px', fontSize: '28px',
                }}>
                    {trialExpired ? '⏰' : '🔐'}
                </div>

                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: '0 0 12px', letterSpacing: '-0.3px' }}>
                    {trialExpired
                        ? 'Tu prueba gratuita ha finalizado'
                        : isInactive 
                            ? 'Tu cuenta está inactiva'
                            : 'Cuenta pendiente de activación'}
                </h1>

                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: '0 0 32px', lineHeight: '1.7' }}>
                    {trialExpired
                        ? <>Tu prueba Pro de 14 días ha concluido{nombre ? `, ${nombre}` : ''}. Activa el <strong style={{ color: '#a78bfa' }}>Plan Pro por S/ 29/mes</strong> para recuperar el acceso completo a todas las funciones avanzadas, o continúa con el Plan Emprendedor gratuito.</>
                        : isInactive
                            ? <>Tu cuenta <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</strong> se encuentra inactiva. Puedes activar el Plan Pro o continuar con el Plan Emprendedor (Gratis).</>
                            : <>{nombre ? `Hola ${nombre}, tu` : 'Tu'} cuenta <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</strong> requiere activación. Escríbenos por WhatsApp o elige el plan gratuito.</>
                    }
                </p>

                {/* Planes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                    {/* Plan Emprendedor */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px', padding: '18px 14px', textAlign: 'left',
                    }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Emprendedor</div>
                        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>S/ 0</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>/mes · Gratis para siempre</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.8' }}>
                            ✓ Catálogo (hasta 10 productos)<br />
                            ✓ Pedidos ilimitados<br />
                            ✓ Panel básico
                        </div>
                    </div>

                    {/* Plan Pro */}
                    <div style={{
                        background: 'rgba(109,40,217,0.15)',
                        border: '1px solid rgba(139,92,246,0.4)',
                        borderRadius: '14px', padding: '18px 14px', textAlign: 'left', position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                            fontSize: '9px', fontWeight: 700, color: '#fff',
                            padding: '3px 10px', borderRadius: '99px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>⭐ Más Popular</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', marginTop: '4px' }}>Pro</div>
                        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>S/ 29</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>/mes · Sin comisiones</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.8' }}>
                            ✓ Todo lo del Emprendedor<br />
                            ✓ Productos ilimitados<br />
                            ✓ Culqi + Tickets PDF<br />
                            ✓ Analytics avanzado
                        </div>
                    </div>
                </div>

                {/* Pasos rápidos */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px', padding: '16px 18px', marginBottom: '24px', textAlign: 'left',
                }}>
                    {[
                        { n: '1', t: 'Escríbenos por WhatsApp al +51 999 999 999' },
                        { n: '2', t: 'Indícanos tu correo: ' + (email || 'tu correo registrado') },
                        { n: '3', t: 'Paga por Yape, Plin o transferencia · S/ 29/mes' },
                        { n: '4', t: '¡Activamos tu cuenta en minutos!' },
                    ].map((paso, i) => (
                        <div key={paso.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 3 ? '12px' : '0' }}>
                            <div style={{
                                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(109,40,217,0.2)', border: '1px solid rgba(139,92,246,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', fontWeight: 700, color: '#a78bfa',
                            }}>{paso.n}</div>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', paddingTop: '2px' }}>{paso.t}</span>
                        </div>
                    ))}
                </div>

                {/* Botón WhatsApp */}
                <a
                    href={`https://wa.me/51999999999?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        width: '100%', padding: '14px',
                        background: 'linear-gradient(135deg, #25d366, #128c7e)',
                        borderRadius: '12px', fontSize: '15px', fontWeight: 700, color: '#ffffff',
                        cursor: 'pointer', textDecoration: 'none', marginBottom: '12px',
                        boxShadow: '0 8px 24px rgba(37,211,102,0.2)',
                        transition: 'all 0.2s',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.848L.057 23.267a.75.75 0 0 0 .921.921l5.487-1.474A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.697 9.697 0 0 1-4.92-1.336l-.353-.209-3.644.978.997-3.543-.228-.366A9.698 9.698 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
                    </svg>
                    {trialExpired || isInactive ? 'Activar Plan Pro — S/ 29/mes' : 'Activar mi cuenta por WhatsApp'}
                </a>

                {/* Botón Bajar a Free */}
                <button
                    onClick={handleDowngradeToFree}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', padding: '14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer', marginBottom: '24px', transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                    Continuar con el Plan Emprendedor (Gratis)
                </button>

                <button
                    onClick={handleLogout}
                    style={{
                        background: 'none', border: 'none', fontSize: '12px',
                        color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                        textDecoration: 'underline', textUnderlineOffset: '3px', padding: '4px',
                    }}
                >
                    Cerrar sesión
                </button>
            </div>

            <p style={{ marginTop: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>
                © 2026 LinkVentas · Sin comisiones · Sin permanencia
            </p>
        </div>
    )
}
