# Validación sandbox de Suscripciones Pro — 2026-08-13

## Alcance

Prueba manual controlada en **Preview** para la suscripción mensual Pro de
S/ 25. No se modificó Production ni se usaron tarjetas, fondos reales,
credenciales en documentación o datos de pago.

## Hechos verificados

1. La aplicación Preview autenticó una cuenta temporal de LinkVentas y abrió
   `/pendiente`.
2. `POST /api/billing/mercadopago` creó una preaprobación y redirigió al
   `init_point` de Mercado Pago.
3. El checkout se inició con un **comprador TEST peruano** y saldo ficticio.
4. Al omitir `payer_email` en Preview, el checkout habilitó el botón
   **Confirmar**. Por tanto, el bloqueo histórico de coincidencia de e-mail
   quedó superado.
5. Tras confirmar, Mercado Pago mostró: *“Una de las partes con la que intentas
   hacer el pago es de prueba”*. El fallo ocurre antes de crear un cobro o
   entregar un webhook.
6. La preaprobación pendiente se canceló desde LinkVentas. El usuario volvió a
   Plan Emprendedor; no hubo activación Pro, cargo ni evento de plataforma.
7. En la aplicación Mercado Pago se creó un vendedor TEST peruano reutilizable.
   El proveedor advierte que estas cuentas no se pueden borrar; deben reservarse
   exclusivamente para sandbox.
8. El panel actual de la aplicación presenta credenciales de prueba con formato
   `TEST-`, mientras la respuesta de soporte exige `APP_USR` para
   Suscripciones. No se halló en ese panel el origen de la credencial `APP_USR`
   solicitada ni el vínculo entre el vendedor TEST y una preaprobación de
   Suscripciones.

## Estado

**Bloqueado externamente.** La prueba avanzó más que las anteriores: alcanza
la autorización del checkout, pero Mercado Pago rechaza la combinación de
entornos antes de cobrar. En consecuencia, todavía no existe evidencia de:

- `subscription_preapproval` procesado por el webhook de plataforma.
- `subscription_authorized_payment` firmado y validado.
- Cargo aprobado de S/ 25 PEN, activación idempotente o extensión de plan.
- Cancelación de una suscripción autorizada.

## Escalamiento

El 2026-08-13 se respondió el ticket **WCS-45319**, marcado previamente como
resuelto, sin adjuntar secretos ni datos de pago. Se solicitó a Mercado Pago:

1. El origen exacto de la credencial `APP_USR` requerida para Suscripciones en
   Perú cuando el panel muestra credenciales `TEST-`.
2. El mecanismo para asociar esa credencial con el vendedor TEST peruano.
3. La combinación soportada de aplicación, vendedor TEST y comprador TEST para
   completar un `preapproval` en sandbox.

## Procedimiento para retomar

1. Esperar la respuesta de Mercado Pago; no probar credenciales por ensayo y
   error ni copiar secretos entre entornos.
2. Aplicar la configuración indicada **solo en Preview** y crear un nuevo
   `preapproval` (la prueba anterior quedó cancelada).
3. Repetir: comprador TEST → saldo ficticio → Confirmar → webhook firmado →
   registro de cargo → activación Pro idempotente.
4. Cancelar la suscripción autorizada con el estado que Mercado Pago soporte y
   verificar la conciliación final.
5. Eliminar únicamente los datos temporales de LinkVentas que sean recuperables
   y retirar el callback temporal de Preview en Supabase al cerrar la prueba.
6. Ejecutar lint, pruebas unitarias y build antes de promover cualquier cambio.

## Seguridad

- No incluir aquí usuarios TEST, contraseñas, códigos de verificación, tokens,
  claves públicas, firmas, identificadores de pago ni URLs de checkout.
- Las credenciales de plataforma siguen siendo exclusivas del servidor y
  separadas por entorno.
- El retorno del navegador nunca activa Pro: solo el webhook firmado y la
  conciliación servidor-a-servidor pueden hacerlo.
