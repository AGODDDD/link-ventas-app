# Historial de cambios

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [Unreleased]

### Changed
- Resumen y Órdenes comparten ahora un sistema cromático único para estados, facilitando el escaneo de pendientes, preparación, envío, completados y cancelaciones.
- La barra superior elimina el copy redundante de marca, “Nuevo producto” pasa junto a “Gestionar pedidos” y el sidebar adopta el encabezado “Workspace”.
- La cabecera del dashboard ahora saluda al comerciante por su nombre y muestra fecha local con el estado real de sincronización.
- El sidebar reemplaza la numeración editorial por bullets y usa un estado activo negro, más cercano al acabado del producto de referencia.
- Refactor masivo de APIs de órdenes y checkouts, webhooks y optimización de base de datos.
- Consolidado el contrato de pedidos: una tienda por cuenta, estados validados por RPC, reservas de inventario y stock por combinación de Moda.
- Mercado Pago ahora se concilia por webhook; el checkout y la suscripción Pro no confirman pagos por respuesta síncrona.
- Renombrado el punto de entrada Edge a `middleware.ts`, alineado el plan Pro a S/ 25 y eliminado el CTA de WhatsApp ficticio.
- Documentada la auditoría UX integral del dashboard, incluyendo pruebas interactivas, capturas y brechas de Configuración/Catálogo para Restaurante, Comercio y Moda.
- Reorganizado el dashboard alrededor de datos reales: búsqueda/filtros de pedidos, compradores derivados de órdenes, oportunidades separadas y lenguaje comercial consistente.
- Especializada la operación por plantilla y conectada al storefront: delivery/recojo y pedido mínimo en Restaurante; envíos y despacho en Comercio; guía de tallas y cambios en Moda.
- Catálogo Moda ahora exige talla y color, muestra una matriz de stock por combinación y evita replicar el stock base en cada variante.

### Added
- Consolidación del modelo de negocio (`contract_cleanup.sql`) integrando validaciones de stock, unificación de middleware y limpieza general de APIs obsoletas.
- `AUDITORIA_UX_DASHBOARD_2026-07-30.md` y su set de capturas reproducibles.
- Migración `20260731050909_template_operations_config.sql` para persistir configuración operativa específica por plantilla.
- **Auditoría Forense Ultra-Profunda del Modelo de Negocio y Base de Datos**:
  - Análisis de segundo nivel sobre Supabase, Zustand, KPIs financieros, tickets térmicos PDF y flujos de Mercado Pago.
  - Hallazgos confirmados:
    1. Inflación falsa de ingresos totales en Dashboard y Analíticas (suma de órdenes canceladas y no pagadas).
    2. Fallo SQL en carritos abandonados por descalce de columnas (`abandoned_carts.last_updated`, `cart_json`, `updated_at`).
    3. Error en ticket térmico PDF por referencia a `order.total_price` que imprime totales en S/ 0.00.
    4. Inactividad del middleware Edge por denominarse `proxy.ts`.

### Fixed
- Eliminadas del Resumen las señales operativas ficticias, los avatares decorativos y los controles sin acción.
- Pedidos ya no abre la vista de restaurante para tiendas Comercio o Moda y ahora permite buscar, filtrar y actualizar.
- Analytics calcula conversión con el mismo periodo, no fusiona homónimos y no expone controles bloqueados detrás del paywall.
- Plan Pro explica explícitamente cuándo Mercado Pago no está configurado.
- Corregido el mismatch esperado de hidratación de tema y añadidos nombres accesibles a controles globales y campos principales de producto.
- Separadas las paletas semánticas de día y noche, con contraste legible en textos auxiliares, botones, formularios y banners.
- Sustituidos iconos decorativos y emojis genéricos del dashboard por navegación editorial, etiquetas tipográficas y controles funcionales.



## [2026-07-30] — Premium UI & Moda Finalization

### Added
- **Diseño Premium Anti-IA**: Creada una nueva skill (`.agents/skills/diseno_premium/SKILL.md`) para estandarizar interfaces de alta gama.
- **Iconografía Animada**: Migración global desde íconos estáticos de Lucide a íconos interactivos de `animateicons.in` (construidos sobre `motion/react`).
- **Migración de Base de Datos**: Añadida la función `create_order_from_cart` (migración `20260000000009`) para validar tallas, colores y existencias directamente a nivel de base de datos durante el checkout.

### Changed
- **Nicho de Comercio General (`ComercioTemplate.tsx`)**: Implementado flujo de tienda sin variantes con estética Premium (Bento grid asimétrica, fondos off-white). Se integraron los íconos animados (`animateicons`) para acciones de carrito rápido con validación de inventario en tiempo real.
  - Optimizaciones adicionales de UX y micro-interacciones a través del navbar, quick view y product grid.
  - Agregado `ComercioQuickView` para visualización rápida de productos sin fricción en el catálogo de Comercio General.
  - Añadido `ComercioHeroCarousel` y ajustes globales (`globals.css`) para potenciar el escaparate del nicho Comercio General.
  - Refinamientos de UI/UX en `ComercioNavbar` y `ProductGrid` para hacer la navegación y presentación de productos más fluida.
- **Landing Page (`/app/page.tsx`)**: Rediseño completo con paleta Off-White/Carbono, animaciones GSAP (ScrollTrigger), sección de historias y comparativa interactiva.
- **Nicho de Moda (`ModaTemplate.tsx`, Checkout)**: Auditoría lógica y rediseño completo del flujo de selección de variantes, ahora respaldado por el total del servidor y la base de datos.
- **Persistencia de Carrito**: Mejoras en `useCartStore.ts` para identidad estable por variante y saneamiento.

## [2026-07-30] — Debugging & Estabilidad de Pagos

