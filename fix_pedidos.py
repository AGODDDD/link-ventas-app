import re

with open('app/dashboard/pedidos/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add PedidosSkeleton above export default function PedidosPage()
skeleton = """const PedidosSkeleton = () => (
    <div className="space-y-6 pb-12 relative w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div className="space-y-3 w-full">
                <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="flex gap-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-6">
            {[1, 2].map(i => (
                <div key={i} className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-xl">
                    <div className="bg-zinc-50 dark:bg-[#131317] px-6 py-4 flex flex-col sm:flex-row justify-between border-b border-zinc-200/50 dark:border-zinc-800/50 gap-3">
                        <div className="flex gap-3">
                            <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                            <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse"></div>
                        </div>
                        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                    </div>
                    <div className="p-6 grid md:grid-cols-12 gap-6">
                        <div className="md:col-span-4 space-y-4">
                            <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2"></div>
                            <div className="flex gap-3">
                                <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                <div className="space-y-2">
                                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                    <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                </div>
                            </div>
                            <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mt-4"></div>
                        </div>
                        <div className="md:col-span-4 space-y-3">
                            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-3"></div>
                            <div className="h-12 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                            <div className="h-12 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                        </div>
                        <div className="md:col-span-4 space-y-3">
                            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-3"></div>
                            <div className="h-16 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                            <div className="flex gap-2">
                                <div className="h-10 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                <div className="h-10 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
)

export default function PedidosPage()"""

content = content.replace('export default function PedidosPage()', skeleton)

# 2. Replace states
old_states = """    const { orders, ordersCargadas, cargarOrders, actualizarEstadoOrderLocal } = useDashboardStore()
    const [loading, setLoading] = useState(!ordersCargadas)

    // Estado para el Modal de Comprobante
    const [selectedProof, setSelectedProof] = useState<string | null>(null)
    const [proofLoading, setProofLoading] = useState(false)

    // Estado para Rescates (Leads Mágicos)
    const [activeTab, setActiveTab] = useState<'orders' | 'leads' | 'delivery'>('delivery')
    const [leads, setLeads] = useState<any[]>([])
    const [loadingLeads, setLoadingLeads] = useState(false)

    // Delivery orders
    const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
    const [loadingDelivery, setLoadingDelivery] = useState(true)"""

new_states = """    const { orders, cargarOrders, actualizarEstadoOrderLocal, leads, cargarLeads } = useDashboardStore()
    const [isInitialLoad, setIsInitialLoad] = useState(true)

    // Estado para el Modal de Comprobante
    const [selectedProof, setSelectedProof] = useState<string | null>(null)
    const [proofLoading, setProofLoading] = useState(false)

    // Estado para Rescates (Leads Mágicos)
    const [activeTab, setActiveTab] = useState<'orders' | 'leads' | 'delivery'>('delivery')"""

content = content.replace(old_states, new_states)

# 3. Replace useEffect and fetchLeads
old_effect = """    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (profile) {
                setPerfil(profile)
                setPlanStatus(profile.plan ?? null)
            }

            await cargarOrders(user.id)
            setLoading(false)
            fetchLeads(user.id)

            // Auto-cancelar pedidos pendientes de pago expirados (> 24h)
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const { orders: storeOrders, actualizarEstadoOrderLocal } = useDashboardStore.getState()
            
            const expiredOrders = storeOrders.filter(o => 
                (o.status === 'pendiente_pago' || (o.status === 'pendiente' && o.metodo_pago === 'whatsapp')) && 
                new Date(o.created_at) < twentyFourHoursAgo
            )

            if (expiredOrders.length > 0) {
                for (const order of expiredOrders) {
                    const { error } = await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id)
                    if (!error) {
                        actualizarEstadoOrderLocal(order.id, 'cancelado')
                    }
                }
                toast.error(`${expiredOrders.length} pedido(s) fueron cancelados automáticamente por falta de pago (24h)`)
            }

            // Pedir permiso de notificaciones del navegador
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission()
            }
        }
        init()
    }, [cargarOrders])

    const fetchLeads = async (userId: string) => {
        setLoadingLeads(true)
        const { data } = await supabase
            .from('store_leads')
            .select('*')
            .eq('store_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)
        
        if (data) setLeads(data)
        setLoadingLeads(false)
    }

    const forceRefresh = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setLoading(true)
        await cargarOrders(user.id, true)
        fetchLeads(user.id)
        setLoading(false)
    }"""

new_effect = """    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                if (profile) {
                    setPerfil(profile)
                    setPlanStatus(profile.plan ?? null)
                }

                await Promise.all([
                    cargarOrders(user.id),
                    cargarLeads(user.id)
                ])

                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                const { orders: storeOrders, actualizarEstadoOrderLocal: storeUpdateLocal } = useDashboardStore.getState()
                
                const expiredOrders = storeOrders.filter(o => 
                    (o.status === 'pendiente_pago' || (o.status === 'pendiente' && o.metodo_pago === 'whatsapp')) && 
                    new Date(o.created_at) < twentyFourHoursAgo
                )

                if (expiredOrders.length > 0) {
                    for (const order of expiredOrders) {
                        const { error } = await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id)
                        if (!error) {
                            storeUpdateLocal(order.id, 'cancelado')
                        }
                    }
                    toast.error(`${expiredOrders.length} pedido(s) fueron cancelados automáticamente por falta de pago (24h)`)
                }

                if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission()
                }
            }
            setIsInitialLoad(false)
        }
        load()
    }, [cargarOrders, cargarLeads])

    const forceRefresh = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setIsInitialLoad(true)
        await Promise.all([
            cargarOrders(user.id, true),
            cargarLeads(user.id, true)
        ])
        setIsInitialLoad(false)
    }"""

content = content.replace(old_effect, new_effect)

# 4. Replace initial loading conditional
content = content.replace(
    'if (loading) return <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 font-bold animate-pulse">Cargando pedidos... 🛰️</div>',
    'if (isInitialLoad) return <PedidosSkeleton />'
)

# 5. Remove visual nested conditionals
content = re.sub(r'\{\!ordersCargadas \? \(\s*<p className="text-center font-bold text-zinc-500 dark:text-zinc-400 animate-pulse py-10">Cargando pedidos delivery\.\.\. 🛵</p>\s*\) : filteredDelivery\.length === 0 \? \(', '{filteredDelivery.length === 0 ? (', content)

content = re.sub(r'\{\!ordersCargadas \? \(\s*<p className="text-center font-bold text-zinc-500 dark:text-zinc-400 animate-pulse py-10">Cargando\.\.\. 🛰️</p>\s*\) : filteredStandard\.length === 0 \? \(', '{filteredStandard.length === 0 ? (', content)

content = re.sub(r'\{loadingLeads \? \(\s*<p className="text-center font-bold text-zinc-500 dark:text-zinc-400 animate-pulse py-10">Cargando base\.\.\. 📇</p>\s*\) : filteredLeads\.length === 0 \? \(', '{filteredLeads.length === 0 ? (', content)

with open('app/dashboard/pedidos/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

