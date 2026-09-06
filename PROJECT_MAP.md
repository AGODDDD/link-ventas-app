# Mapa del proyecto

Estado operativo y pruebas de pagos: [ESTADO_OPERATIVO_2026-08-08.md](./ESTADO_OPERATIVO_2026-08-08.md).
Registro de la última validación sandbox de Suscripciones Pro y escalamiento:
[VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md](./VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md).
Evidencia del despliegue y revisión de la identidad visual:
[VERIFICACION_BRANDING_2026-08-13.md](./VERIFICACION_BRANDING_2026-08-13.md).
Registro de recuperación funcional y validación de la plantilla Restaurante:
[VERIFICACION_PLANTILLA_RESTAURANTE_2026-09-04.md](./VERIFICACION_PLANTILLA_RESTAURANTE_2026-09-04.md).
El kit externo descargable y sus reglas de aplicación están en
[BRAND_KIT.md](./BRAND_KIT.md).

- `app/api/orders`: crea pedidos y reservas.
- `SECURITY_REMEDIATION.md`: correcciones de seguridad, límites y requisitos de publicación.
- `supabase/migrations/20260906111114_security_audit_remediation.sql`: vencimientos, validación de opciones, cuotas, comprobantes y deduplicación de webhook.
- `tests/securityDatabase.test.ts`: ejecución SQL real de migraciones y pruebas de aislamiento con datos ficticios.
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
- `components/brand/LinkVentasLogo.tsx`: símbolo vectorial y lockup reutilizable
  de la marca; sus exportaciones estáticas están en `public/brand/`.
- `components/tienda/templates/RestauranteTemplate.tsx`: experiencia editorial
  adaptable de restaurante con catálogo, carrito, checkout, historial y
  controles accesibles; verificación de regresiones en
  `tests/restauranteTemplateContract.test.ts`.
- `app/manifest.ts` y `app/opengraph-image.tsx`: metadatos de instalación y
  previsualización social de LinkVentas.
- `app/dashboard/configuracion/page.tsx`: siete áreas de configuración y receptor
  validado del evento `linkventas:tour-setting-tab` usado durante el recorrido.

Especificación completa: [GUIA_INCORPORACION_PRODUCTO.md](./GUIA_INCORPORACION_PRODUCTO.md).