### Fixed
- **Integración Mercado Pago en Tiendas**:
  - Solucionado el bug de "barras infinitas" (skeletons) al cargar el formulario de tarjetas de crédito. Se refactorizó `MercadoPagoCardPayment.tsx` migrando del SDK Vanilla manual al paquete oficial `@mercadopago/sdk-react`.
  - Agregado manejo de errores local en el componente (`try/catch` en `handleSubmit`) para evitar bloqueos del UI (botón de Pagar congelado) cuando el SDK o la API rechazan el pago.
  - Actualizado el endpoint `/api/checkout/mercadopago` para interceptar correctamente errores estructurados (HTTP 400) desde la API de Mercado Pago y extraer el mensaje detallado (`payment.message` o `status_detail`), exponiéndolo al frontend.
  - Corregida la condición de falla engañosa que ocultaba rechazos nativos (ej. `cc_rejected_other_reason`, `invalid_access_token`) con mensajes genéricos.

## [2026-07-29] — Panel Super Admin SaaS

### Added
- **Panel Super Admin** (`/admin`): Dashboard SaaS con métricas KPI, gestor de tiendas y acciones administrativas.
  - Layout exclusivo con sidebar Admin (`components/admin/AdminSidebar.tsx`) y validación server-side via `/api/admin/check` + `ADMIN_USER_ID`.
  - 4 KPI cards: Total Tiendas, Plan Pro Activo, Plan Emprendedor (Gratis), Ingresos Estimados (S/ 25/mes × Pro activas).
  - Tabla interactiva (`components/admin/AdminStoresTable.tsx`) con búsqueda, badges de estado (PRO/TRIAL/VENCIDO/GRATIS/SUSPENDIDA), y acciones rápidas.
  - API `GET /api/admin/stores`: Consulta cruzada `stores` + `profiles` usando `getSupabaseServiceClient()` (bypass RLS). Retorna merchants + KPIs.
  - API `POST /api/admin/suspend`: Suspender tienda (`stores.is_active=false` + `profiles.plan='inactivo'`) y reactivar (`stores.is_active=true`).
  - Acciones: Activar Plan Pro (+1m, +3m, +6m), Suspender tienda (fraude), Reactivar tienda suspendida.

### Changed
- Página `/admin/page.tsx` reescrita: de Client Component con `style={{}}` inline a diseño profesional con Tailwind CSS puro, datos obtenidos desde API server-side.
- Precio Plan Pro actualizado a S/ 25/mes en cálculos e interfaz del admin.

### Security
- `ADMIN_USER_ID` validado exclusivamente en servidor (API routes). Nunca expuesto al frontend.
- Todas las rutas `/api/admin/*` verifican Bearer token + `ADMIN_USER_ID` antes de ejecutar cualquier operación.
- Datos de tiendas obtenidos con `getSupabaseServiceClient()` (service_role) — sin filtros RLS.

### Changed
- La disponibilidad limitada ahora muestra exclusivamente stock real y el delivery usa la tarifa configurada por cada restaurante.
- Las migraciones se validan en una base local limpia desde CI.
- El lint excluye utilidades de soporte y establece un baseline explícito para deuda heredada; la app y las pruebas básicas pasan sin errores ni advertencias.

### Added
- Pruebas unitarias para horario de tienda y serialización CSV mediante `npm run test:unit`.

### Fixed
- La configuración comercial ahora tiene una única fuente de verdad en `stores` y `store_config`; el storefront ya no mezcla datos de `profiles` con el Core.
- La landing y el paywall ya no dependen de estilos inline: su presentación usa utilidades Tailwind, incluidos estados interactivos y valores dinámicos de la calculadora.
- La expiración de pedidos dejó de depender de abrir el dashboard: un cron protegido ejecuta mantenimiento transaccional en servidor y clasifica carritos abandonados como recuperados o expirados.
- El Plan Pro y los pagos de tiendas usan exclusivamente Mercado Pago, con Access Tokens cifrados y confirmación inmediata en servidor.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere vagamente a Semantic Versioning.

## [2026-07-29] — Fase 1: Blindaje de Pedidos, Mercado Pago y RLS

### Seguridad
- La creación de pedidos migró a `POST /api/orders` y a la RPC transaccional `create_order_from_cart`: los precios, modificadores, stock, delivery, totales y correlativos se calculan en PostgreSQL bajo bloqueo de filas.
- Se eliminaron los `INSERT` directos de `orders` y `order_items` desde los checkouts público y de restaurante.
- Mercado Pago ya no confirma pagos desde el endpoint de cargo. El webhook exige `charge_id` único, metadata exacta de orden/tienda, `PEN`, `venta_exitosa`, estado `Exitosa` y monto idéntico antes de marcar una orden como `paid`.
- Añadida protección RLS para pedidos, ítems, carritos abandonados y configuraciones satélite; se revocó acceso anónimo directo a datos de pedido.
- `profiles` dejó de ser un origen público completo. El storefront consume exclusivamente `stores` y `store_config`; los secretos y campos internos no se serializan al cliente.
- Se añadió un guard de base de datos que bloquea cambios de totales, cargos Mercado Pago o estado `paid` desde el navegador.

### Compatibilidad
- El seguimiento de pedidos público ahora consulta `/api/orders/status`, que devuelve solo estado e identificadores, preservando el tracking sin reabrir acceso a la tabla `orders`.

## [2026-07-29] — Scripts de Mantenimiento y Configuración de Agentes

### Added
- Configuración global de entorno para agentes de IA en `.agents/AGENTS.md` asegurando que las reglas del proyecto se sigan automáticamente.
- Scripts de mantenimiento y pruebas: `fix_pedidos.py`, `scripts/fix-escapes.js`, y `scripts/test_store.ts`.

### Fixed
- Limpieza de espacios en blanco al final de la línea en `app/api/checkout/mercadopago/route.ts`.

## [2026-06-20] — Sistema de Reseñas + Rediseño ModaTemplate

### Features
- feat(moda): complete ModaTemplate with search, customer portal, address modal, dynamic content blocks and remove hardcoded sections
- feat(moda): editorial redesign — hero, product card backgrounds, benefits layout, promo banner
- feat(moda): add product reviews system with verified purchase check
- feat(configuracion): redesign settings page with two-column SaaS layout
- feat(configuracion): add Contenido de Tienda section with benefits, faqs and promo blocks
- feat(dashboard): implement SWR cache + skeleton loaders for clientes and pedidos pages

