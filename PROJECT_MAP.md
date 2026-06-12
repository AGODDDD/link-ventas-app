# Mapa de navegación del proyecto

Este documento detalla la estructura física del repositorio LinkVentas.

## Árbol de Carpetas Principal

- `/app`: Rutas del sistema (Next.js 15 App Router).
- `/components`: Componentes visuales de React reutilizables (Dashboard, Tienda, UI genérica).
- `/hooks`: Custom React Hooks (ej: `useFomo.ts`).
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
- `components/tienda/FomoBanner.tsx`: Módulo de persuasión (Social Stock).
- `store/useCartStore.ts`: Estado global del carrito de compras (Zustand).
- `store/useCustomerStore.ts`: Estado del comprador con orders (incluye `coreId` UUID para realtime).

### Dashboard (Frontend Administrativo)
- `app/dashboard/page.tsx`: Vista principal de ventas y estados del merchant.
- `app/dashboard/pedidos/page.tsx`: Gestión de pedidos con timeline de 6 estados + auto-cancelación 24h.
- `app/dashboard/configuracion/page.tsx`: Configuración del perfil, FOMO y llaves de Culqi.
- `components/dashboard/DashboardTopBar.tsx`: Realtime unificado (canales `orders` + `delivery_orders`) con notificaciones push + sonido.
- `components/dashboard/ThermalReceipt.tsx`: Generador de tickets para impresoras térmicas.
- `store/useDashboardStore.ts`: Estado unificado del dashboard con fetch triple-path (core + legacy_delivery + legacy_standard).

### Base de Datos
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

