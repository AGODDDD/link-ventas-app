# Arquitectura vigente

LinkVentas es un SaaS multi-tenant con Next.js, Supabase y Mercado Pago.

- Una cuenta posee exactamente una tienda (`stores.owner_id` es único).
- El catálogo pertenece a la tienda mediante `products.user_id = stores.id`.
- `orders`, `order_items` y `order_inventory_reservations` son el único modelo de pedidos.
- Los estados operativos se cambian exclusivamente mediante `transition_order_status`.
- Mercado Pago se confirma por webhook servidor-a-servidor; la respuesta del checkout solo acepta el intento.
- El stock se reserva al crear el pedido y se descuenta al confirmar el pago o iniciar la preparación; las reservas vencidas se liberan por cron.
- El navegador no escribe directamente leads, reseñas ni comprobantes: usa API Routes con validación, límites por IP y `service_role` solo en servidor.
- El webhook de Mercado Pago falla cerrado y exige `MP_WEBHOOK_SECRET`.
- RLS resuelve toda propiedad mediante `stores.owner_id`; `profiles` nunca es de lectura pública.

## Verificación manual

- Configurar en Mercado Pago el webhook `/api/webhooks/mercadopago?store_id=<uuid>` para cada tienda y `/api/webhooks/mercadopago?scope=platform` para la suscripción Pro.
- Copiar en Vercel el secreto de firma proporcionado por Mercado Pago como `MP_WEBHOOK_SECRET`.