### Fixes
- fix(moda): restore video poster on mouse leave (`video.load()` after pause)
- fix(moda): use `product.image_url` as video poster fallback when `poster_url` is missing
- fix(moda): fix benefits editorial layout — CSS classes were missing from `modaUrbanStyles`; video card background set to `#000`
- fix(moda): redesign benefits cards with staggered IntersectionObserver animation
- fix(dashboard): use `lastFetch` flag instead of array length for initial state check
- fix(store): implement SWR architecture with Zustand preventing skeleton loops on empty results

### Database
- `ALTER TABLE profiles`: added columns `benefits (jsonb)`, `faqs (jsonb)`, `promo_title (text)`, `promo_description (text)`
- `GRANT UPDATE` on new columns to `authenticated` role (resolved `permission denied` on save)
- `CREATE TABLE product_reviews` with RLS policies (`SELECT` public, `DELETE` merchant-only) and unique index `(store_id, product_id, customer_email)` to prevent duplicate reviews
- `CREATE INDEX` on `product_id` and `store_id` for query performance
- `GRANT INSERT ON product_reviews TO service_role` — inserts only allowed via API route with verified purchase check

### Commits
- `9ded425` — feat(configuracion): redesign settings page with two-column SaaS layout
- `0b6e4db` — feat(moda): complete ModaTemplate with search, customer portal, address modal, dynamic content blocks and remove hardcoded sections
- `f6143eb` — feat(configuracion): add Contenido de Tienda section with benefits, faqs and promo blocks
- `baa6702` — feat(moda): redesign benefits cards with staggered intersection observer animation
- `ae53e81` — feat(moda): editorial redesign - hero, product card backgrounds, benefits layout, promo banner
- `d8a3e23` — fix(moda): fix benefits editorial layout and video card background
- `21c03fd` — fix(moda): restore video poster on mouse leave
- `7a71d62` — fix(moda): use product image_url as video poster fallback
- `d3a0551` — feat(moda): add product reviews system with verified purchase check

---

## [2026-06-14] — Refactorización Configuración (SaaS Layout)

### Modificado (UI/UX)
- **Rediseño `configuracion/page.tsx`:** Implementado un layout profesional de dos columnas (Sidebar sticky izquierdo, contenido derecho), reemplazando el apilamiento vertical infinito.
- **Consolidación de Estado:** Refactorizados 32 `useState` sueltos en dos objetos unificados `formData` e `initialData`.
- **Barra de Guardado Flotante:** Creada una barra inferior reactiva que detecta cambios (`hasChanges`) usando comparación de objetos para guardar de forma inteligente y segura.
- **Diseño Plano (Flat Design):** Eliminados todos los gradientes, emojis y efectos *glassmorphism* de la tarjeta de Suscripción y en general, asegurando la coherencia visual con el resto del Dashboard.
- **Pagos Dinámicos:** Lógica de renderizado condicional en la pestaña Pagos: esconde formularios innecesarios de carga de QRs cuando la plantilla es "Restaurante" (ya que delega el pago a WhatsApp).
- **Protección de Cambio de Plantilla:** Cambiar de plantilla ahora requiere un paso de confirmación explícito in-situ con una advertencia de riesgo, independizando esta acción de la barra de guardado global.

## [2026-06-13] — Migración SWR Dashboard
### Añadido (Performance & UX)
- **Arquitectura SWR (Stale-While-Revalidate) Global:** Migrado todo el panel de control (`useDashboardStore.ts`) para usar flags `lastFetch` y precargar datos en memoria en lugar de cargar en cada render de página.
- **Skeleton Loaders Pixel-Perfect:** Implementados esqueletos estructurales (`animate-pulse`) exactos para:
  - `ClientesSkeleton` en `app/dashboard/clientes/page.tsx`
  - `PedidosSkeleton` en `app/dashboard/pedidos/page.tsx`
  - `AnalyticsSkeleton` en `app/dashboard/analytics/page.tsx`
  - `ProductosSkeleton` en `app/dashboard/productos/page.tsx`
- **Zero-Load Navigation:** Gracias a la caché global, navegar entre pestañas del Dashboard ahora toma 0 milisegundos reales sin pantallas en blanco ni re-renders de "Cargando...".

### Corregido (Dashboard)
- **Flashes de Skeletons Infinitos:** Corregido el bug donde el estado inicial se evaluaba basado en `array.length === 0`. Si una tienda no tenía ventas, quedaba atrapada en skeleton infinito. Ahora evalúa estrictamente los timestamps `lastFetch === 0`.
- **Race Condition de Supabase en Store:** Corregido bug donde un retorno de error o array vacío de Supabase (ej. `abandoned_carts`) prevenía la actualización del flag `lastFetch`, causando bucles de skeletons en cada re-render. Ahora el store registra `Date.now()` para todo intento independientemente del resultado.

## [2026-06-11] — Sesión 11
### Corregido (Alta Severidad)
- **Realtime del cliente Mercado Pago roto:** El `OrderDetailModal.tsx` escuchaba cambios en `delivery_orders` por `id`, pero Mercado Pago solo escribe en `orders`. Además, el filtro usaba `legacy_id` (no es clave primaria), lo cual Supabase Realtime **ignora silenciosamente**. El cliente caía al polling de 8s, causando retraso perceptible de 3-5s.
  - **Fix:** Se añadió `coreId` (UUID) a la interfaz `Order` del cliente (`useCustomerStore.ts`). La suscripción Realtime ahora filtra por `id=eq.<UUID>` (clave primaria) → **instantáneo**.
  - **Fix:** Polling de respaldo reducido de 8s a 2s como safety net.
