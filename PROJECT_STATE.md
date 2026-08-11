# Fuente única de verdad sobre el estado actual

Última actualización: **2026-08-10**.

## Veredicto

El núcleo de LinkVentas está implementado y tiene evidencia histórica de
calidad, pero **no debe declararse listo al 100 % para lanzamiento público
integral** hasta cerrar la prueba sandbox de suscripciones Pro con webhook
firmado. El detalle verificable vive en
[ESTADO_OPERATIVO_2026-08-08.md](./ESTADO_OPERATIVO_2026-08-08.md).

## Funcionalidades implementadas

- SaaS multi-tenant: una tienda por cuenta, propiedad basada en
  `stores.owner_id` y RLS para los datos de comerciantes.
- Storefront, carrito, pedidos, variantes, reservas de inventario y dashboard.
- Cálculo transaccional de precios y stock en servidor; el navegador no puede
  confirmar pagos ni modificar estados de pedido libremente.
- Pago de tiendas conciliado por webhook firmado y contrato de inventario
  canónico.
- Suscripción mensual Pro de S/ 25 mediante Mercado Pago `preapproval`, con
  conciliación idempotente de suscripción y cargos desde webhook de plataforma.
- Operaciones sensibles detrás de API Routes validadas, límites de intentos y
  secretos exclusivos de servidor.
- Incorporación contextual versionada por usuario y sección: 38 pasos para
  Dashboard, Pedidos, Clientes, Productos, Analytics, Configuración y formularios
  de producto. Configuración recorre automáticamente sus siete pestañas sin
  guardar ni alterar valores.

## Estado de Mercado Pago

- **Pedidos de tiendas:** prueba controlada previa completó pedido → webhook
  firmado → confirmación → inventario. La configuración sigue siendo
  responsabilidad de cada comercio.
- **Plan Pro Production:** crea el checkout; falta una compra controlada con
  comprador real diferente del vendedor y e-mail coincidente con `payer_email`.
- **Plan Pro Preview/sandbox:** crea `preapproval` e `init_point` con aplicación
  y comprador de prueba. Falta autorización y webhook porque Mercado Pago no
  habilita Confirmar mientras no coincida el e-mail del comprador de prueba.
  Ticket abierto: `WCS-45319`.

## Pendientes de salida

1. Resolver el requisito de e-mail de comprador de prueba con Mercado Pago y
   ejecutar la autorización sandbox completa.
2. Validar firma, eventos, cargo de S/ 25 en PEN, activación idempotente y
   cancelación/limpieza de esa prueba.
3. Ejecutar compra Production controlada con cuentas separadas, si el negocio
   decide habilitar el cobro público inmediato.
4. Repetir lint, pruebas unitarias, build, Vercel y Supabase antes del release
   que cierre los puntos anteriores.
5. Decidir explícitamente la configuración de protección contra contraseñas
   filtradas de Supabase Auth y conservar la decisión documentada.

## Deuda y límites conocidos

- No modificar ni eliminar `delivery_orders` o tablas legacy sin migración y
  política de retención aprobadas.
- Si hay divergencia entre migraciones locales y remotas, comparar esquema y
  datos antes de usar `migration repair` o `db push`.
- Persisten riesgos normales de hidratación de estado cliente por `localStorage`;
  deben revisarse con pruebas visuales al modificar el dashboard o checkout.
- El progreso de la guía vive en `localStorage`; no se sincroniza entre
  navegadores o dispositivos y no debe interpretarse como telemetría de adopción.
