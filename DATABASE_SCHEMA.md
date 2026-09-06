# Esquema vigente

Este documento describe el contrato lógico. Antes de cualquier cambio remoto,
contrastar las migraciones con el esquema enlazado; no asumir que una lista de
migraciones divergente autoriza un `db push`.

`stores` identifica la única tienda de cada cuenta. `store_config` contiene configuración pública y Mercado Pago; `profiles` contiene plan y token cifrado.

`products` pertenece a `stores.id`. Las combinaciones de Moda viven en `product_variants` con `talla`, `color`, `combination_key` y stock propio.

`orders` usa exclusivamente `store_id`, `direccion`, `subtotal`, `delivery_fee`, `total`, `status` y `payment_status`. Las líneas son `order_items`; las reservas son `order_inventory_reservations`.

No existen columnas alternativas de pedidos. Las migraciones de `supabase/migrations` son la fuente de verdad.

## Seguridad aplicada el 2026-09-06

`20260906111114_security_audit_remediation.sql` agrega `orders.reservation_expires_at`,
colores hexadecimales restringidos, validación de opciones de checkout, cuotas de
Storage y tablas privadas `payment_proof_uploads`/`webhook_deliveries` con RLS y
acceso reservado a servidor. Las reservas repetidas se agregan por producto/variante.
Tablas nuevas, RLS y permisos de RPC verificados en remoto; límites y publicación en
[SECURITY_REMEDIATION.md](./SECURITY_REMEDIATION.md).

`delivery_orders` puede mantenerse temporalmente como archivo histórico, sin permisos para `anon` ni `authenticated`. Ningún flujo activo consulta o escribe esa tabla.

Las reseñas guardan `order_id` y solo se crean desde la API después de verificar pedido completado, teléfono, correo y producto comprado. Los campos privados de verificación no tienen privilegio de lectura pública.

## Privacidad de cuentas

`account_deletion_requests` registra solicitudes de eliminación con plazo de siete días. No se expone por la Data API: la solicitud y la revisión usan rutas de servidor autenticadas. Al aprobarse, se cancela cualquier suscripción recurrente activa, se anonimizan los datos personales de pedidos y se desactiva la tienda; los registros operativos se conservan sin datos personales.