- **Pedidos auto-cancelados al crearse (Mercado Pago + WhatsApp):** El `RestauranteCheckoutModal.tsx` insertaba el `legacy_id` (ej. `BARR-110626-0006`) directamente como `id` en la tabla `orders`, cuya columna exige UUID. Postgres rechazaba con `invalid input syntax for type uuid`, la orden nunca se creaba, y el frontend lo interpretaba como "cancelado".
  - **Fix:** Se genera `crypto.randomUUID()` compartido antes de ambos flujos (Mercado Pago y WhatsApp). El UUID va como `id`, el código bonito va como `legacy_id`.
- **Historial del cliente mostraba "Completado" al instante:** Colisión de `legacy_id` entre pruebas antiguas y nuevas. El `OrderHistoryPanel.tsx` consultaba `delivery_orders` (tabla legacy con datos viejos marcados como completados).
  - **Fix:** Migrada la consulta a tabla `orders` (core), con deduplicación por `legacy_id` tomando siempre el registro más reciente. Status `paid` se mapea a `pendiente` en la vista del comprador.
- **DB: REPLICA IDENTITY FULL:** Ejecutado `ALTER TABLE orders REPLICA IDENTITY FULL` para que Supabase Realtime transmita todos los campos en cada UPDATE por WebSocket.
- **Sincronización `legacy_id` en Realtime:** El trigger de BD generaba el `legacy_id` después del INSERT inicial. El frontend recibía `null` y mostraba códigos incompletos al compartir.
  - **Fix:** `DashboardTopBar.tsx` parchea el store en cuanto llega el webhook `UPDATE` con el `legacy_id` generado.
- **Deduplicación de Pedidos en Modal Compartir:** Los pedidos de WhatsApp entraban por canales `orders` y `delivery_orders`. El segundo ganaba, insertándose sin `legacy_id`. El modal intentaba hacer `split('-')` sobre `"BARR"`, cortando el ID.
  - **Fix:** Modal y funciones de descarga detectan `_source === 'legacy_delivery'` para usar el campo `id` completo (que ya contiene el código BARR).
- **Alineación de montos en PDF Ticket:** Los montos (Monto, Subtotal, Delivery, Total) se desalineaban en el PDF porque se usaba padding por caracteres `padStart`/`padEnd`, lo cual falla con fuentes monoespaciadas cuando se mezcla `fontSize`.
  - **Fix:** Motor de dibujado reescrito a coordenadas absolutas `doc.text(..., x, y, { width, align: 'right' })`. Precisión perfecta a nivel de píxel.
- **Error 403 al Descargar PDF (Legacy):** El PDF fallaba en pedidos "legacy_delivery" porque la API verificaba `if (order.store_id !== user.id)` pero el mapeador interno `getOrderById` omitía transferir el `store_id` a la respuesta, evaluándose `undefined !== user.id` y retornando 403.
  - **Fix:** Añadido explícitamente `store_id: deliveryData.store_id` en el mapeador.
- **Zona Horaria de Secuencias de Tickets (BARR-XXX):** La función RPC `get_next_order_sequence` usaba `CURRENT_DATE` (UTC), provocando que los pedidos hechos en Lima después de las 7:00 PM acumularan secuencias en la "cubeta" del día siguiente. Al cambiar la medianoche local, el número correlativo continuaba incrementándose desde 30+ en lugar de reiniciar a 1.
  - **Fix:** Función actualizada a usar `(CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::DATE`.
- **Carga de Dashboad rota y WebSockets ignorados por orden_type:** Al erradicar la doble escritura, la petición a BD fallaba silenciosamente por un join huérfano (`order_items (*, products (name))`) sin Foreign Key. Además, los WebSockets en tiempo real inyectaban la orden sin `order_type`, por lo que las pestañas del Dashboard las filtraban y hacían invisibles.
  - **Fix:** Eliminado join de `products` en `useDashboardStore.ts`. Inyectado `order_type` explícitamente en `normalizarOrder()`.
- **Notificaciones del Radar no clicables:** Las notificaciones push del Dashboard (`DashboardTopBar.tsx`) eran simples `<div>` de texto. Al hacer clic no marcaban como leídas ni redirigían.
  - **Fix:** Convertidas a componentes `<Link href="/dashboard/pedidos">` con un `onClick` que cierra el menú y marca la notificación local como `leida = true`.

### Deprecado / Removido
- **Tabla `delivery_orders` deprecada y erradicada:** Se eliminó por completo la estrategia de "doble escritura" implementada para compras por WhatsApp y flujos legacy. 
  - **Checkout:** `RestauranteCheckoutModal.tsx` ahora solo inserta en la tabla unificada relacional `orders` y `order_items`.
  - **Store:** Removidos los "fallbacks" y la búsqueda en jsonb en `useDashboardStore.ts` y las reduplicaciones innecesarias de `legacy_id`.
  - **WebSockets:** Se cerró permanentemente el segundo canal de Realtime `delivery_rx` en el `DashboardTopBar.tsx`, evitando las colisiones de recepción y race conditions del frontend.
  - **Analíticas:** Refactorizada `analytics/page.tsx` para consultar una única vez de la tabla `orders` y reducir consultas innecesarias a la BD.

### Restaurado
- **Auto-expiración 24h en Dashboard:** Se restauró la lógica eliminada accidentalmente que cancela pedidos `pendiente_pago` o `pendiente` (WhatsApp) con más de 24 horas en el panel del vendedor (`app/dashboard/pedidos/page.tsx`).

### Modificado
- `store/useCustomerStore.ts`: Interfaz `Order` ahora incluye `coreId?: string` para suscripción realtime por UUID.
- `components/tienda/templates/RestauranteCheckoutModal.tsx`: UUID compartido para Mercado Pago y WhatsApp. `coreId` se persiste en localStorage del comprador.
- `components/tienda/templates/OrderDetailModal.tsx`: Realtime apunta a `orders` con filtro por UUID. Polling a 2s.
- `components/tienda/templates/OrderHistoryPanel.tsx`: Sincronización por `coreId` (UUID) cuando disponible. Polling continuo a 2s mientras el panel está abierto.
- `app/dashboard/pedidos/page.tsx`: Restaurada lógica de auto-cancelación 24h. Modal de compartir detecta `legacy_delivery`.
- `app/api/pedidos/ticket/route.ts`: PDFKit usa coordenadas absolutas para columnas. Mapeador de legacy transfiere `store_id`.
- `components/dashboard/DashboardTopBar.tsx`: Handler de `UPDATE` transfiere `legacy_id` si existe.

