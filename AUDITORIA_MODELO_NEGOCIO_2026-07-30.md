# Auditoría profunda del modelo de negocio y arquitectura — LinkVentas

**Fecha:** 2026-07-30  
**Alcance:** storefront multi-tenant, catálogo, carrito, checkout, pagos Mercado Pago, órdenes, inventario, CRM de carritos abandonados, planes SaaS, administración, RLS y migraciones.  
**Modo:** solo lectura. No se modificó código, esquema ni configuración.  
**Criterio:** evidencia localizada en el repositorio; cuando algo no puede verificarse sin acceso a producción o a credenciales externas se marca como `DESCONOCIDO`.

## Veredicto ejecutivo

El producto tiene una propuesta coherente en superficie —crear una tienda por enlace, administrar catálogo, recibir pedidos y monetizar funciones Pro—, pero el núcleo operativo todavía no es suficientemente confiable para considerarlo un negocio e-commerce robusto.

La principal debilidad no es visual: es la falta de una máquina de estados única para tienda, pedido, pago e inventario. El sistema mezcla capas nuevas y legacy, nombres de plantilla incompatibles y estados de pago distintos. Esto produce riesgos directos de pérdida de stock, reportes incorrectos, operaciones manuales ambiguas y regresiones al ejecutar migraciones desde cero.

**Nivel global:** Alto riesgo operativo.  
**Prioridad:** corregir primero inventario/pago, contrato de estados y modelo de identidad/plantillas; después limpiar migraciones y documentación.

## Hallazgos por severidad

| ID | Severidad | Área | Hallazgo | Impacto de negocio |
|---|---|---|---|---|
| C-01 | **Crítico** | Inventario + pagos | El stock se descuenta al crear la orden, antes de que Mercado Pago apruebe el pago, y el mantenimiento no lo repone al cancelar. | Sobreventa o stock artificialmente agotado tras pagos rechazados/abandonados. |
| C-02 | **Crítico** | Plantillas | `food` y `restaurante` conviven como valores distintos; el storefront solo activa restaurante con `restaurante`. | Una tienda guardada como `food` puede renderizar la plantilla incorrecta y perder delivery/categorías. |
| C-03 | **Crítico** | Seguridad/operación | El dashboard actualiza estados de órdenes directamente desde el cliente y no existe una transición de estados validada en BD. | Un merchant puede retroceder estados o marcar estados operativos inválidos; auditoría y KPIs quedan contaminados. |
| C-04 | **Alto** | Datos/migraciones | El repositorio contiene dos modelos de órdenes y columnas incompatibles (`orders` core vs legacy; `store_id` vs `merchant_id`; `total` vs `total_amount`). | Migraciones no reproducibles, consultas rotas y alta probabilidad de regresiones al tocar datos históricos. |
| C-05 | **Alto** | Pagos | Mercado Pago valida aprobación en la respuesta sin webhook/conciliación posterior para pagos de tiendas. | Estados inciertos ante timeouts, respuesta perdida o discrepancia posterior con la pasarela. |
| C-06 | **Alto** | Facturación SaaS | La activación Pro depende de cobro síncrono y no hay webhook ni reconciliación documentada para el pago de la plataforma. | Un pago aprobado con error de red puede dejar al cliente cobrado pero sin Pro. |
| M-01 | **Medio** | Identidad multi-tenant | `products.user_id` y `orders.store_id` dependen de que store UUID y owner UUID sean el mismo valor, aunque el esquema define `owner_id` separado. | El diseño funciona mientras la relación sea 1:1; una futura separación owner/tienda rompe consultas y RLS. |
| M-02 | **Medio** | Variantes | Se valida la existencia de talla/color, pero el inventario descontado es el stock agregado del producto, no stock por combinación. | Riesgo de vender una variante agotada aunque quede stock de otra. |
| M-03 | **Medio** | CRM | El endpoint de carritos abandonados usa `service_role` para insertar datos públicos y no tiene rate limit ni límites estructurales suficientes. | Spam, crecimiento artificial de leads y costo/ruido operativo. |
| M-04 | **Medio** | Experiencia | La tienda inactiva sigue siendo consultable y se muestra en modo lectura; el bloqueo real ocurre recién al crear la orden. | Clientes pueden navegar y completar formularios antes de recibir un error; mala señal comercial. |
| B-01 | **Bajo/observación** | Contratos | Tipos, documentación y mapa operativo siguen describiendo Mercado Pago, `total_amount`, `merchant_id` y `seguridad_supabase.sql`, aunque el código actual usa Mercado Pago y `total`. | Onboarding incorrecto y mantenimiento basado en supuestos obsoletos. |
| B-02 | **Bajo/observación** | Calidad | `npm run lint` pasa; `npm run test:unit` y `npm run build` no concluyen por restricciones del entorno, no por un fallo funcional demostrado. | La evidencia de entrega queda incompleta hasta repetirla en un entorno con procesos/IPC permitidos. |

