# Estado operativo y cierre de pagos — actualizado 2026-08-13

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
| Creación de suscripción Pro en Preview/sandbox | Verificada | Preview crea `preapproval` y abre `init_point`; con `payer_email` omitido, un comprador TEST llega a Confirmar. |
| Autorización sandbox y webhook de plataforma | Bloqueado externamente | Mercado Pago rechaza Confirmar antes del cobro con “Una de las partes con la que intentas hacer el pago es de prueba”. No hubo cobro ni webhook. El ticket `WCS-45319` recibió nueva evidencia y espera aclaración sobre la combinación de credenciales y vendedor TEST. |
| Calidad de código y build | Evidencia histórica | La auditoría del 2026-08-06 registró lint correcto, 30/30 pruebas unitarias, build correcto y auditoría de dependencias sin vulnerabilidades altas. Deben repetirse antes de un release posterior. |

## Qué se corrigió durante esta validación

- La ausencia histórica de `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` en
  Production dejó de ser el bloqueo descrito en la auditoría del 2026-08-06.
- Se separaron las credenciales de Production y Preview; las pruebas sandbox
  no deben reutilizar credenciales productivas.
- La falla inicial `500 Internal server error` al crear la suscripción de
  prueba quedó superada: Preview crea la preaprobación y abre el checkout.
- Omitir `payer_email` en Preview quitó la restricción de e-mail y permitió que
  el comprador TEST llegue al paso Confirmar.
- Se confirmó que el checkout bloqueado con la cuenta del vendedor en
  Production es una restricción de Mercado Pago contra el autopago, no un error
  de CSP ni de la interfaz de LinkVentas.

## Próximo procedimiento obligatorio

1. Esperar la respuesta del ticket `WCS-45319` sobre el origen de `APP_USR` y
   cómo asociar la credencial soportada al vendedor TEST de Perú. El panel actual
   muestra credenciales `TEST-`, incompatibles con la indicación recibida para
   Suscripciones.
2. Aplicar la respuesta únicamente en Preview; no copiar ni alternar secretos
   por ensayo y error entre Preview y Production.
3. Crear una nueva preaprobación y autorizar una suscripción de prueba,
   verificando, sin confiar en el retorno
   del navegador: evento `subscription_preapproval`, evento
   `subscription_authorized_payment`, firma válida de webhook, registro de
   cargo en PEN por S/ 25 y activación idempotente del plan.
4. Cancelar la suscripción de prueba autorizada y limpiar los datos temporales
   recuperables de LinkVentas al cerrar el flujo. La preaprobación fallida del
   2026-08-13 ya quedó cancelada; no generó cargo ni activación.
5. Solo después de lo anterior, ejecutar una compra Production controlada con
   un comprador real distinto del vendedor y volver a comprobar el webhook.
6. Repetir `npm run lint`, `npm run test:unit`, `npm run build` y las revisiones
   operativas de Vercel/Supabase antes de declarar el lanzamiento integral.

## Contrato técnico de suscripciones

`POST /api/billing/mercadopago` crea un `preapproval` mensual de S/ 25 en PEN y
asocia `external_reference` al usuario autenticado. En Preview omite
`payer_email` para no restringir al comprador TEST; Production conserva ese
campo. Solo persiste la suscripción si Mercado Pago responde correctamente con
identificador e `init_point` válidos.

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
- Registro detallado de la validación y del escalamiento: [VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md](./VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md).