---

## [2026-06-11] — Sesión 10
### Resolución de Bugs Críticos (Alta Severidad)
- **Checkout Estándar:** Corregido un fallo crítico de columnas fantasma. Se extirpó la inyección de `merchant_id` y `total_amount` en el payload de Supabase dentro de `app/tienda/[id]/checkout/page.tsx`, los cuales provocaban un error Postgres silencioso (PGRST204) impidiendo la generación de órdenes.
- **Identidad del Merchant:** Unificada toda la nomenclatura de estado en el frontend. Se reemplazó el uso obsoleto de `.eq('merchant_id', userId)` por `.eq('store_id', userId)` en `store/useDashboardStore.ts`, `app/dashboard/analytics/page.tsx`, y `app/api/pedidos/ticket/route.ts` para garantizar coherencia con el esquema verificado en producción y proteger el RLS.
- **Base de Datos (Delivery FK):** Modificada la migración legacy `migrations/delivery_orders.sql` para referenciar formalmente a `stores(id)` con `ON DELETE CASCADE`, corrigiendo el riesgo de borrado en cascada desde `profiles`.
- **Desacoplamiento y Migraciones Seguras:** Eliminado para siempre el script acoplado `scripts/doctor.ts` y `seguridad_supabase.sql`. Se ha inaugurado formalmente el **Supabase CLI** (`npx supabase init`) consolidando todos los schemas bajo el directorio estándar `supabase/migrations/*` con timestamps ordenados.
- Verificación: `npx tsc --noEmit` y `npm run build` finalizaron sin errores post-desacoplamiento.
- Commit: (Se adjuntará)

---

## [2026-06-11] — Sesión 9
### Unificación Visual (Modo Oscuro Dashboard Fase 2)
- Dashboard: Migradas las 5 páginas internas (`/pedidos`, `/productos`, `/analytics`, `/clientes`, `/configuracion`) al sistema `dark:` prefix de Tailwind.
### Modificado
- [Frontend] Se unificó la lógica del Checkout Estándar y Checkout Rápido para soportar la generación atómica de IDs secuenciales de manera distribuida.
- [Frontend] El Dashboard y el Historial de Clientes se alimentan ahora estrictamente de los IDs formateados en base a secuencias seguras.
- [Tickets] Se refactorizó el generador PDF (`PDFKit`) y la UI de vista previa (`React`) para eliminar todas las fintas visuales (datos falsos aleatorios), inyectando los Códigos de Despacho e IDs reales en la cabecera.

### Agregado
- [Backend] Se implementó el sistema de correlativos (Order IDs secuenciales) seguros usando la migración `20260000000003_store_order_sequences.sql` con funciones de incremento atómico y reinicio diario por tienda.
- [Tickets] Se instalaron e integraron las librerías `bwip-js` y `react-barcode` para renderizar Códigos de Barras (CODE128) reales y legibles, garantizando un ticket verdaderamente trazable tanto en Backend (Buffer PNG inyectado al PDF) como Frontend (Componente SVG).

### Corregido
- [Frontend] Bug de Race Condition en pagos Mercado Pago: Se implementó deduplicación de eventos en `useDashboardStore.ts` para que no se muestre la misma orden duplicada (una desde el Webhook y otra desde el Modal Callback).
- [Frontend] Timeline UI en blanco: Se agregó la compatibilidad del estado `paid` en la barra de progreso (Timeline) del Dashboard de pedidos, rellenando los checkboxes de éxito automáticamente en órdenes pagadas con tarjeta.

- Refactorización Masiva: Reemplazadas cientos de clases fijas o antiguas (`bg-surface-container`, `text-on-surface`, `bg-slate-900`, etc.) por sus equivalentes nativos de Tailwind (`bg-white dark:bg-zinc-900`, `text-zinc-900 dark:text-zinc-100`, etc.) asegurando que el modo oscuro aplique limpiamente en todo el ecosistema y unificándolo al estándar de diseño establecido en el layout (Stitch Design).
- Verificación: `npx tsc --noEmit` y `npm run build` finalizaron sin errores.
- Commit: (Se adjuntará)

---

## [2026-06-07] — Sesión 8
### Pulido Final Pixel-Perfect (Flat Design)
- `components/dashboard/DashboardTopBar.tsx`: Eliminada sombra excesiva (`shadow-[0_20px_40px_rgba(0,0,0,0.4)]`) del header superior. Reemplazada por un borde sutil (`border-zinc-800`), logrando el aspecto Flat Premium e integrado de Stitch. Ancho ajustado a `w-[calc(100%-14rem)]` (`w-56`).
- `components/DashboardSidebar.tsx`:
  - Ancho global del sidebar reducido de `w-64` a `w-56` para ajustar proporciones según el diseño.
  - Mejorado contraste de los textos de navegación reemplazando variables CSS por utilidades explícitas (`text-zinc-900` / `dark:text-white`) para soportar correctamente modo claro y oscuro simultáneamente.
  - Reducido margen superior del perfil de usuario (`mt-6 pt-6` → `mt-4 pt-4`) para cohesión jerárquica con el menú.
- `app/dashboard/layout.tsx`: Actualizado el margen izquierdo principal de `md:ml-64` a `md:ml-56`.
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: (Se adjuntará)

---

## [2026-06-07] — Sesión 7
### Corrección Visual (comparación con referencia Stitch)
- `components/DashboardSidebar.tsx`: Ajustes de precisión en el diseño del sidebar para alineación total con Stitch.
  - Padding vertical de los nav items reducido: `py-3` → `py-2.5` para hacer los items más compactos.
  - Alineación de íconos: cambiado `gap-3` del contenedor por `mr-3` directamente en los SVGs, mejorando el centrado del texto.
  - Perfil de usuario (Footer): Avatar actualizado de circular con borde degradado (`rounded-full bg-[var(--dash-accent)]/10`) a diseño minimalista y sobrio del tema oscuro de Stitch (`rounded bg-zinc-700 text-white`).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: (Se adjuntará en el push de docs)