## Evidencia detallada

### C-01 — Inventario consumido antes de cobrar

La RPC transaccional `create_order_from_cart` bloquea el producto, valida stock y luego decrementa `products.stock` en `supabase/migrations/20260000000004_secure_orders_and_rls.sql:113-147`. Para pagos con tarjeta, la misma función crea la orden en `pendiente_pago` en las líneas `160-164`.

La migración posterior mantiene ese comportamiento para Mercado Pago: `supabase/migrations/20260000000009_validate_moda_variants_at_checkout.sql:59-66` descuenta stock antes de insertar la orden pendiente. El cron solo cambia el estado a `cancelado`; no hay ninguna actualización de reposición en `supabase/migrations/20260000000006_background_maintenance.sql:36-47`.

**Conclusión:** un pago rechazado, abandonado o que nunca llega a confirmarse conserva el descuento de inventario. Esto afecta directamente la promesa comercial de disponibilidad real.

### C-02 — Contrato de plantilla inconsistente

La documentación y el análisis de migración declaran los valores `food`, `comercio`, `moda`, pero el tipo central todavía declara `TemplateType = 'restaurante' | 'comercio' | 'moda'` en `types/core.ts:5`.

El storefront solo carga extensiones de delivery cuando `perfil.template_type === 'restaurante'` en `app/tienda/[id]/page.tsx:80-90`, y selecciona la plantilla restaurante únicamente en `app/tienda/[id]/page.tsx:106-122`. En cambio, la migración de configuración sigue convirtiendo restaurante a `restaurante` en `supabase/migrations/20260000000005_unify_store_configuration.sql:46-51`, mientras otros documentos declaran `food` como valor canónico.

**Conclusión:** no existe un contrato único. Un dato `food` es técnicamente admitido por el constraint final, pero no activa la rama restaurante del frontend.

### C-03 — Estados modificables sin máquina de estados

El dashboard hace `.from('orders').update({ status: nextStatus })` directamente desde el navegador en `app/dashboard/pedidos/page.tsx:168-189`, y también permite cancelar directamente en las líneas `192-205`.

La política RLS permite al propietario actualizar la orden en `supabase/migrations/20260000000004_secure_orders_and_rls.sql:244-248`. El trigger de protección solo bloquea campos financieros y el cambio a `paid` desde un cliente en `supabase/migrations/20260000000004_secure_orders_and_rls.sql:250-277`; no valida transiciones como `completado → pendiente` ni restringe cancelaciones según estado.

Además, la lista de estados del frontend contiene `paid`, mientras la secuencia operativa usa `pendiente_pago`, `pendiente`, `en_preparacion`, `alistando`, `en_camino`, `completado` en `app/dashboard/pedidos/page.tsx:143-165`.

**Conclusión:** la autorización de “puede editar esta orden” existe, pero la autorización de “qué transición puede ejecutar” no.

### C-04 — Dos modelos de órdenes y contratos de columnas

