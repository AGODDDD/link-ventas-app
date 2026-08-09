# Estado operativo y cierre de pagos — 2026-08-08

## Veredicto actual

**LinkVentas no está listo todavía para declarar el lanzamiento público integral
del Plan Pro al 100 %.** El núcleo de tienda y el cobro por tienda cuentan con
evidencia previa de funcionamiento; la suscripción SaaS de plataforma ya crea
correctamente el checkout, pero falta completar y registrar una autorización
sandbox de punta a punta con su webhook firmado.

No se deben interpretar los resultados de este documento como autorización para
cobrar a clientes reales sin una prueba controlada separada.

## Estado por flujo

| Flujo | Estado | Evidencia / condición de cierre |
| --- | --- | --- |
| Tienda, carrito, pedidos e inventario | Verificado previamente | El pedido se crea con reserva de inventario y el webhook firmado confirma o libera la reserva. |
| Cobro Mercado Pago de una tienda | Verificado previamente en prueba controlada | La cadena pedido → pago → webhook firmado → confirmación → inventario se probó y se limpió. Sigue requiriendo que cada comercio configure su propia pasarela y firma. |
| Configuración de plataforma en Production | Configurada | Las credenciales de plataforma y la firma de webhook fueron cargadas por entorno; no se documentan sus valores. |
| Creación de suscripción Pro en Production | Verificada parcialmente | La API crea `preapproval` y abre el checkout alojado de Mercado Pago. No se autorizó ningún cobro real durante esta validación. |
| Confirmación Production | Pendiente | Debe pagar una cuenta compradora real distinta de la cuenta vendedora y con el mismo e-mail que usa en LinkVentas. Mercado Pago bloquea el autopago del vendedor. |
| Creación de suscripción Pro en Preview/sandbox | Verificada | Con credenciales de aplicación de prueba `APP_USR` y una cuenta compradora de prueba, Mercado Pago creó el `preapproval` y abrió `init_point`. El error HTTP 500 inicial quedó resuelto. |
| Autorización sandbox y webhook de plataforma | Bloqueado externamente | El botón Confirmar sigue deshabilitado porque el `payer_email` de LinkVentas no coincide con el e-mail de la cuenta compradora de prueba. Mercado Pago debe indicar cómo obtener/configurar ese e-mail. Ticket `WCS-45319` sigue pendiente. |
| Calidad de código y build | Evidencia histórica | La auditoría del 2026-08-06 registró lint correcto, 30/30 pruebas unitarias, build correcto y auditoría de dependencias sin vulnerabilidades altas. Deben repetirse antes de un release posterior. |

## Qué se corrigió durante esta validación

- La ausencia histórica de `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` en
  Production dejó de ser el bloqueo descrito en la auditoría del 2026-08-06.
- Se separaron las credenciales de Production y Preview; las pruebas sandbox
  no deben reutilizar credenciales productivas.
- La falla inicial `500 Internal server error` al crear la suscripción de
  prueba se resolvió al usar una aplicación de prueba y comprador de prueba
  válidos, tal como indicó soporte de Mercado Pago.
- Se confirmó que el checkout bloqueado con la cuenta del vendedor en
  Production es una restricción de Mercado Pago contra el autopago, no un error
  de CSP ni de la interfaz de LinkVentas.

## Próximo procedimiento obligatorio

1. Esperar la respuesta del ticket `WCS-45319` sobre el e-mail de la cuenta
   compradora de prueba o el mecanismo equivalente para suscripciones.
2. En Preview, iniciar sesión con la cuenta compradora de prueba y hacer que su
   e-mail coincida con el `payer_email` de la cuenta temporal de LinkVentas.
3. Autorizar una suscripción de prueba y verificar, sin confiar en el retorno
   del navegador: evento `subscription_preapproval`, evento
   `subscription_authorized_payment`, firma válida de webhook, registro de
   cargo en PEN por S/ 25 y activación idempotente del plan.
4. Cancelar la suscripción de prueba y eliminar la cuenta/tienda temporal de
   sandbox que quedó creada para este intento (`sandbox-suscripcion-20260809-001`).
5. Solo después de lo anterior, ejecutar una compra Production controlada con
   un comprador real distinto del vendedor y volver a comprobar el webhook.
6. Repetir `npm run lint`, `npm run test:unit`, `npm run build` y las revisiones
   operativas de Vercel/Supabase antes de declarar el lanzamiento integral.

## Contrato técnico de suscripciones

`POST /api/billing/mercadopago` crea un `preapproval` mensual de S/ 25 en PEN,
asocia `external_reference` al usuario autenticado y envía `payer_email` con el
e-mail de ese usuario. Solo persiste la suscripción si Mercado Pago responde
correctamente con identificador e `init_point` válidos.

`/api/webhooks/mercadopago?scope=platform` valida la firma con
`MP_WEBHOOK_SECRET`. Los eventos de suscripción no activan el plan desde el
navegador: la conciliación se hace en servidor y acepta el cargo solo si está
aprobado, es PEN y coincide con S/ 25.

## Límites y decisiones pendientes

- No guardar ni copiar credenciales, secretos de webhook, códigos de
  verificación ni datos de tarjeta en documentación, repositorio o tickets.
- La protección de contraseñas filtradas de Supabase Auth requiere una decisión
  explícita de configuración; no se modificó durante esta validación.
- Las tablas legacy, en especial `delivery_orders`, permanecen preservadas hasta
  contar con un plan de retención y migración de datos.
