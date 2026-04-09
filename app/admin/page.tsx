'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Merchant = {
    id: string
    store_name: string
    slug: string
    plan: string
    plan_expires_at: string | null
    email?: string
}

export default function AdminPage() {
    const [merchants, setMerchants] = useState<Merchant[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || user.id !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
                window.location.href = '/dashboard'
                return
            }
            setIsAdmin(true)
            const { data } = await supabase
                .from('profiles')
                .select('id, store_name, slug, plan, plan_expires_at')
                .order('plan', { ascending: true })
            setMerchants(data || [])
            setLoading(false)
        }
        init()
    }, [])

    const activar = async (id: string, meses: number) => {
        const supabase = createClient()
        const expires = new Date()
        expires.setMonth(expires.getMonth() + meses)
        await supabase
            .from('profiles')
            .update({
                plan: 'pro',
                plan_expires_at: expires.toISOString(),
            })
            .eq('id', id)
        setMerchants(prev => prev.map(m =>
            m.id === id ? { ...m, plan: 'pro', plan_expires_at: expires.toISOString() } : m
        ))
    }

    const desactivar = async (id: string) => {
        const supabase = createClient()
        await supabase
            .from('profiles')
            .update({ plan: 'inactivo', plan_expires_at: null })
            .eq('id', id)
        setMerchants(prev => prev.map(m =>
            m.id === id ? { ...m, plan: 'inactivo', plan_expires_at: null } : m
        ))
    }

    if (!isAdmin) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0f',
            padding: '32px 24px',
            fontFamily: 'system-ui, sans-serif',
            color: '#ffffff',
        }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px' }}>
                        ⚡ Admin — LinkVentas
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b6b80', margin: 0 }}>
                        {merchants.length} merchants registrados
                    </p>
                </div>

                {loading ? (
                    <p style={{ color: '#6b6b80' }}>Cargando...</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {merchants.map((m) => {
                            const activo = m.plan === 'pro'
                            const vence = m.plan_expires_at
                                ? new Date(m.plan_expires_at).toLocaleDateString('es-PE')
                                : null
                            const vencido = m.plan_expires_at
                                ? new Date(m.plan_expires_at) < new Date()
                                : false

                            return (
                                <div key={m.id} style={{
                                    background: '#13131a',
                                    border: `1px solid ${activo && !vencido ? '#6c47ff55' : '#2a2a3a'}`,
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    flexWrap: 'wrap',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                                            {m.store_name || 'Sin nombre'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b6b80' }}>
                                            /tienda/{m.slug || m.id.slice(0, 8)}
                                        </div>
                                        {vence && (
                                            <div style={{
                                                fontSize: '12px',
                                                color: vencido ? '#e24b4a' : '#639922',
                                                marginTop: '4px',
                                            }}>
                                                {vencido ? '⚠ Venció el ' : '✓ Activo hasta '}{vence}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '3px 10px',
                                            borderRadius: '99px',
                                            background: activo && !vencido ? '#1a1a2e' : '#1a0a0a',
                                            color: activo && !vencido ? '#8b6fff' : '#e24b4a',
                                            border: `1px solid ${activo && !vencido ? '#6c47ff55' : '#e24b4a44'}`,
                                        }}>
                                            {activo && !vencido ? 'PRO' : vencido ? 'VENCIDO' : 'INACTIVO'}
                                        </span>

                                        {[1, 3, 6].map(meses => (
                                            <button
                                                key={meses}
                                                onClick={() => activar(m.id, meses)}
                                                style={{
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    background: '#1a1a2e',
                                                    border: '1px solid #6c47ff55',
                                                    color: '#8b6fff',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                +{meses}m
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => desactivar(m.id)}
                                            style={{
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: '#1a0a0a',
                                                border: '1px solid #e24b4a44',
                                                color: '#e24b4a',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Desactivar
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}