---

## [2026-06-07] — Sesión 6
### Corrección de Animaciones
- `components/DashboardSidebar.tsx` + `app/dashboard-theme.css`: Restauradas las animaciones hover del nav lateral que faltaban del diseño Stitch.
  - Clase `nav-item` agregada a los `<Link>` inactivos del sidebar (nunca había sido aplicada — los items tampoco estaban definidos en el CSS del dashboard).
  - `transition-colors` y `hover:bg-[var(--dash-surface-2)]` de Tailwind eliminados de items inactivos para evitar conflicto con la animación CSS nativa.
  - Definida `.dashboard-theme .nav-item` en `dashboard-theme.css`: `transition: all 0.2s ease` + `padding-left: 1.25rem` on hover (slide effect de Stitch).
  - Dos variantes: dark (`rgba(255,255,255,0.05)`) y light (`rgba(0,0,0,0.03)`).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `605b648`

---

## [2026-06-07] — Sesión 5
### Corrección Visual (comparación con referencia Stitch)
- `components/DashboardSidebar.tsx`: Ajustados nav items para coincidir pixel-perfect con el diseño Stitch tras comparación visual directa.
  - `px-6` → `px-4` en todos los nav items — los íconos/texto se alinean más naturalmente al borde izquierdo.
  - Items inactivos: añadido `font-medium` — mejora legibilidad (antes era `font-regular`).
  - Item activo: `font-semibold` → `font-medium` — consistente con el resto del menú (Stitch usa `font-medium` en todos los estados).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `8f8e76e`

---

## [2026-06-07] — Sesión 4
### Mejora Visual
- `app/dashboard/page.tsx`: Espaciado de tabla de pedidos ajustado para coincidir exactamente con el diseño Stitch de referencia.
  - `<th>` headers: `py-5 px-6 md:px-8` → `py-4 px-6` (header más compacto, padding horizontal uniforme).
  - `<td>` celdas: eliminado `md:px-8` responsive — padding `px-6` uniforme en todas las columnas.
  - Row hover dark: `bg-zinc-800/50` → `bg-zinc-800/30` (separador más sutil, igual que Stitch).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `7f8d2fb`

---

## [2026-06-07] — Sesión 3
### Mejora Visual
- `components/DashboardSidebar.tsx`: Reemplazados todos los iconos de Material Symbols (fuente externa) por SVGs inline del diseño Stitch — elimina dependencia de red y asegura pixel-perfect con la referencia.
  - Eliminado import `X` de lucide-react; botón de cierre móvil ahora usa SVG inline.
  - `menuItems` migrado de `icon: string` (Material Icons ID) a `svgPaths: string[]` (array para soportar íconos de 1 o 2 paths — Ajustes tiene 2).
  - Footer: íconos de "Ver Tienda Pública" (casa) y "Cerrar Sesión" (logout) migrados a SVG inline.
  - Tipografía del logo corregida a spec Stitch: `tracking-tight` en "LINKVENTAS", `font-medium tracking-widest` en "Panel de Control".
  - `active-nav` CSS sin tocar — ya tenía los valores exactos (`#1c1c24 / border #6366f1` dark, `#f0f7ff / border #2F7EDA` light).
  - Eliminado `userId` state que nunca se usaba en el render.
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `e34edfb`

---

## [2026-06-07] — Sesión 2
### Corrección de errores
- Dashboard: Corregido bug de temas dark/light en tres componentes del dashboard — las clases de Stitch usaban colores fijos (`zinc-800`, `text-white`, etc.) que no respondían al toggle de tema.
  - `app/dashboard/page.tsx`: Reescrito completo con `dark:` prefix de Tailwind. Reemplazadas clases semánticas Material Design (`text-on-surface`, `card-bg` inline, etc.) por pares `text-zinc-900 dark:text-white`, `border-zinc-200 dark:border-zinc-800/50`, y equivalentes para fondo de tabla, hover de filas, botón Exportar, paginación y estado vacío.
  - `components/dashboard/DashboardTopBar.tsx`: Corregidos 3 problemas reales — (1) sombra oscura fija en modo claro (`shadow-[0_1px_3px...] dark:shadow-[0_20px_40px...]`), (2) border del header hardcoded (`border-zinc-200 dark:border-[var(--dash-border)]`), (3) buscador y dropdown de notificaciones sin fondo adaptativo (`bg-zinc-50 dark:bg-[var(--dash-surface-2)]`, `bg-white dark:bg-[var(--dash-surface-2)]`).
  - `components/dashboard/ThemeToggle.tsx`: Corregido `hover:bg-neutral-800` fijo oscuro → `hover:bg-zinc-100 dark:hover:bg-zinc-800`.
  - **No modificado:** `components/DashboardSidebar.tsx` — ya usaba exclusivamente variables CSS `var(--dash-*)` que responden correctamente al tema. Sin regresión.
