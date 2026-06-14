'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Users, Mail, Phone, Tag, Calendar, ArrowUpDown, Trash2, MessageCircle } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'

type SortKey = 'created_at' | 'name' | 'preference'
type SortDir = 'asc' | 'desc'

// Componente Skeleton (Pixel Perfect)
const ClientesSkeleton = () => (
    <div className="space-y-6 pb-12 relative w-full">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div className="space-y-3 w-full">
                <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-3"></div>
                    <div className="flex items-baseline gap-2">
                        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                        <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>

        {/* Search & Filters Bar Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 px-4 py-2 rounded-lg flex-1 border border-zinc-200 dark:border-zinc-800/50 opacity-50">
                <Search className="text-zinc-400 w-4 h-4 shrink-0" />
                <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 w-48 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/50 opacity-50 h-10 flex items-center">
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900">
                            <th className="px-6 py-4"><div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></th>
                            <th className="px-6 py-4"><div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></th>
                            <th className="px-6 py-4"><div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></th>
                            <th className="px-6 py-4"><div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
                                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                        <div className="h-2 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
)

export default function ClientesPage() {
    const { leads, cargarLeads, eliminarLeadLocal } = useDashboardStore()
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterPref, setFilterPref] = useState<string>('all')
    const [sortKey, setSortKey] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    // Paginación UI (Performance Tweak)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await cargarLeads(user.id)
            }
            setIsInitialLoad(false)
        }
        load()
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
        setCurrentPage(1) // Reset página al ordenar
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
        if (!error) eliminarLeadLocal(id)
    }

    // Stats
    const leadsHoy = leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length
    const leadsSemana = leads.filter(l => {
        const diff = Date.now() - new Date(l.created_at).getTime()
        return diff < 7 * 24 * 60 * 60 * 1000
    }).length

    if (isInitialLoad) return <ClientesSkeleton />

    // Paginación (Computed Bounds)
    const totalPages = Math.ceil(leadsFiltrados.length / ITEMS_PER_PAGE);
    const paginatedLeads = leadsFiltrados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Componente de Paginación Premium
    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-center items-center gap-2 mt-6 pb-2">
                <button 
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="p-2 rounded-xl text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 transition-colors disabled:opacity-30 shadow-sm"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className={`w-10 h-10 rounded-xl font-bold transition-all border ${currentPage === page ? 'bg-primary text-on-primary border-primary shadow-lg scale-105' : 'text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-zinc-50 dark:bg-zinc-900'}`}
                    >
                        {page}
                    </button>
                ))}
                
                <button 
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="p-2 rounded-xl text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 transition-colors disabled:opacity-30 shadow-sm"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-12 relative w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">Clientes & Leads</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Base de datos de prospectos interesados en tu marca.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up delay-100">
                <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Total Leads</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">{leads.length}</span>
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Nuevos Esta Semana</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">{leadsSemana}</span>
                        <span className="text-secondary text-xs font-bold">↑ {leadsHoy} hoy</span>
                    </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Preferencia Top</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold tracking-tighter text-zinc-900 dark:text-zinc-100 truncate">
                            {preferenciasUnicas[0] || '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-200">
                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 px-4 py-2 rounded-lg flex-1 border border-zinc-200 dark:border-zinc-800/50">
                    <Search className="text-zinc-500 dark:text-zinc-400 w-4 h-4 shrink-0" />
                    <input
                        className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-zinc-500 dark:text-zinc-400/50 w-full text-zinc-900 dark:text-zinc-100 outline-none"
                        placeholder="Buscar por nombre, email o teléfono..."
                        type="text"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <select
                    value={filterPref}
                    onChange={e => { setFilterPref(e.target.value); setCurrentPage(1); }}
                    className="bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/50 outline-none cursor-pointer"
                >
                    <option value="all">Todas las preferencias</option>
                    {preferenciasUnicas.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl animate-fade-in-up delay-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900">
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                        Cliente <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Contacto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                    <button onClick={() => toggleSort('preference')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                        Preferencia <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                        Fecha <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                            {paginatedLeads.length > 0 ? (
                                paginatedLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-zinc-50 dark:bg-zinc-900/50 transition-colors group">
                                        {/* Avatar + Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs uppercase text-primary border border-primary/20">
                                                    {lead.name ? lead.name.substring(0, 2) : '??'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{lead.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                    <Mail className="w-3 h-3 shrink-0" /> {lead.email}
                                                </p>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
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
                                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(lead.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400/50 mt-0.5">
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
                                        <Users className="w-12 h-12 text-zinc-500 dark:text-zinc-400/20 mx-auto mb-4" />
                                        <p className="text-zinc-500 dark:text-zinc-400 text-lg font-bold">
                                            {searchTerm || filterPref !== 'all' ? 'No se encontraron resultados' : 'Tu lista de clientes está vacía'}
                                        </p>
                                        <p className="text-zinc-500 dark:text-zinc-400/60 text-sm mt-1">
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
                {renderPagination()}
            </div>

            {/* Footer count */}
            {leadsFiltrados.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400/50 text-right mt-2">
                    Mostrando {paginatedLeads.length} leads de un total de {leadsFiltrados.length} encontrados (Base total: {leads.length})
                </p>
            )}
        </div>
    )
}
