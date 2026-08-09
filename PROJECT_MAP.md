# Mapa del proyecto

Estado operativo y pruebas de pagos: [ESTADO_OPERATIVO_2026-08-08.md](./ESTADO_OPERATIVO_2026-08-08.md).

- `app/api/orders`: crea pedidos y reservas.
- `app/api/checkout/mercadopago`: inicia cobros de tiendas.
- `app/api/webhooks/mercadopago`: concilia cobros y activa inventario/planes.
- `app/api/billing/mercadopago`: inicia el cobro del plan Pro.
- `app/api/webhooks/mercadopago?scope=platform`: concilia suscripciones Pro y cargos autorizados tras validar la firma.
- `supabase/migrations/20260730000000_contract_cleanup.sql`: contrato de datos, reservas, estados y facturación.
- `store/useDashboardStore.ts`: lecturas del dashboard bajo el modelo de una tienda por cuenta.
