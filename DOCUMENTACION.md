# Documentación técnica

## Sistema de marca

La identidad visual y verbal de LinkVentas se mantiene en
[BRAND_SYSTEM.md](./BRAND_SYSTEM.md). Define el nombre canónico, tokens,
tipografía, uso semántico del color y las reglas de evidencia para copy
comercial. El sistema ya incluye el símbolo vectorial de eslabones ascendentes,
sus versiones clara/oscura y el lockup estático en `public/brand/`; los
componentes reutilizables viven en `components/brand/LinkVentasLogo.tsx`.
La evidencia posterior al despliegue, límites de la revisión y el checklist
manual se conservan en
[VERIFICACION_BRANDING_2026-08-13.md](./VERIFICACION_BRANDING_2026-08-13.md).
Las exportaciones listas para perfiles sociales, favicon y publicaciones, con
sus dimensiones y límites de uso, están en [BRAND_KIT.md](./BRAND_KIT.md).

## Incorporación y ayuda contextual

El dashboard dispone de recorridos específicos para sus áreas operativas. Una
instancia global montada en el layout selecciona los pasos según la ruta, resalta
controles mediante atributos `data-tour` y conserva por usuario/sección si el
recorrido fue completado u omitido. El botón **Guía** de la barra superior
permite repetir siempre la ayuda del apartado actual.

Configuración cambia de pestaña mediante un evento cliente validado, sin guardar
ni descartar el formulario. La arquitectura, cobertura, accesibilidad y lista de
verificación están en
[GUIA_INCORPORACION_PRODUCTO.md](./GUIA_INCORPORACION_PRODUCTO.md).

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
La validación del 2026-08-13 alcanzó la autorización del checkout TEST, pero
Mercado Pago la rechazó antes del cobro por incompatibilidad de entorno; el
registro, limpieza y escalamiento están en
[VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md](./VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md).

## Operación segura

- No registrar tokens, firmas, tarjetas, códigos de verificación ni secretos en
  código, documentación o tickets.
- Comprobar el historial de migraciones antes de ejecutar cambios remotos; una
  reparación de historial no sustituye una comparación de esquema.
- Conservar `delivery_orders` y demás tablas legacy hasta decidir una migración
  y una política de retención.
