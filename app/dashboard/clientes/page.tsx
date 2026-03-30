'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Users, Mail, Phone, Tag, Calendar, ArrowUpDown, Trash2, MessageCircle } from 'lucide-react'

type Lead = {
    id: string
    created_at: string
    name: string
    email: string
    phone: string
    preference: string
    store_id: string
}

type SortKey = 'created_at' | 'name' | 'preference'
type SortDir = 'asc' | 'desc'

export default function ClientesPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterPref, setFilterPref] = useState<string>('all')
    const [sortKey, setSortKey] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    useEffect(() => {
        const cargarLeads = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('store_leads')
                .select('*')
                .eq('store_id', user.id)
                .order('created_at', { ascending: false })

            if (!error && data) setLeads(data)
            setLoading(false)
        }
        cargarLeads()
    }, [])

    // Preferencias únicas para el filtro
    const preferenciasUnicas = useMemo(() => {
        const prefs = new Set(leads.map(l => l.preference).filter(Boolean))
        return Array.from(prefs)
    }, [leads])

    // Filtrado y búsqueda
    const leadsFiltrados = useMemo(() => {
        let resultado = leads

        // Búsqueda
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            resultado = resultado.filter(l =>
                l.name?.toLowerCase().includes(term) ||
                l.email?.toLowerCase().includes(term) ||
                l.phone?.includes(term)
            )
        }

        // Filtro por preferencia
        if (filterPref !== 'all') {
            resultado = resultado.filter(l => l.preference === filterPref)
        }

        // Ordenamiento
        resultado = [...resultado].sort((a, b) => {
            let valA = a[sortKey] || ''
            let valB = b[sortKey] || ''
            if (sortKey === 'created_at') {
                return sortDir === 'desc'
                    ? new Date(valB).getTime() - new Date(valA).getTime()
                    : new Date(valA).getTime() - new Date(valB).getTime()
            }
            return sortDir === 'desc'
                ? valB.localeCompare(valA)
                : valA.localeCompare(valB)
        })

        return resultado
    }, [leads, searchTerm, filterPref, sortKey, sortDir])

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')
        } else {
            setSortKey(key)
            setSortDir('desc')
        }
    }

    const eliminarLead = async (id: string) => {
        if (!confirm('¿Eliminar este lead permanentemente?')) return
        const { error } = await supabase.from('store_leads').delete().eq('id', id)
        if (!error) setLeads(prev => prev.filter(l => l.id !== id))
    }

    // Stats
    const leadsHoy = leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length
    const leadsSemana = leads.filter(l => {
        const diff = Date.now() - new Date(l.created_at).getTime()
        return diff < 7 * 24 * 60 * 60 * 1000
    }).length

    if (loading) return <div className="p-8 text-center text-on-surface-variant font-bold animate-pulse">Cargando base de clientes... 📇</div>

    return (
        <div className="space-y-6 pb-12 relative w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Clientes & Leads 📇</h1>
                    <p className="text-on-surface-variant">Base de datos de prospectos interesados en tu marca.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-surface-container-high p-5 rounded-xl border border-outline-variant/5">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Total Leads</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-on-surface">{leads.length}</span>
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                </div>
                <div className="bg-surface-container-high p-5 rounded-xl border border-outline-variant/5">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Nuevos Esta Semana</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-on-surface">{leadsSemana}</span>
                        <span className="text-secondary text-xs font-bold">↑ {leadsHoy} hoy</span>
                    </div>
                </div>
                <div className="bg-surface-container-high p-5 rounded-xl border border-outline-variant/5">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Preferencia Top</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold tracking-tighter text-on-surface truncate">
                            {preferenciasUnicas[0] || '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-lg flex-1 border border-outline-variant/10">
                    <Search className="text-on-surface-variant w-4 h-4 shrink-0" />
                    <input
                        className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-on-surface-variant/50 w-full text-on-surface outline-none"
                        placeholder="Buscar por nombre, email o teléfono..."
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={filterPref}
                    onChange={e => setFilterPref(e.target.value)}
                    className="bg-surface-container-high text-on-surface text-sm px-4 py-2 rounded-lg border border-outline-variant/10 outline-none cursor-pointer"
                >
                    <option value="all">Todas las preferencias</option>
                    {preferenciasUnicas.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/5 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-surface-container-high">
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                        Cliente <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Contacto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                    <button onClick={() => toggleSort('preference')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                        Preferencia <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                        Fecha <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                            {leadsFiltrados.length > 0 ? (
                                leadsFiltrados.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-surface-container-high/50 transition-colors group">
                                        {/* Avatar + Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs uppercase text-primary border border-primary/20">
                                                    {lead.name ? lead.name.substring(0, 2) : '??'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-on-surface">{lead.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
                                                    <Mail className="w-3 h-3 shrink-0" /> {lead.email}
                                                </p>
                                                <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
                                                    <Phone className="w-3 h-3 shrink-0" /> {lead.phone || '—'}
                                                </p>
                                            </div>
                                        </td>
                                        {/* Preference */}
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 whitespace-nowrap flex items-center gap-1 w-fit">
                                                <Tag className="w-3 h-3" /> {lead.preference}
                                            </span>
                                        </td>
                                        {/* Date */}
                                        <td className="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(lead.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                                                {new Date(lead.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                {lead.phone && (
                                                    <a
                                                        href={`https://wa.me/${lead.phone.replace(/\s/g, '')}?text=Hola%20${encodeURIComponent(lead.name)},%20te%20escribimos%20de%20nuestra%20tienda`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                                                        title="Contactar por WhatsApp"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => eliminarLead(lead.id)}
                                                    className="p-2 rounded-lg hover:bg-error/10 text-error/60 hover:text-error transition-colors"
                                                    title="Eliminar lead"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center">
                                        <Users className="w-12 h-12 text-on-surface-variant/20 mx-auto mb-4" />
                                        <p className="text-on-surface-variant text-lg font-bold">
                                            {searchTerm || filterPref !== 'all' ? 'No se encontraron resultados' : 'Tu lista de clientes está vacía'}
                                        </p>
                                        <p className="text-on-surface-variant/60 text-sm mt-1">
                                            {searchTerm || filterPref !== 'all'
                                                ? 'Intenta con otra búsqueda o filtro.'
                                                : 'Comparte tu tienda para empezar a captar prospectos.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer count */}
            {leadsFiltrados.length > 0 && (
                <p className="text-xs text-on-surface-variant/50 text-right">
                    Mostrando {leadsFiltrados.length} de {leads.length} leads
                </p>
            )}
        </div>
    )
}