La migración core define `orders.store_id`, `total`, `direccion` y `order_items` en `supabase/migrations/20260000000001_002_core_schema.sql:34-71`. Sin embargo, migraciones anteriores/agregadas todavía crean o agregan `merchant_id`, `customer_address` y `total_amount` en `supabase/migrations/20260000000001_005_saas_security.sql:14-16`.

El propio `DATABASE_SCHEMA.md:65-69` reconoce que esas columnas no existen en producción, mientras `DOCUMENTACION.md:35-40` todavía presenta `total_amount` como campo clave de `orders`. El dashboard sigue usando fallback legacy `total || total_amount` en `store/useDashboardStore.ts:157-175` y `app/dashboard/pedidos/page.tsx:591`.

**Conclusión:** la compatibilidad defensiva está ocultando la falta de un contrato de datos único.

### C-05 — Pago de tienda sin reconciliación asíncrona visible

El checkout crea la orden como `pendiente_pago` y luego llama a Mercado Pago en `app/api/checkout/mercadopago/route.ts:23-40`. Solo si la respuesta HTTP inmediata es aprobada actualiza la orden a `paid` en la línea `45`; si el update falla responde `202` con “estamos conciliando”, pero no se observa un webhook ni un proceso posterior que termine esa conciliación.

El contrato operativo aún menciona un webhook de Mercado Pago en `ARCHITECTURE.md:35-41` y `PROJECT_MAP.md:19-24`, pero no existe una ruta activa equivalente de webhook Mercado Pago en `app/api`.

**Conclusión:** la idempotencia de la llamada ayuda a reintentos, pero no reemplaza la confirmación asíncrona ni el reconciliador.

### C-06 — Cobro Pro y activación síncronos

La ruta de billing cobra y, en la misma solicitud, llama a `activate_platform_pro_subscription` en `app/api/billing/mercadopago/route.ts:28-54`. La función registra el pago e incrementa el vencimiento en `supabase/migrations/20260000000008_remove_mercadopago_and_unify_mercadopago.sql:29-59`.

No se encontró webhook Mercado Pago ni job de reconciliación para `platform_billing_payments`; el único cron registrado en `vercel.json:2-7` ejecuta mantenimiento de órdenes/carritos.

**Conclusión:** un timeout después de la aprobación puede producir el estado de negocio “cobrado pero no activado”.

### M-01 — Owner y tienda no están realmente desacoplados

El modelo define `stores.owner_id` separado de `stores.id` en `supabase/migrations/20260000000001_002_core_schema.sql:7-20`, pero la creación de productos se consulta con `products.user_id = storeId` en `app/tienda/[id]/page.tsx:93-99`, y la RPC valida `products.user_id = p_store_id` en `supabase/migrations/20260000000009_validate_moda_variants_at_checkout.sql:35-38`.

La migración de backfill copia el mismo UUID a `id` y `owner_id` en `supabase/migrations/20260000000005_unify_store_configuration.sql:34-55`. Esto explica por qué funciona hoy, pero congela accidentalmente el modelo 1:1.

### M-02 — Variantes sin inventario por SKU/combinación

La función valida que la talla/color elegidos existan en `v_product.variants` en `supabase/migrations/20260000000009_validate_moda_variants_at_checkout.sql:41-52`, pero descuenta `v_product.stock` agregado en las líneas `39` y `61`.

**Conclusión:** la validación de disponibilidad de la opción no equivale a disponibilidad de la combinación vendida.

### M-03 — Captura pública con privilegio de servicio

`app/api/abandoned-cart/route.ts:12` obtiene `getSupabaseServiceClient()` y permite insertar o actualizar un carrito con datos enviados públicamente en las líneas `16-45`. No hay límite de longitud de nombre/teléfono/cart, rate limit, captcha, deduplicación por ventana ni validación de que el carrito pertenezca a productos activos de la tienda.

### M-04 — Tienda inactiva visible

El storefront consulta la tienda por id/slug sin filtrar `is_active` en `app/tienda/[id]/page.tsx:31-38`. Luego solo presenta una bandera visual `isReadOnly` en las líneas `78` y `136-139`. El bloqueo efectivo sucede en la RPC, que valida `is_active = true` en `supabase/migrations/20260000000009_validate_moda_variants_at_checkout.sql:24-25`.

