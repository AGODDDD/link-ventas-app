# Correcciones de la auditoría de seguridad

Fecha: 2026-09-05. Alcance: cambios locales; no aplicados a Supabase remoto ni desplegados.

## Controles corregidos

| Hallazgo | Implementación | Verificación local |
| --- | --- | --- |
| XSS almacenado | Color hexadecimal validado, HTML sin `dangerouslySetInnerHTML`, restricciones SQL | Render React y UPDATE autenticado malicioso |
| Reservas indefinidas | `orders.reservation_expires_at`; vencimiento de pedidos sin inventario confirmado | Caducidad, liberación y rechazo de aceptación tardía en PostgreSQL |
| Variantes y opciones | IDs, obligatoriedad, mínimos/máximos y stock agregado; descarte de metadatos manipulados | Pedidos válidos, opciones falsas, omisión y exceso de stock |
| Eliminación de archivos | Storage API `list`/`remove`, paginación y carpetas de usuario/tienda; reintentos de cierre parcial | Más de 200 archivos, subcarpetas, aislamiento y fallo del proveedor |
| Cuotas | RLS con capacidad por cuenta, tienda activa y bloqueo durante eliminación | Carpeta propia/ajena, suspensión y exceso de cuota |
| Comprobantes | Límite real de bytes, decodificación/reexportación WebP y comprobante existente de uso único | MIME falsificado, imagen válida y uso duplicado |
| Headers | CSP con nonce en tiendas; headers generales contra framing y MIME sniffing | Proxy, render y navegador local |
| CSV | Neutralización de fórmulas en campos textuales | Prefijos peligrosos y números legítimos |
| Migraciones duplicadas | DROP antes de recrear las seis políticas ya existentes | Cadena completa desde cero |
| Dependencias | Actualización compatible de humanfs y tsx/esbuild | `npm audit`: sin avisos conocidos |
| Errores | Mensajes controlados, sin objeto completo de respuesta del cobro en logs | Revisión de rutas y TypeScript |
| Replay | Antigüedad máxima, deduplicación posterior a HMAC y leases para reintentos | Firma, timestamp y recuperación de lease en PostgreSQL |

## Límites operativos

- WhatsApp/contra entrega sin aceptación: reserva de 2 horas. Mercado Pago y transferencia: 24 horas, conservando su umbral histórico. Pedidos con inventario confirmado no caducan. Creación, seguimiento, actualización e inicio de pago liberan vencidos; el cron conserva mantenimiento diario. No hay reembolsos automáticos.
- Carrito: hasta 50 líneas y 100 unidades totales. Se suman y verifican las reservas de líneas repetidas del mismo producto/variante, conservando sus opciones distintas en el pedido.
- Medios públicos: 200 MiB de capacidad reservada Free y 2 GiB Pro/trial. Se contabiliza el máximo del bucket por objeto (10 MiB productos, 5 MiB avatars), no `metadata.size` manipulable o ausente. Son límites conservadores de capacidad, no bytes reales; también cubren cargas en curso. Sobrescribir un objeto propio descuenta su capacidad anterior. No se borran medios existentes por exceder la cuota.
- Comprobantes: 5 MiB, 20 millones de píxeles, una sola imagen y hasta 2400×2400 al reexportar como WebP sin metadatos. Hasta 100 reservas de carga por tienda al día y 1000 registros por tienda. El cron retira hasta 100 cargas abandonadas de más de 24 horas por ejecución; conserva evidencia asociada a pedidos.
- Webhook: timestamp en segundos o milisegundos, hasta 72 horas de antigüedad y 5 minutos de desfase futuro. Se conserva el texto original en HMAC. La entrega fallida puede reintentarse; lease de 2 minutos ante interrupciones. La deduplicación identifica la entrega firmada, no el pago: actualizaciones legítimas siguen procesándose. Entregas y rate limits se purgan después de 7 días.
- CSP estricta con nonce en `/tienda/*`, con render dinámico y sin HTML compartido en caché. `strict-dynamic` permite dependencias de SDKs cargados por scripts autorizados. El resto de rutas conserva headers estructurales aplicados y scripts en Report-Only para no romper sus scripts existentes. No equivale a CSP estricta aplicada al dashboard completo.

## Publicación coordinada

La migración nueva es `supabase/migrations/20260905165315_security_audit_remediation.sql`.
La corrección histórica en `20260802171805_post_migration_security_cleanup.sql` añade seis `DROP POLICY IF EXISTS` justo antes de recrear las mismas políticas, sin cambiar predicados ni permisos finales. Si ya figura aplicada en remoto, no hay que volver a ejecutarla ni reparar su historial por inferencia.

Antes de publicar:

1. Comparar esquema e historial remoto, especialmente el índice único de reservas utilizado por la constraint nueva. No hacer `db push` indiscriminado ante divergencias.
2. Revisar el reemplazo de colores inválidos por NULL y los vencimientos calculados sobre pedidos existentes: un pendiente antiguo puede caducar en la próxima consulta.
3. Coordinar migración y runtime en mantenimiento. La API depende de RPCs/tablas nuevas y el comprobante requiere registro. Un checkout abierto con un comprobante previo puede necesitar volver a cargarlo. Publicar solo una parte no es un release completo.
4. Ejecutar la matriz de aislamiento en Supabase de prueba real y verificar cuotas concurrentes y eliminación física en Storage.
5. Probar SDK/checkout y notificaciones con destino y credenciales de Mercado Pago sandbox explícitos. Revisar entregas demoradas y cobros posteriores al vencimiento, manteniendo conciliación manual cuando corresponda.
6. Publicar el commit autorizado y verificar despliegue, CSP, nonce, HSTS y rutas en el dominio real. Revisar redirects OAuth, MFA y sesiones en Supabase Auth; no se alteraron desde esta tarea.

No revertir solamente el runtime antiguo con el esquema nuevo sin revisar el contrato de comprobantes. Una reversión SQL necesita migración explícita y revisión de los pedidos posteriores a la actualización.

## Evidencia y límites de las pruebas

Validación final del 2026-09-06: 65/65 pruebas unitarias aprobadas y lint sin errores. El E2E de checkout se omitió automáticamente por no disponer de destino y credenciales sandbox explícitos; no se considera aprobado. `git diff --check` sin errores. La auditoría de dependencias reportó cero vulnerabilidades conocidas. En Chrome, el catálogo ficticio cargó y se bloquearon tanto el ataque original como scripts y eventos inyectados en el HTML.

`npm run test:unit` ejecuta la cadena SQL y consultas con anon/authenticated en PGlite (PostgreSQL WASM). Se simulan las estructuras administradas Auth/Storage y la publicación Realtime; `gen_random_uuid` está integrado y no se carga pgcrypto. Esto no sustituye Supabase Storage/Auth reales, ni demuestra configuración remota o concurrencia entre conexiones.

El navegador usa una instancia local con catálogo ficticio. No escribe en tiendas reales ni realiza cobros. Build se verifica con configuración pública ficticia, sin depender de producción.

## Clasificación

- Runtime: rutas, catálogo/layout, proxy, helpers de `lib/`, `next.config.ts`, dependencias y migraciones; deben incluirse juntos en el release autorizado.
- Repositorio/desarrollo: tests, fixture SQL, este documento, `DATABASE_SCHEMA.md`, `PROJECT_MAP.md` y `CHANGELOG.md`; no se sirven en la web.
- Temporal: `.next/`, `node_modules/`, cachés de herramientas y capturas fuera del repositorio; no son entregables publicados.

La aplicación remota, pagos reales, commit/push y despliegue no forman parte de la verificación local efectuada.
