# Auditoría integral de cierre — 2026-08-06

## Veredicto

**No está terminado para lanzamiento integral.** El código principal es estable,
la historia de migraciones ya está reconciliada y la tienda puede operar. Queda
un bloqueo externo: el cobro de la suscripción Pro no está configurado en el
entorno Production de Vercel.

No se modificó código ni datos durante esta auditoría.

> **Actualización operativa — 2026-08-08.** Este informe conserva la fotografía
> del 2026-08-06. La ausencia de credenciales de Plataforma en Production fue
> corregida posteriormente y ya no es el bloqueo vigente. El bloqueo actual es
> completar la autorización sandbox de una suscripción Pro y recibir sus
> webhooks firmados; Mercado Pago debe resolver el e-mail de la cuenta
> compradora de prueba mediante el ticket `WCS-45319`. El estado actual está en
> [ESTADO_OPERATIVO_2026-08-08.md](./ESTADO_OPERATIVO_2026-08-08.md).

## Alcance y evidencia

| Capa | Evidencia | Resultado |
| --- | --- | --- |
| Calidad | `npm run lint` | Correcto |
| Pruebas | `npm run test:unit` | 30/30 aprobadas |
| Build | `npm run build` | Correcto, 31 rutas generadas |
| Dependencias | `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| Repositorio | `git status --short`, `git diff --check` | Árbol limpio, sin errores de whitespace |
| Producción | Vercel: deployment `dpl_7jvipSSy7jJRgqeazLASxRLjzbP5` | `Ready`; alias principal responde HTTP 200 |
| Base de datos | `supabase migration list --linked`, `supabase db advisors --linked` | Historial local/remoto sincronizado; avisos analizados abajo |

## Hallazgos críticos

### C1 — Plan Pro no puede cobrar ni confirmar pagos en Producción

**Evidencia.** Vercel contiene `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` solamente
en **Preview**; no están en **Production**. La ruta
`app/api/billing/mercadopago/route.ts` exige `MP_ACCESS_TOKEN` para crear el
`preapproval`, y `app/api/webhooks/mercadopago/route.ts` exige ambos secretos
para confirmar una suscripción. En Producción ambas rutas devolverán `503`.

**Impacto.** Un comercio puede seguir usando su propia pasarela Mercado Pago si
ya es Pro —sus credenciales se guardan por comercio—, pero una cuenta nueva no
podrá comprar ni activar Pro desde el sitio productivo. Por tanto, el modelo
SaaS de pago no está listo para lanzar.

**Acción obligatoria.** Cargar `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` correctos
en Vercel para Production, volver a desplegar y ejecutar un flujo sandbox
controlado: iniciar suscripción → webhook firmado → plan Pro activo → cancelar.
No copiar valores desde Preview sin validar que sean las credenciales y la firma
del webhook de plataforma de Producción.

### Resuelto — Historial de migraciones reconciliado

Los nombres locales fueron normalizados a las versiones que Supabase registró
realmente. Se verificó el esquema remoto antes de reparar su tabla de seguimiento:
el contrato de variantes no tiene combinaciones faltantes ni filas malformadas,
las reservas tienen su clave e índice únicos y las funciones canónicas de órdenes
están presentes. `supabase migration list --linked` ahora muestra coincidencia
local/remota para todas las migraciones.

## Hallazgos medios

### M1 — Protección contra contraseñas filtradas deshabilitada

El asesor de Supabase reporta `auth_leaked_password_protection` como `WARN`.
Activar la protección de contraseñas comprometidas en Supabase Auth reduce el
riesgo de toma de cuentas. No bloquea los flujos actuales, pero debe entrar en
la lista de salida a producción.

### M2 — La verificación completa de pagos depende de configuración externa

El código confirma los pagos de comercio exclusivamente mediante webhook HMAC,
contrasta monto, moneda, orden y tienda, y usa la función canónica para
inventario. Las pruebas cubren la validación de firma. Sin embargo, esta
auditoría no ejecutó un cobro sandbox nuevo contra Producción ni pudo verificar
las firmas configuradas por cada comercio. Eso queda como condición operativa
de lanzamiento para cada tienda que active tarjeta.

## Observaciones no bloqueantes

- El asesor marca varias tablas con RLS sin políticas (`abandoned_cart_rate_limits`,
  reservas, billing y tablas legacy). Es consistente con su uso exclusivo por
  `service_role`: RLS sin política niega acceso a `anon` y `authenticated`.
  Mantenerlo; no añadir políticas permisivas sólo para silenciar el aviso.
- El asesor marca `transition_order_status` como `SECURITY DEFINER` ejecutable
  por usuarios autenticados. Es una excepción intencional y acotada: la función
  fija `search_path`, verifica que `stores.owner_id = auth.uid()` y valida la
  máquina de estados. Mantener la prueba de autorización y revisar ese contrato
  ante cualquier modificación.
- Hay índices sin uso y claves foráneas sin índice en tablas legacy. No eliminar
  ni alterar `delivery_orders`, `orders_legacy` u `order_items_legacy` sin un
  plan específico de retención y migración de datos.
- La petición POST sin firma al webhook con un `store_id` inexistente devuelve
  404 antes de validar la firma. No filtra datos sensibles; una tienda real sin
  firma es rechazada por la validación HMAC según pruebas unitarias. Se puede
  homogeneizar a 401 más adelante si se quiere reducir enumeración de tiendas.

## Aspectos que sí están listos

- Aislamiento de comercios a través de `stores.owner_id` y RLS versionado.
- Creación de pedidos con validación, límite de intentos y reserva de inventario.
- Confirmación de Mercado Pago por servidor con HMAC, conciliación de importe y
  moneda, y descuento/liberación de stock mediante funciones SQL canónicas.
- Webhooks, cron y operaciones privilegiadas sin acceso público directo.
- Alias productivo `https://link-ventas-app.vercel.app` en un deployment `Ready`
  y respuesta HTTP 200 en la portada.

## Criterio de cierre

Se puede declarar **listo para lanzamiento integral** cuando se cumpla todo lo
siguiente:

1. Configurar las dos credenciales de plataforma Mercado Pago en Production y
   validar el flujo Pro sandbox firmado de extremo a extremo.
2. Activar la protección de contraseñas filtradas de Supabase Auth.
3. Repetir lint, pruebas, build y una comprobación de Vercel/Supabase después de
   los cambios.
