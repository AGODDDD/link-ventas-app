'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Copy, CreditCard, Facebook, Loader2, Mail, Pencil, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type Account = {
  id: string; fullName: string; avatarUrl: string | null; email: string; provider: string; createdAt: string
  plan: string; planExpiresAt: string | null
  deletionRequest: { id: string; status: string; requested_at: string; due_at: string; resolution_note: string | null } | null
}

const planLabel: Record<string, string> = { pro: 'Plan Pro', trial: 'Prueba Pro', inactivo: 'Plan inactivo', free: 'Plan Emprendedor' }

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } : null
}

export default function AccountCenter() {
  const [account, setAccount] = useState<Account | null>(null)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const headers = await authHeaders()
    if (!headers) return
    const response = await fetch('/api/account', { headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar tu cuenta.')
    setAccount(data.account); setName(data.account.fullName)
  }
  useEffect(() => { load().catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [])

  const saveName = async (event: FormEvent) => {
    event.preventDefault(); const headers = await authHeaders(); if (!headers) return
    setSaving(true)
    try {
      const response = await fetch('/api/account', { method: 'PATCH', headers, body: JSON.stringify({ fullName: name }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setAccount((value) => value ? { ...value, fullName: data.fullName } : value); setEditing(false); toast.success('Nombre actualizado')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo guardar el nombre.') } finally { setSaving(false) }
  }
  const requestDeletion = async () => {
    if (!window.confirm('Solicitarás la eliminación de tu cuenta. El equipo la revisará en hasta 7 días.')) return
    const confirmation = window.prompt('Escribe ELIMINAR para confirmar la solicitud.')
    if (confirmation !== 'ELIMINAR') return
    const headers = await authHeaders(); if (!headers) return
    setDeleting(true)
    try {
      const response = await fetch('/api/account/deletion-request', { method: 'POST', headers, body: JSON.stringify({ confirmation }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setAccount((value) => value ? { ...value, deletionRequest: data.deletionRequest } : value); toast.success('Solicitud registrada. Te atenderemos en hasta 7 días.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo registrar la solicitud.') } finally { setDeleting(false) }
  }
  if (loading) return <div className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60" />
  if (!account) return null
  const due = account.deletionRequest ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date(account.deletionRequest.due_at)) : null
  return <section data-tour="settings-account" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.14),transparent_36%),linear-gradient(135deg,#ffffff,#f6f7fb)] p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_right,_rgba(129,140,248,0.14),transparent_35%),linear-gradient(135deg,#18181b,#09090b)] sm:p-8">
      <div className="absolute -right-12 -top-16 size-48 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/15 dark:bg-white dark:text-zinc-900">{account.avatarUrl ? <img src={account.avatarUrl} alt="" className="size-full object-cover" /> : <UserRound size={25} />}</div><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Cuenta LinkVentas</p><h2 className="mt-1 truncate text-2xl font-semibold tracking-[-0.045em] text-zinc-950 dark:text-white">{account.fullName}</h2><p className="mt-1 flex items-center gap-1.5 truncate text-sm text-zinc-500 dark:text-zinc-400"><Mail size={14} />{account.email}</p></div></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"><CheckCircle2 size={14} />{planLabel[account.plan] || 'Plan LinkVentas'}</span>
      </div>
      <div className="relative mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200/70 bg-white/75 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"><p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Acceso</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{account.provider === 'Facebook' ? <Facebook size={16} className="text-blue-600" /> : <ShieldCheck size={16} className="text-indigo-500" />}{account.provider}</p></div><div className="rounded-2xl border border-zinc-200/70 bg-white/75 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"><p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Suscripción</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100"><CreditCard size={16} className="text-indigo-500" />{account.planExpiresAt ? `Hasta ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(account.planExpiresAt))}` : 'Sin vencimiento'}</p></div><div className="rounded-2xl border border-zinc-200/70 bg-white/75 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"><p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Miembro desde</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100"><CalendarDays size={16} className="text-indigo-500" />{new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric' }).format(new Date(account.createdAt))}</p></div></div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.035)] dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold tracking-tight text-zinc-900 dark:text-white">Identidad de cuenta</h3><p className="mt-1 text-sm text-zinc-500">Elige cómo quieres que te llamemos en LinkVentas.</p></div><button onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-400 active:scale-95 dark:border-zinc-700 dark:text-zinc-200"><Pencil size={13} />{editing ? 'Cancelar' : 'Editar'}</button></div>{editing ? <form onSubmit={saveName} className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-950" /><button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 dark:bg-white dark:text-zinc-900">{saving && <Loader2 size={15} className="animate-spin" />}Guardar</button></form> : <div className="mt-5 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950"><p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Nombre visible</p><p className="mt-1 font-medium text-zinc-900 dark:text-white">{account.fullName}</p></div>}<button onClick={() => { navigator.clipboard.writeText(account.id); toast.success('ID copiado para soporte') }} className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"><Copy size={13} />Copiar ID técnico para soporte</button></div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/55 p-6 dark:border-indigo-400/15 dark:bg-indigo-400/[0.06]"><ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-300" /><h3 className="mt-4 font-semibold tracking-tight text-zinc-900 dark:text-white">Tu privacidad, clara y accesible</h3><p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Puedes revisar cómo tratamos tus datos y solicitar la eliminación de tu cuenta.</p><div className="mt-5 flex flex-wrap gap-3"><a href="/privacidad" target="_blank" className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 transition hover:text-indigo-950 dark:text-indigo-300">Política de privacidad</a><a href="/eliminacion-de-datos" target="_blank" className="text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 transition hover:text-indigo-950 dark:text-indigo-300">Eliminación de datos</a></div></div></div>
    <div className="rounded-2xl border border-red-200 bg-red-50/55 p-6 dark:border-red-400/15 dark:bg-red-400/[0.05]"><div className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300"><Trash2 size={17} /></div><div><h3 className="font-semibold tracking-tight text-red-950 dark:text-red-100">Zona de privacidad</h3>{account.deletionRequest ? <p className="mt-2 text-sm leading-6 text-red-800/75 dark:text-red-200/70">Tu solicitud está en revisión. Fecha máxima de atención: <strong>{due}</strong>.</p> : <><p className="mt-2 max-w-2xl text-sm leading-6 text-red-800/75 dark:text-red-200/70">Solicita eliminar tu cuenta. Revisaremos la solicitud en hasta 7 días; cancelaremos la suscripción activa y anonimizaremos los datos personales de pedidos.</p><button disabled={deleting} onClick={requestDeletion} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-500 hover:bg-red-50 active:scale-95 disabled:opacity-60 dark:border-red-400/25 dark:bg-transparent dark:text-red-200">{deleting && <Loader2 size={15} className="animate-spin" />}Solicitar eliminación</button></>}</div></div></div>
  </section>
}
