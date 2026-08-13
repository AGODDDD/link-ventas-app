# Arquitectura vigente

LinkVentas es un SaaS multi-tenant con Next.js, Supabase y Mercado Pago.

El estado operacional de la salida a público, incluida la validación pendiente
de suscripciones Pro en sandbox, está en
[ESTADO_OPERATIVO_2026-08-08.md](./ESTADO_OPERATIVO_2026-08-08.md). La
arquitectura no permite activar cobros ni planes desde el retorno del navegador:
todo pago confirmado depende de un webhook firmado.
El intento sandbox del 2026-08-13 llegó al checkout de autorización, pero no al
webhook: Mercado Pago lo rechazó antes del cobro por una incompatibilidad de
entorno. La evidencia y el procedimiento de reanudación están en
[VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md](./VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md).

- Una cuenta posee exactamente una tienda (`stores.owner_id` es único).
- El catálogo pertenece a la tienda mediante `products.user_id = stores.id`.
- `orders`, `order_items` y `order_inventory_reservations` son el único modelo de pedidos.
- Los estados operativos se cambian exclusivamente mediante `transition_order_status`.
- Mercado Pago se confirma por webhook servidor-a-servidor; la respuesta del checkout solo acepta el intento. El Plan Pro usa `preapproval` mensual y cada factura aprobada se concilia de forma idempotente.
- El stock se reserva al crear el pedido y se descuenta al confirmar el pago o iniciar la preparación; las reservas vencidas se liberan por cron.
- El navegador no escribe directamente leads, reseñas ni comprobantes: usa API Routes con validación, límites por IP y `service_role` solo en servidor.
- El webhook de Mercado Pago falla cerrado y exige `MP_WEBHOOK_SECRET`.
- RLS resuelve toda propiedad mediante `stores.owner_id`; `profiles` nunca es de lectura pública.

## Ayuda contextual del dashboard

El layout autenticado monta una sola instancia de
`components/dashboard/ProductTour.tsx`. El componente selecciona un recorrido
según la ruta, resalta objetivos semánticos `data-tour` y guarda por usuario y
sección si la visita fue completada u omitida. En Configuración, un evento de
cliente validado permite mostrar cada pestaña durante la explicación sin
persistir cambios del formulario.

La cobertura, contrato de interacción y criterios de verificación se mantienen
en [GUIA_INCORPORACION_PRODUCTO.md](./GUIA_INCORPORACION_PRODUCTO.md).

## Verificación manual

- Configurar en Mercado Pago el webhook `/api/webhooks/mercadopago?store_id=<uuid>` para cada tienda y `/api/webhooks/mercadopago?scope=platform` para la suscripción Pro. En este último habilitar `subscription_preapproval` y `subscription_authorized_payment`.
- Copiar en Vercel el secreto de firma proporcionado por Mercado Pago como `MP_WEBHOOK_SECRET`.
