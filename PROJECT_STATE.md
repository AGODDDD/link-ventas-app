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
- Migración automatizada de Base de Datos.
- Interfaz nativa de Checkout automatizado de la propia plataforma SaaS (LinkVentas Pro Plan).
- Recuperación automatizada de Carritos Abandonados (actualmente solo captura leads).

## Bugs Resueltos Recientemente
- **Moda/Boutique variantes talla/color:** Resuelto. El checkout general ahora persiste `talla` y `color` dentro de `order_items.modifiers` usando la columna JSONB existente; la edición de productos Moda resincroniza `product_variants`; y el detalle de pedido muestra talla/color cuando existen en `modifiers`.

## Bugs Potenciales Detectados
- **Severidad Alta:** Inconsistencia estructural en la nomenclatura de identidad del merchant. El código mezcla `user_id`, `store_id` y `merchant_id` para referirse al mismo UUID de cuenta, y crea registros "on-the-fly" en lugar de durante el registro, lo cual puede producir queries huérfanas o errores de RLS.
- **Severidad Alta:** FK incorrecta en `delivery_orders.store_id` — apunta a `profiles(id)` con `ON DELETE CASCADE` en lugar de `stores(id)`. Si se depreca `profiles`, se eliminarían en cascada todos los registros históricos de delivery. (Verificado en `migrations/delivery_orders.sql` línea 8).
- **Severidad Alta:** El acoplamiento de la base de datos a `scripts/doctor.ts` puede causar fallos de runtime si se hace deploy de frontend sin antes ejecutar el script de BD.
- **Severidad Media:** `template_type` inconsistente entre la BD y el código. La migración `002_core_schema.sql` define el CHECK como `('restaurante', 'comercio', 'moda')` pero el código y el modelo de negocio confirmado usan `'food'` en lugar de `'restaurante'`. Inserciones con `'food'` fallarán si ese CHECK está activo.
- **Severidad Media:** El Webhook de Culqi depende de desencriptación manual. Errores de llave rechazarían todos los pagos entrantes (500 Server Error).
- **Severidad Baja:** Posibles desajustes de hidratación en React debido a la carga inicial de Zustand desde `localStorage`.

## Deuda Técnica Detectada
- **Manejo de Base de Datos (Impacto: ALTO):** El uso de sentencias sueltas `ALTER TABLE IF EXISTS` sin un ORM (como Prisma/Drizzle) limita la trazabilidad y la seguridad en despliegues.
- **Estilos CSS Inline (Impacto: MEDIO):** Componentes grandes (ej: `app/pendiente/page.tsx`, `app/page.tsx`) combinan Tailwind con objetos `style={{...}}` masivos.
- **Manejo de Estado de Transacciones (Impacto: ALTO):** Hardcodeos en el flujo de caja del lado del cliente (`status: 'pending' // TODO ESTO NACE COMO PENDING`).

## Prioridades Sugeridas
1. **Refactor del Checkout:** Limpiar los TODOs y asegurar que los estados de pago se manejan con firmeza de origen a fin.
2. **Implementar ORM / Migraciones:** Reemplazar `seguridad_supabase.sql` por un sistema seguro (Supabase Migrations CLI o Prisma).
3. **Automatización del SaaS Billing:** Implementar pasarela real para cobrar el "Plan Pro" sin intervención manual humana (WhatsApp).

---
## Campos que requieren verificación manual
- DESCONOCIDO: Estado real de despliegue en Vercel (si se ejecuta el doctor script automáticamente en pre-build).
- DESCONOCIDO: Bugs reportados por usuarios finales en el módulo de impresoras térmicas.