### B-01 — Documentación y reglas operativas desalineadas

`AGENT_RULES.md:19-22` y `PROJECT_MAP.md:19-24,62-65` siguen señalando archivos y flujos Mercado Pago protegidos, aunque la migración `20260000000008_remove_mercadopago_and_unify_mercadopago.sql:85-88` elimina columnas Mercado Pago y el código de checkout activo usa Mercado Pago. `DOCUMENTACION.md:42-43,68-89` también referencia `seguridad_supabase.sql` y `scripts/doctor.ts`, mientras el repositorio actual usa `supabase/migrations` y no contiene esos archivos.

### B-02 — Verificaciones ejecutadas

- `npm run lint`: **EXIT 0**.
- `npm run test:unit`: **EXIT 1**, por `Error: listen EPERM` al crear el pipe IPC de `tsx` en el entorno de ejecución.
- `npm run build`: **EXIT 1**, por error interno de Turbopack al crear procesos/bindear un puerto (`Operation not permitted`), no por un error TypeScript/ESLint reportado.
- No se verificó el estado real de producción, Supabase RLS efectivo ni credenciales de Mercado Pago; esas partes quedan `DESCONOCIDO` hasta una ejecución autorizada contra los entornos correspondientes.

## Puntadas en vacío y deuda de producto

1. **Capa legacy mantenida como flujo activo:** `useDashboardStore` todavía normaliza fuentes `legacy_delivery` y `legacy_standard` aunque el modelo declarado dice que `orders` es unificado (`store/useDashboardStore.ts:224-...`). Esto aumenta complejidad y dificulta saber qué venta alimenta los KPIs.
2. **Documentación histórica presentada como manual actual:** varios documentos describen Mercado Pago, `delivery_orders` y columnas que el schema actual ya no considera fuente de verdad.
3. **Carrito abandonado parcialmente resuelto:** existe captura y expiración automática, pero no se observa automatización de contacto; el valor comercial depende de rescate manual vía WhatsApp (`app/dashboard/pedidos/page.tsx:207-210`).
4. **Tipos débiles en el núcleo:** `variants?: any[]`, `store_schedule?: any` y múltiples campos `any` en `store/useDashboardStore.ts:5-37` reducen la capacidad del compilador para detectar divergencias de negocio.

## Cumplimiento del manual operativo

### Cumplido

- Los flujos sensibles principales están ubicados en `app/api`.
- La clave de servicio se mantiene del lado servidor en `lib/supabaseServer.ts:13-21`.
- `ADMIN_USER_ID` se valida server-side en las rutas admin, por ejemplo `app/api/admin/check/route.ts:4-11`.
- El cifrado de credenciales de Mercado Pago pasa por `encryptText` en `app/api/settings/payment/route.ts:66-69`.
- Lint ejecuta correctamente.

### Incumplido o en riesgo

- El manual exige que documentación y changelog reflejen la sesión; por tratarse de una auditoría sin cambios de código, este reporte es el único nuevo artefacto de esta revisión. No se editó `CHANGELOG.md` para respetar la instrucción explícita de no hacer cambios de producto/código.
- La convención de “cliente frontend para frontend, service role solo background/webhooks” está tensionada por `app/api/abandoned-cart/route.ts:12`, que usa service role para tráfico público.
- El manual exige una fuente operativa coherente, pero `AGENT_RULES.md`, `PROJECT_MAP.md`, `DOCUMENTACION.md`, tipos y migraciones no están alineados con Mercado Pago/stores/orders actuales.
- La cobertura E2E sigue sin una ejecución verificable dentro de este entorno; el repositorio sí contiene Playwright en dependencias y un spec local no versionado en el estado actual, por lo que la afirmación “no hay configuración” de los documentos debe actualizarse o comprobarse.

## Plan de acción recomendado

### Fase 0 — Contención inmediata

