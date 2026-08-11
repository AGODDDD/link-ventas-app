# Mapa del proyecto

Estado operativo y pruebas de pagos: [ESTADO_OPERATIVO_2026-08-08.md](./ESTADO_OPERATIVO_2026-08-08.md).

- `app/api/orders`: crea pedidos y reservas.
- `app/api/checkout/mercadopago`: inicia cobros de tiendas.
- `app/api/webhooks/mercadopago`: concilia cobros y activa inventario/planes.
- `app/api/billing/mercadopago`: inicia el cobro del plan Pro.
- `app/api/webhooks/mercadopago?scope=platform`: concilia suscripciones Pro y cargos autorizados tras validar la firma.
- `supabase/migrations/20260730000000_contract_cleanup.sql`: contrato de datos, reservas, estados y facturación.
- `store/useDashboardStore.ts`: lecturas del dashboard bajo el modelo de una tienda por cuenta.
- `components/dashboard/ProductTour.tsx`: recorridos contextuales por ruta,
  spotlight, controles accesibles y persistencia versionada en `localStorage`.
- `components/dashboard/DashboardTopBar.tsx`: acceso **Guía** para repetir el
  recorrido del apartado actual en escritorio.
- `components/DashboardSidebar.tsx`: acceso de respaldo a la guía, incluida la
  navegación móvil.
- `app/dashboard/configuracion/page.tsx`: siete áreas de configuración y receptor
  validado del evento `linkventas:tour-setting-tab` usado durante el recorrido.

Especificación completa: [GUIA_INCORPORACION_PRODUCTO.md](./GUIA_INCORPORACION_PRODUCTO.md).
