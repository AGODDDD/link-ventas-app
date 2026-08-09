# Documentación técnica

## Contrato de negocio y datos

El storefront carga únicamente tiendas activas. El carrito puede vivir en el
cliente, pero el servidor recalcula precio, stock, delivery y reservas al crear
el pedido mediante `/api/orders`. La propiedad del comercio se resuelve desde
`stores.owner_id`; `products.user_id` referencia a `stores.id` por
compatibilidad.

`orders`, `order_items` y `order_inventory_reservations` son el modelo activo.
Los cambios operativos de pedido pasan por `transition_order_status`, por lo
que el dashboard no puede modificar estados arbitrariamente.

## Pagos

Hay dos integraciones separadas:

- **Pago de una tienda:** la tarjeta se tokeniza en cliente, el servidor inicia
  el cobro y el webhook firmado es la única fuente que puede confirmar el pago
  y comprometer o liberar inventario.
- **Plan Pro de LinkVentas:** `/api/billing/mercadopago` crea un `preapproval`
  mensual de S/ 25 en PEN. El webhook de plataforma, bajo
  `/api/webhooks/mercadopago?scope=platform`, valida la firma antes de
  conciliar la suscripción o cada cargo autorizado. La respuesta del checkout
  no activa el plan por sí sola.

Las credenciales de Plataforma se mantienen únicamente en servidor y separadas
por entorno. Cada comercio conserva sus propias credenciales de cobro cifradas
en servidor. La evidencia de pruebas y el bloqueo actual de sandbox están en
[ESTADO_OPERATIVO_2026-08-08.md](./ESTADO_OPERATIVO_2026-08-08.md).

## Operación segura

- No registrar tokens, firmas, tarjetas, códigos de verificación ni secretos en
  código, documentación o tickets.
- Comprobar el historial de migraciones antes de ejecutar cambios remotos; una
  reparación de historial no sustituye una comparación de esquema.
- Conservar `delivery_orders` y demás tablas legacy hasta decidir una migración
  y una política de retención.