1. Pausar cambios de migración no esenciales.
2. Confirmar en producción cuántas órdenes `pendiente_pago` tienen stock descontado y cuántas fueron canceladas en las últimas 24–72 horas.
3. Reponer inventario solo mediante un procedimiento idempotente y auditado; no hacer correcciones manuales masivas sin snapshot.
4. Suspender la consideración de “stock real” como métrica confiable hasta resolver C-01.

### Fase 1 — Contratos de negocio

1. Definir un único enum de plantilla: recomendado `food | comercio | moda`, o justificar formalmente `restaurante` y migrar todo a ese nombre.
2. Definir un único enum de estado, incluyendo explícitamente estado de pago y estado operativo si son dimensiones distintas.
3. Implementar transiciones válidas en una RPC/función de BD; el dashboard no debe escribir estados arbitrarios.
4. Separar reserva, confirmación y liberación de inventario. La opción más segura es reservar con expiración y confirmar al pago aprobado; si se descuenta al crear orden, el cancelador debe reponer exactamente una vez.

### Fase 2 — Pagos y conciliación

1. Implementar webhook Mercado Pago con verificación server-to-server, monto, moneda, tienda, referencia e idempotencia.
2. Hacer que el webhook sea la fuente final de `paid`; la respuesta síncrona solo debe mostrar “procesando” o “aprobado provisional”.
3. Crear reconciliador para pagos aprobados sin orden actualizada y órdenes pendientes con pago expirado/rechazado.
4. Aplicar el mismo patrón a la suscripción Pro.

### Fase 3 — Datos y migraciones

1. Declarar `stores`, `store_config`, `orders` y `order_items` como único modelo vigente.
2. Aislar tablas legacy en migración/archivo histórico y eliminar fallbacks una vez verificados los datos.
3. Generar un esquema de producción reproducible desde cero y probarlo en una base limpia.
4. Alinear `DATABASE_SCHEMA.md`, `DOCUMENTACION.md`, `ARCHITECTURE.md`, `PROJECT_MAP.md`, `types/*` y scripts con Mercado Pago y los nombres reales.

### Fase 4 — Calidad y controles

1. Añadir pruebas de invariantes: no stock negativo, cancelación idempotente, reintento de pago, transición inválida, doble webhook, tienda inactiva y variante agotada.
2. Añadir rate limiting y validación de payloads para órdenes, reviews y carritos abandonados.
3. Ejecutar lint, unit, build y E2E en CI con un entorno que permita los procesos requeridos.
4. Verificar RLS efectivo en una base real con pruebas anon/authenticated/service role; la lectura del repositorio no sustituye esa verificación.

## Preguntas que deben resolverse antes de declarar el modelo sano

- ¿El negocio quiere vender reservas de stock o ventas confirmadas? La respuesta cambia el diseño de inventario.
- ¿`food` es el nombre canónico definitivo o `restaurante`? No deben coexistir.
- ¿Mercado Pago debe admitir pagos asíncronos y estados `in_process`/`rejected`? El modelo actual solo finaliza en aprobación inmediata.
- ¿Una cuenta podrá tener más de una tienda? El código actual asume una relación 1:1 aunque el esquema tiene `owner_id` separado.
- ¿El carrito abandonado debe ser solo CRM interno o debe disparar recuperación automática? Actualmente es captura + rescate manual.

## Conclusión

LinkVentas tiene una base funcional y una dirección de producto reconocible, pero la lógica de negocio central todavía está acoplada a supuestos históricos: una tienda equivale a un usuario, un pedido mezcla pago y operación, una reserva de stock equivale a venta, y varios nombres distintos representan el mismo concepto. Mientras esos supuestos no se formalicen, cada mejora de UX o nueva plantilla incrementará el riesgo operativo.

La corrección prioritaria es C-01: el inventario debe dejar de quedar comprometido por pagos no confirmados. Después deben cerrarse C-02/C-03/C-04 para que el sistema tenga un solo contrato de plantilla, estados y datos. Solo entonces conviene seguir ampliando la superficie comercial.
