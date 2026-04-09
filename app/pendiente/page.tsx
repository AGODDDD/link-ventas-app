'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PendientePage() {
    const [email, setEmail] = useState('')
    const [nombre, setNombre] = useState('')

    useEffect(() => {
        const getUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setEmail(user.email || '')
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('store_name')
                    .eq('id', user.id)
                    .single()
                if (profile?.store_name) setNombre(profile.store_name)
            }
        }
        getUser()
    }, [])

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0f',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
        }}>
            <div style={{
                maxWidth: '480px',
                width: '100%',
                background: '#13131a',
                border: '1px solid #2a2a3a',
                borderRadius: '16px',
                padding: '40px 36px',
                textAlign: 'center',
            }}>
                {/* Logo */}
                <div style={{
                    fontSize: '22px',
                    fontWeight: '600',
                    color: '#ffffff',
                    marginBottom: '32px',
                    letterSpacing: '-0.5px',
                }}>
                    ⚡ LinkVentas
                </div>

                {/* Ícono */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#1e1e2e',
                    border: '1px solid #2a2a3a',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontSize: '28px',
                }}>
                    🔐
                </div>

                <h1 style={{
                    fontSize: '22px',
                    fontWeight: '600',
                    color: '#ffffff',
                    margin: '0 0 10px',
                }}>
                    Cuenta pendiente de activación
                </h1>

                <p style={{
                    fontSize: '14px',
                    color: '#6b6b80',
                    margin: '0 0 32px',
                    lineHeight: '1.6',
                }}>
                    {nombre ? `Hola ${nombre}, tu` : 'Tu'} cuenta <strong style={{ color: '#9b9bb0' }}>{email}</strong> fue creada correctamente. Para activarla escríbenos por WhatsApp y te activamos en minutos.
                </p>

                {/* Pasos */}
                <div style={{
                    background: '#0f0f1a',
                    border: '1px solid #2a2a3a',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '28px',
                    textAlign: 'left',
                }}>
                    {[
                        { num: '1', texto: 'Escríbenos por WhatsApp al +51 999 999 999' },
                        { num: '2', texto: 'Indícanos tu correo registrado' },
                        { num: '3', texto: 'Realiza el pago por Yape o transferencia' },
                        { num: '4', texto: 'Activamos tu cuenta al instante' },
                    ].map((paso) => (
                        <div key={paso.num} style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            marginBottom: paso.num === '4' ? '0' : '14px',
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                background: '#6c47ff22',
                                border: '1px solid #6c47ff55',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#8b6fff',
                                flexShrink: 0,
                            }}>
                                {paso.num}
                            </div>
                            <span style={{ fontSize: '13px', color: '#9b9bb0', lineHeight: '1.5', paddingTop: '3px' }}>
                                {paso.texto}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Planes */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '28px',
                }}>
                    {[
                        { nombre: 'Básico', precio: 'S/ 39', desc: '/mes · hasta 30 productos' },
                        { nombre: 'Pro', precio: 'S/ 79', desc: '/mes · productos ilimitados', destacado: true },
                    ].map((plan) => (
                        <div key={plan.nombre} style={{
                            background: plan.destacado ? '#1a1a2e' : '#0f0f1a',
                            border: `1px solid ${plan.destacado ? '#6c47ff88' : '#2a2a3a'}`,
                            borderRadius: '10px',
                            padding: '14px',
                            textAlign: 'left',
                        }}>
                            {plan.destacado && (
                                <div style={{
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    color: '#8b6fff',
                                    marginBottom: '6px',
                                    letterSpacing: '.05em',
                                }}>
                                    MÁS POPULAR
                                </div>
                            )}
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>
                                {plan.nombre}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: plan.destacado ? '#8b6fff' : '#ffffff' }}>
                                {plan.precio}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b6b80', marginTop: '2px' }}>
                                {plan.desc}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Botón WhatsApp */}

                href="https://wa.me/51999999999?text=Hola,%20quiero%20activar%20mi%20cuenta%20de%20LinkVentas.%20Mi%20correo%20es:%20"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '14px',
                    background: '#25d366',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    marginBottom: '14px',
                }}
        >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.848L.057 23.267a.75.75 0 0 0 .921.921l5.487-1.474A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.697 9.697 0 0 1-4.92-1.336l-.353-.209-3.644.978.997-3.543-.228-.366A9.698 9.698 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
                </svg>
                Activar mi cuenta por WhatsApp
            </a>

            <button
                onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    window.location.href = '/auth/login'
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    color: '#6b6b80',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                }}
            >
                Cerrar sesión
            </button>
        </div>
    </div >
  )
}