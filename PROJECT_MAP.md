# Mapa de navegación del proyecto

Este documento detalla la estructura física del repositorio LinkVentas.

## Árbol de Carpetas Principal

- `/app`: Rutas del sistema (Next.js 15 App Router).
- `/components`: Componentes visuales de React reutilizables (Dashboard, Tienda, UI genérica).
- `/hooks`: Custom React Hooks.
- `/lib`: Utilidades, helpers y clientes (Supabase, cifrado, PDFs, impresión térmica).
- `/scripts`: Scripts de mantenimiento del proyecto.
- `/store`: Gestores de estado global (Zustand).
- `/public`: Archivos estáticos.
- `/types`: Definiciones de TypeScript.
- `/supabase/migrations`: Migraciones SQL formales gestionadas vía Supabase CLI.

## Archivos y Módulos Críticos

### Backend & API
- `app/api/webhooks/culqi/route.ts`: Endpoint seguro para recibir confirmaciones de pago (Zero-Trust con verificación directa a API Culqi).
- `app/api/checkout/culqi/route.ts`: Procesamiento de cobro Culqi con idempotencia y verificación de plan activo.
- `app/api/pedidos/ticket/route.ts`: Generación de tickets térmicos PDF con código de barras CODE128.
- `lib/supabaseServer.ts`: Cliente de Supabase con permisos privilegiados (`service_role`).
- `lib/encryption.ts`: Funciones de cifrado para proteger llaves de pasarelas de pago (`PAYMENT_ENCRYPTION_KEY`).

### Tienda (Frontend Público)
- `app/tienda/[id]/page.tsx`: Landing de la tienda del merchant (resolución por `slug` o `uuid`).
- `app/tienda/[id]/checkout/page.tsx`: Flujo de cobro estándar (Moda/Boutique). **CRÍTICO**.
- `components/tienda/templates/RestauranteCheckoutModal.tsx`: Checkout completo para Restaurantes (WhatsApp + Culqi). **CRÍTICO**.
- `components/tienda/templates/OrderDetailModal.tsx`: Tracking del cliente con mapa Leaflet + Realtime (filtro por UUID PK) + polling 2s.
- `components/tienda/templates/OrderHistoryPanel.tsx`: Historial de pedidos del comprador con sincronización por `coreId` (UUID).
- `components/tienda/FomoBanner.tsx`: Señal de disponibilidad basada en stock real.
- `store/useCartStore.ts`: Estado global del carrito de compras (Zustand).
- `store/useCustomerStore.ts`: Estado del comprador con orders (incluye `coreId` UUID para realtime).

### Dashboard (Frontend Administrativo)
- `app/dashboard/page.tsx`: Vista principal de ventas y estados del merchant.
- `app/dashboard/pedidos/page.tsx`: Gestión de pedidos con timeline de 6 estados + auto-cancelación 24h. Integrado con `PedidosSkeleton`.
- `app/dashboard/clientes/page.tsx`: Gestión de CRM. Integrado con `ClientesSkeleton`.
- `app/dashboard/analytics/page.tsx`: Panel de métricas e IA. Integrado con `AnalyticsSkeleton`.
- `app/dashboard/productos/page.tsx`: Bodega general de inventario. Integrado con `ProductosSkeleton`.
- `app/dashboard/configuracion/page.tsx`: Configuración del perfil, señal de stock y llaves de Culqi. Excluido de SWR intencionalmente.
- `components/dashboard/DashboardTopBar.tsx`: Realtime unificado con notificaciones push + sonido.
- `components/dashboard/ThermalReceipt.tsx`: Generador de tickets para impresoras térmicas.
- `store/useDashboardStore.ts`: Estado unificado SWR (Stale-While-Revalidate) del dashboard con flags `lastFetch` para Zero-Load Navigation.

### Super Admin (Panel SaaS)
- `app/admin/layout.tsx`: Layout exclusivo con validación server-side de `ADMIN_USER_ID`, sidebar admin y ThemeProvider.
- `app/admin/page.tsx`: Dashboard KPIs (Total Tiendas, Plan Pro, Plan Emprendedor, Ingresos Estimados) + Gestor de Tiendas.
- `components/admin/AdminSidebar.tsx`: Sidebar exclusivo del admin con navegación y link de retorno al panel merchant.
- `components/admin/AdminStoresTable.tsx`: Tabla interactiva con búsqueda, badges de estado y acciones de plan/suspensión.
- `app/api/admin/stores/route.ts`: GET — Consulta cruzada `stores`+`profiles` con `getSupabaseServiceClient()` (bypass RLS).
- `app/api/admin/suspend/route.ts`: POST — Suspender/reactivar tiendas (`stores.is_active` + `profiles.plan`).
- `app/api/admin/check/route.ts`: GET — Verificación de identidad admin via `ADMIN_USER_ID`.
- `app/api/admin/plans/route.ts`: POST — Activar/desactivar planes Pro.

### Base de Datos
- `supabase/migrations/20260000000005_unify_store_configuration.sql`: backfill de configuración comercial a `stores` y `store_config`; `profiles` queda para Auth, planes y secretos.
- `supabase/migrations/20260000000002_add_pendiente_verificacion.sql`: Estado `pendiente_verificacion` para pagos por transferencia.
- `supabase/migrations/20260000000003_store_order_sequences.sql`: Tabla `store_sequences` + RPC `get_next_order_sequence` para IDs secuenciales diarios.

## Archivos Protegidos (NO MODIFICAR sin revisión extrema)
1. `lib/encryption.ts` (Corrompe las llaves de pasarela de los merchants si se cambia el algoritmo).
2. `app/api/webhooks/culqi/route.ts` (Riesgo de fraude financiero si se altera erróneamente).
3. `app/api/checkout/culqi/route.ts` (Procesamiento de cobros reales).

## Arquitectura de IDs de Pedidos
- **`id` (UUID):** Clave primaria interna en tabla `orders`. Usado para Realtime, FK con `order_items`, y referencia del vendedor.
- **`legacy_id` (String):** Código secuencial humano (ej. `BARR-110626-0105`). Usado en tickets, historial del comprador, y comunicación con el cliente.
- **`coreId` en `useCustomerStore`:** UUID almacenado en localStorage del comprador para suscripción Realtime por clave primaria.