- Pago/Mercado Pago: Eliminada la columna fantasma `total_amount` de las rutas de API de Mercado Pago (`webhooks/mercadopago` y `checkout/mercadopago`). Esto resuelve un HTTP 500 fatal donde el backend intentaba hacer un `.select('total_amount')` sobre la tabla `orders` (que solo tiene la columna `total`), causando que los pagos confirmados no lograran actualizar el estado de la orden a 'paid'.
- Checkout/Mercado Pago: Se extirpó por fin el `total_amount` residual del bloque de pre-registro de Mercado Pago en `RestauranteCheckoutModal.tsx`, curando el error silencioso que truncaba la ejecución. Asimismo, se unificó la identidad de la orden inyectando el BARR-XXX (`orderId`) directamente en la columna `legacy_id` al insertar en Supabase.
- Dashboard/Pedidos: Ajustado el renderizado en la tabla para mostrar el `legacy_id` (BARR-XXX) en lugar del UUID completo en el historial de Delivery. Adicionalmente se agregó `"pending"` a los diccionarios `DELIVERY_LABELS` y `DELIVERY_COLORS` para que el estado se traduzca como "Pendiente" y adquiera el color de badge amarillo correspondiente, en lugar del texto crudo sin estilo.
- Resiliencia (Checkout): Agregado un manejo seguro (grácil) en el registro de la sub-tabla `order_items` de Mercado Pago. En caso de fallo (ej. formato en modifiers o IDs no-UUID), el error es interceptado en consola sin interrumpir el bloque principal, asegurando que `Mercado Pago.open()` sí logre ejecutarse.
- Historial del Cliente: Modificado el callback de éxito de Mercado Pago (`RestauranteCheckoutModal.tsx`) para usar el `legacy_id` (BARR-XXX) en lugar del UUID cuando se guarda el pedido en el historial local de Zustand (`useCustomerStore.addOrder`). Esto asegura que el pedido sea visible inmediatamente en la pantalla de historial del usuario.
- Dashboard/Pedidos: Agregado el estado `paid` al diccionario de traducciones (`DELIVERY_LABELS` y `DELIVERY_COLORS`) con texto "Pagado" y color de fondo verde, corrigiendo el renderizado en inglés causado por el webhook de Mercado Pago.
- Verificación: `npx tsc --noEmit` sin errores en ambas sesiones de commit.

## [2026-06-08] — Sesión 3 (Fix definitivo Mercado Pago)
### Diagnóstico profundo
- Se realizó un análisis exhaustivo del flujo completo de Mercado Pago contrastando el código fuente contra el esquema real de Supabase.
- **Causa raíz identificada:** 3 bugs en `RestauranteCheckoutModal.tsx` (bloque Mercado Pago, líneas 284-304):
  1. **`total_amount: total`** (L285): Columna fantasma que no existe en la tabla `orders`. El INSERT a Supabase fallaba silenciosamente con error de columna inexistente, y como `handlePagar()` no tiene `try/catch`, el `throw coreOrderError` generaba una promesa rechazada sin manejador visible. Resultado: `win.Mercado Pago.open()` nunca se ejecutaba y el botón "no hacía nada".
  2. **`legacy_id: coreOrderId`** (L289): Asignaba el UUID como `legacy_id`, haciéndolo redundante. Corregido a `legacy_id: orderId` para que almacene el código corto BARR-XXXX generado en L239.
  3. **`{ orderId: coreOrderId }`** (L304): El objeto `pendingMercado PagoRestaurantOrder` no incluía el `legacyId`, impidiendo que el callback de éxito tuviera acceso al código BARR-XXXX para el historial del cliente.

### Cambios aplicados (Fase 1 — handlePagar)
- Eliminada línea `total_amount: total` del INSERT a `orders`.
- Cambiado `legacy_id: coreOrderId` → `legacy_id: orderId` (BARR-XXXX).
- Cambiado `{ orderId: coreOrderId }` → `{ orderId: coreOrderId, legacyId: orderId }`.

### Cambios aplicados (Fase 2 — callback Mercado Pago)
- `delivery_orders` insert: Cambiado `id: orderId` (que contenía el UUID) → `id: pendingOrder?.legacyId || orderId` para que la tabla legacy reciba el BARR-XXXX.
- `customerStore.addOrder`: Mismo cambio para que el historial local del cliente use BARR-XXXX.

### Cambios aplicados (Dashboard pedidos/page.tsx)
- Agregado `pending: 'Pendiente'` y `paid: 'Pagado'` a `DELIVERY_LABELS`.
- Agregado `pending` (amarillo) y `paid` (verde) a `DELIVERY_COLORS`.
- Cambiado `{order.id}` → `{(order.legacy_id || order.id).split('-')[0].toUpperCase()}` para mostrar BARR-XXXX en vez del UUID completo.
- Verificación: `npx tsc --noEmit` sin errores.

### Commits de esta sesión
- `ccf1053` — fix(mercadopago): use legacyId in callback delivery_orders and customer history, add pending/paid labels, show BARR-XXX in dashboard
- `6af1b5b` — fix(mercadopago): remove phantom total_amount, fix legacy_id to BARR-XXX, pass legacyId to pending order

### Commits de la sesión anterior
- `90d6f11` — fix(mercadopago): remove total_amount and use orderId as legacy_id in Mercado Pago order insert
- `77cafd8` — fix(mercadopago): use legacyId for customer history and add paid/pending status labels
- `bdeba34` — fix(mercadopago): handle order_items error gracefully and fix legacy_id display and pending status label
- `7184490` — fix(mercadopago): remove total_amount from Mercado Pago order insert in RestauranteCheckoutModal
- `4f92bc6` — fix(mercadopago): remove total_amount from API routes select and calculations
- `ff7b0e4` — chore: trigger deployment after hard reset
- `8f46738` — revert: restore original order flow before today's changes
- `fc800f2` — fix(dashboard): dark/light theme support in page.tsx via Tailwind dark: prefix
- `6a3de83` — fix(dashboard): dark/light theme support in TopBar and ThemeToggle via Tailwind dark: prefix

---

