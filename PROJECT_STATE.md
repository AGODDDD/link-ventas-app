# Fuente única de verdad sobre el estado actual

## Resumen Ejecutivo
LinkVentas es una plataforma SaaS eCommerce plenamente funcional (tienda, carrito, webhook de pagos, dashboard, tickets térmicos), pero posee deuda técnica importante en migraciones de base de datos y flujos incompletos en la facturación interna del producto (SaaS Billing).

## Funcionalidades Completadas
- Motor FOMO (Stock Social) para urgencia de ventas.
- Generación de tickets térmicos (impresión optimizada con `html2canvas`).
- Slugs dinámicos (`/tienda/[id]`) renderizados del lado del servidor.
- Webhook de Culqi para verificación de pagos automatizados.
- RLS de Supabase implementado y funcional.
- Persistencia del carrito offline/local vía Zustand.
- Soporte de `product_variants` (variaciones de producto) completado en el proceso de creación.
- **Dashboard Redesign & Theming (Fase 1 Completada):**
  - Sistema dark/light implementado con `next-themes` ✓
  - `app/dashboard/page.tsx` migrado con `dark:` prefix ✓
  - `DashboardTopBar.tsx` migrado ✓
  - `DashboardSidebar.tsx` migrado ✓
  - Modo oscuro pixel-perfect con el diseño base de Stitch ✓
  - Modo claro funcional adaptado con la paleta de la marca LinkVentas ✓
  - Páginas internas del dashboard (`/pedidos`, `/productos`, `/analytics`, `/clientes`, `/configuracion`) migradas al sistema `dark:` prefix para unificar visualmente toda la experiencia ✓
- **Módulo Restaurante/Food (Delivery):** Flujo completo de pedidos funcionando en producción. Evidencia encontrada en el código:
  - **Checkout completo** (`RestauranteCheckoutModal.tsx`): Formulario de dirección, selección de método de pago (WhatsApp + Culqi), resumen de orden, validación de horario de tienda, y envío de pedido a Supabase.
  - **Estrategia de doble escritura** (`legacy_delivery` en `delivery_orders` + `core` en `orders`): Garantiza compatibilidad hacia atrás y adopción del nuevo esquema simultáneamente.
  - **Dashboard en tiempo real** (`DashboardTopBar.tsx`): WebSockets vía Supabase Realtime para notificaciones push + sonoras en INSERT/UPDATE de pedidos. Canal `delivery_orders` activo en producción.
  - **Timeline de 6 estados** (`pedidos/page.tsx`): `pendiente_pago → pendiente → en_preparacion → alistando → en_camino → completado`. El merchant avanza el estado un paso a la vez desde el dashboard.
  - **Tracking del cliente** (`OrderDetailModal.tsx`): Modal de seguimiento con mapa Leaflet, ruta animada en tiempo real con Realtime + polling cada 8s, con integración opcional a OpenRouteService para rutas reales.
  - **Tickets e impresión** (`ThermalReceipt`): Impresión térmica de 80mm, descarga PNG/PDF, compartir por WhatsApp o email.

## Funcionalidades Parcialmente Implementadas
- **Onboarding de Pagos Culqi:** Se puede configurar y el webhook lo soporta, pero el checkout marca pagos como "pending" con comentarios que indican flujos apresurados. (80% completado).
- **Facturación SaaS (LinkVentas a Merchants):** La vista `app/pendiente/page.tsx` bloquea el acceso si no hay pago, pero el proceso requiere enviar un WhatsApp y comprobación manual. No hay Stripe o facturación recurrente real. (40% completado).

## Funcionalidades Pendientes
- Interfaz nativa de Checkout automatizado de la propia plataforma SaaS (LinkVentas Pro Plan).
- Recuperación automatizada de Carritos Abandonados (actualmente solo captura leads).

