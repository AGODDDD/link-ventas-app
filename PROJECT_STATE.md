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

## Funcionalidades Parcialmente Implementadas
- **Onboarding de Pagos Culqi:** Se puede configurar y el webhook lo soporta, pero el checkout marca pagos como "pending" con comentarios que indican flujos apresurados. (80% completado).
- **Facturación SaaS (LinkVentas a Merchants):** La vista `app/pendiente/page.tsx` bloquea el acceso si no hay pago, pero el proceso requiere enviar un WhatsApp y comprobación manual. No hay Stripe o facturación recurrente real. (40% completado).
- **Módulo de Delivery & Identidad (stores):** Las tablas `delivery_orders` operan actualmente en un modo híbrido "legacy", conviviendo con la nueva tabla core `orders`. Similarmente, `stores` está reemplazando paulatinamente a `profiles` a través de migraciones dinámicas (on-the-fly).

## Funcionalidades Pendientes
- Migración automatizada de Base de Datos.
- Interfaz nativa de Checkout automatizado de la propia plataforma SaaS (LinkVentas Pro Plan).
- Recuperación automatizada de Carritos Abandonados (actualmente solo captura leads).

## Bugs Potenciales Detectados
- **Severidad Alta:** Inconsistencia estructural en la nomenclatura de identidad del merchant. El código mezcla `user_id`, `store_id` y `merchant_id` para referirse al mismo UUID de cuenta, y crea registros "on-the-fly" en lugar de durante el registro, lo cual puede producir queries huérfanas o errores de RLS.
- **Severidad Alta:** El acoplamiento de la base de datos a `scripts/doctor.ts` puede causar fallos de runtime si se hace deploy de frontend sin antes ejecutar el script de BD.
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
