import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key'

test('el cache del dashboard se conserva solo para el mismo usuario', async () => {
  const { useDashboardStore } = await import('../store/useDashboardStore')
  const state = useDashboardStore.getState()

  state.prepararParaUsuario('user-a')
  useDashboardStore.setState({
    orders: [{ id: 'order-a' }],
    ordersLastFetch: Date.now(),
    leads: [{ id: 'lead-a', store_id: 'store-a', name: 'Cliente A', created_at: new Date().toISOString() }],
    leadsLastFetch: Date.now(),
  })

  useDashboardStore.getState().prepararParaUsuario('user-a')
  assert.equal(useDashboardStore.getState().orders.length, 1)

  useDashboardStore.getState().prepararParaUsuario('user-a', true)
  assert.deepEqual(useDashboardStore.getState().orders, [])

  useDashboardStore.setState({ orders: [{ id: 'order-a-2' }], ordersLastFetch: Date.now() })

  useDashboardStore.getState().prepararParaUsuario('user-b')
  const switched = useDashboardStore.getState()
  assert.equal(switched.dashboardOwnerId, 'user-b')
  assert.deepEqual(switched.orders, [])
  assert.deepEqual(switched.leads, [])
  assert.equal(switched.ordersLastFetch, 0)
  assert.equal(switched.leadsLastFetch, 0)
})

test('cerrar sesión elimina el propietario y todos los datos cacheados', async () => {
  const { useDashboardStore } = await import('../store/useDashboardStore')
  useDashboardStore.getState().prepararParaUsuario('user-a')
  useDashboardStore.setState({ productos: [{ id: 'product-a', name: 'Producto A', price: 10, stock: 1 }] })

  useDashboardStore.getState().limpiarDashboard()
  const cleared = useDashboardStore.getState()
  assert.equal(cleared.dashboardOwnerId, null)
  assert.deepEqual(cleared.productos, [])
  assert.deepEqual(cleared.orders, [])
  assert.deepEqual(cleared.abandonedCarts, [])
})

test('la tienda resuelta por el layout queda disponible para las demás vistas', async () => {
  const { useDashboardStore } = await import('../store/useDashboardStore')
  const store = {
    id: 'store-a',
    owner_id: 'user-a',
    slug: 'tienda-a',
    name: 'Tienda A',
    template_type: 'comercio' as const,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  useDashboardStore.getState().establecerStoreInfo('user-a', store)

  assert.equal(useDashboardStore.getState().dashboardOwnerId, 'user-a')
  assert.equal(useDashboardStore.getState().storeInfo?.id, 'store-a')
})