## Bugs Resueltos Recientemente
- **Checkout roto por columnas fantasma (Alta Severidad):** Se eliminó el uso de `merchant_id` y `total_amount` en el checkout estándar (`app/tienda/[id]/checkout/page.tsx`), lo cual causaba errores silenciosos y rompía el flujo de pago.
- **Identidad del Merchant (Alta Severidad):** Se unificó la nomenclatura en el frontend para referirse consistentemente a `store_id` al hacer consultas a la tabla `orders` (eliminando `merchant_id` de stores, rutas y analíticas).
- **FK de delivery_orders (Alta Severidad):** Se corrigió la migración local `migrations/delivery_orders.sql` para apuntar a `stores(id)` en vez de `profiles(id)`.
- **Correlativos Seguros de Pedidos:** Se trasladó la lógica de IDs (ej. BARR-110626-4132) desde una generación aleatoria cliente a una Transacción Atómica en Supabase (`store_sequences`) garantizando números secuenciales e inmutables que se reinician cada día, y se unificó la inyección del `legacy_id` tanto en Checkout de Moda como de Restaurantes.
- **Race Condition y Timeline (Bugfix):** Se resolvió un bug crítico donde el evento del Webhook de Culqi y el evento local chocaban insertando dos órdenes idénticas en el panel. Se aplicó deduplicación por `legacy_id` en el Store de Zustand y se reparó el renderizado de progreso para estados `paid`.
- **Desacoplamiento de doctor.ts (Alta Severidad):** Se eliminó el script manual `doctor.ts` y `seguridad_supabase.sql`. Se configuró el Supabase CLI y se consolidó el esquema en la carpeta estandarizada `supabase/migrations/*`.
- **Refactor de Estados de Pago:** Se eliminó el hardcodeo de `status: 'pending'`. Ahora los pagos manuales por transferencia nacen en estado `pendiente_verificacion` y los pagos por Culqi nacen en `pendiente_pago` respetando la Idempotencia Zero-Trust de Webhooks. Se actualizó el Dashboard para soportarlo con etiquetas y colores amigables.
- **Moda/Boutique checkout adaptado:** Completado. Se adaptó el checkout genérico (`app/tienda/[id]/checkout/page.tsx`) para Moda, mostrando talla/color en el resumen del pedido, añadiendo validación estricta de selección de variante previa al pago y asegurando la inclusión explícita en los leads de carritos abandonados.
- **Moda/Boutique variantes talla/color:** Resuelto. El checkout general ahora persiste `talla` y `color` dentro de `order_items.modifiers` usando la columna JSONB existente; la edición de productos Moda resincroniza `product_variants`; y el detalle de pedido muestra talla/color cuando existen en `modifiers`.

## Bugs Potenciales Detectados
- **Severidad Media:** El Webhook de Culqi depende de desencriptación manual. Errores de llave rechazarían todos los pagos entrantes (500 Server Error).
- **Severidad Baja:** Posibles desajustes de hidratación en React debido a la carga inicial de Zustand desde `localStorage`.

## Deuda Técnica Detectada
- **Manejo de Base de Datos (Impacto: ALTO):** El uso de sentencias sueltas `ALTER TABLE IF EXISTS` sin un ORM (como Prisma/Drizzle) limita la trazabilidad y la seguridad en despliegues.
- **Estilos CSS Inline (Impacto: MEDIO):** Componentes grandes (ej: `app/pendiente/page.tsx`, `app/page.tsx`) combinan Tailwind con objetos `style={{...}}` masivos.

## Prioridades Sugeridas
1. **Automatización del SaaS Billing:** Implementar pasarela real para cobrar el "Plan Pro" sin intervención manual humana (WhatsApp).

---
## Campos que requieren verificación manual
- DESCONOCIDO: Estado real de despliegue en Vercel (si se ejecuta el doctor script automáticamente en pre-build).
- DESCONOCIDO: Bugs reportados por usuarios finales en el módulo de impresoras térmicas.