## [2026-06-07] — Sesión 1
### Funcionalidad
- Dashboard: Implementado sistema de temas (dark/light mode) aislado exclusivamente al dashboard, sin afectar las tiendas públicas `/tienda/*`.
  - Instalado `next-themes` y creado `ThemeProvider` envolviendo solo `app/dashboard/layout.tsx`.
  - Definidos tokens de color con prefijo `--dash-*` en `dashboard-theme.css` para modo oscuro (Stitch) y modo claro (LinkVentas oficial).
  - Creado componente `ThemeToggle` (sol/luna) e inyectado en `DashboardTopBar`.
  - Migradas todas las clases de color Material Design en `layout.tsx`, `DashboardTopBar.tsx` y `DashboardSidebar.tsx` a tokens `--dash-*` (reemplazos masivos: bg, text, border).
  - Implementado mapeo dinámico CSS en `dashboard-theme.css` para sobreescribir globalmente las clases de Material Design (`bg-surface-container-high`, `text-on-surface`, etc.) hacia las nuevas variables `--dash-*`, garantizando soporte de temas instantáneo en todas las subpáginas sin refactor masivo.
  - Actualizados tokens del modo claro para coincidir con el diseño "Light Mode Professional" de Stitch (tonos más limpios, menos saturados, acento en gradiente índigo/azul).
  - Integrado sistema de animaciones CSS nativas en `dashboard-theme.css` (animaciones en cascada `fadeInUp`, hovers magnéticos para tarjetas/botones y scrollbar personalizado), con soporte para `prefers-reduced-motion`.
  - Reubicado el botón de "Configurar Motor FOMO" (`FomoConfigModal`) desde el Dashboard principal hacia la página de Ajustes Tienda (`/dashboard/configuracion`) para preparar el rediseño minimalista de la vista principal.
  - Movido el gráfico complejo interactivo de ventas de "Últimos 7 Días" desde el Dashboard principal hacia la página de Analytics (`/dashboard/analytics`), optimizando la carga de la vista principal y concentrando la inteligencia comercial.
  - Rediseño visual completo de la página principal del Dashboard (`app/dashboard/page.tsx`) replicando la estética premium de Stitch, adoptando la estructura de Bento Grid (Tarjetas de métricas animadas con minigráficos interactivos y tabla de pedidos con diseño refinado), manteniendo intacta toda la lógica de obtención de datos a través de Zustand y Supabase.
  - **Corrección Visual:** Asignado el token `bg-[var(--dash-bg)]` de forma explícita a la etiqueta `<main>` en `layout.tsx` para garantizar que el repintado del fondo ocurra correctamente al alternar entre modo oscuro y modo claro.
## [2026-06-05]
### Corrección de errores
- Panel Admin: Añadido feedback visual (toast de error) en la interfaz para alertar cuando el endpoint `/api/admin/plans` falla, reemplazando la captura de error silenciosa.
- Seguridad: Eliminado el prefijo `NEXT_PUBLIC_` de `ADMIN_USER_ID` en las variables de entorno y movida la validación de admin estrictamente al servidor mediante un nuevo endpoint (`/api/admin/check`) para prevenir la exposición del UUID en el código fuente del cliente.

### Funcionalidad
- Moda/Boutique: Checkout adaptado con renderizado visual de talla/color en el resumen de pedido, validación estricta de variantes requeridas antes de procesar pago, y formato explícito en captura de carritos abandonados.
- Moda/Boutique: Persistidas las variantes `talla`/`color` seleccionadas por el cliente en `order_items.modifiers`, resincronizado `product_variants` al editar productos y mostrado talla/color en el detalle de pedido.
- Moda/Boutique: Mostradas las variantes `talla`/`color` guardadas en `modifiers` dentro del ticket térmico/PDF y la lista de pedidos del dashboard.
- Moda/Boutique: Validación obligatoria de variantes antes de agregar al carrito; el quick add abre la vista rápida cuando el producto tiene talla/color.

### Documentación
- Creada base de conocimiento v3 completa (8 archivos)
- DATABASE_SCHEMA.md: tipos numeric verificados, 3 buckets confirmados,
  9 tablas no detectadas agregadas, índices de rendimiento documentados
- ARCHITECTURE.md: módulo Delivery híbrido, relación stores vs profiles
- PROJECT_STATE.md: módulo Delivery catalogado como parcialmente implementado
- AI_ONBOARDING.md: diagrama actualizado con Core Nuevo y Módulos Legacy,
  fix regla 5 (checklist es obligación del agente)
- DECISIONS.md: migración profiles vs stores documentada como decisión en curso
- AGENT_RULES.md: agregada regla estricta de actualización automática del CHANGELOG como requisito de cierre
- DECISIONS.md: discrepancia de nomenclatura link-ventas vs link-ventas-app investigada y documentada
- ARCHITECTURE.md y DECISIONS.md: actualizado el proyecto oficial en Vercel (link-ventas-app.vercel.app) y documentada la eliminación del proyecto duplicado "enlace-ventas".
- Investigación de código: Análisis profundo de dependencias, relaciones on-the-fly y nomenclatura inconsistente (store_id, merchant_id, user_id).
- DECISIONS.md, PROJECT_STATE.md, DATABASE_SCHEMA.md: Documentado el patrón de migración on-the-fly, listado como deuda técnica activa y clasificado como bug de Severidad Alta la mezcla de nombres de identidad.
- ARCHITECTURE.md y DECISIONS.md: Integrado el modelo canónico Multi-Plantilla ('food', 'comercio', 'moda') y confirmada la relación oficial de 1 a 1 en identidades (auth.users → profiles → stores). Inconsistencia de IDs separada en Deuda Técnica explícita por confirmación directa del usuario.
- migration_analysis.md: Creado análisis completo de migración profiles→stores con script SQL revisado, mapeo de columnas y 4 riesgos identificados (pendiente aprobación del usuario para ejecución).
- DECISIONS.md: Documentado el script existente migrate_profiles_to_stores.ts, su problema crítico con ANON_KEY y los riesgos ROJO/MEDIO de FK y template_type.
- PROJECT_STATE.md: Agregados 2 bugs nuevos (Severidad Alta: FK delivery_orders incorrecta; Severidad Media: template_type inconsistente entre BD y código).
- PROJECT_STATE.md: Corregida clasificación del Módulo Restaurante/Food — movido de "Parcialmente Implementado" a "Completado" con evidencia detallada de código (checkout, doble escritura, Realtime, timeline 6 estados, tracking con Leaflet, tickets térmicos). La clasificación anterior era un error del agente basado en inferencias, no en lectura del código real.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Versión actual semántica del proyecto (usaré `[Unreleased]` hasta confirmación).
- DESCONOCIDO: Historial anterior de cambios en ramas antiguas, ya que se inició documentando el estado actual desde cero.
