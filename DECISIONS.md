# Log de decisiones arquitectónicas

### [INICIAL] Uso de Supabase con RLS
- **Contexto**: Necesidad de un backend Serverless multi-tenant rápido y seguro.
- **Opciones evaluadas**: Firebase, AWS RDS custom, Supabase.
- **Decisión**: Se eligió Supabase.
- **Razón**: Permite manejar la separación de tenants a nivel de base de datos usando Row Level Security (RLS) y autenticación integrada.
- **Consecuencias**: Acopla la seguridad de la app a las políticas de PostgreSQL y exige migraciones versionadas, pruebas RLS y privilegios explícitos.

### [ACTUAL] Next.js 16 App Router
- **Contexto**: Framework frontend para eCommerce rápido con SEO (Vanity URLs).
- **Opciones evaluadas**: React SPA, Vite, Next.js.
- **Decisión**: Next.js App Router.
- **Razón**: Capacidad SSR/SSG nativa y API routes en un mismo ecosistema.
- **Consecuencias**: Toda la lógica transaccional de pagos debe manejarse estrictamente del lado del servidor en `app/api`.

### [INICIAL] Estado Local con Zustand
- **Contexto**: Manejo del carrito de compras para clientes anónimos sin saturar la base de datos.
- **Opciones evaluadas**: Redux, Context API, Zustand + LocalStorage.
- **Decisión**: Zustand persistido en `localStorage`.
- **Razón**: Extremadamente ligero, no requiere boilerplate y sobrevive a recargas de página.
- **Consecuencias**: El estado del carrito vive exclusivamente en el cliente. Posibles problemas menores de hidratación si no se inicializa tras el primer render.

### [HISTÓRICA — sustituida el 2026-08-08] Facturación SaaS Manual
- **Contexto**: Cobro mensual a los merchants por el Plan Pro de LinkVentas.
- **Opciones evaluadas**: Stripe Billing, Cobro manual.
- **Decisión**: Cobro manual por WhatsApp.
- **Razón**: (Inferido) Menor fricción de implementación inicial en un mercado latinoamericano.
- **Consecuencias**: Cuellos de botella operativos para habilitar cuentas. No automatizable masivamente.

> Esta decisión ya no rige: el Plan Pro se implementa mediante suscripciones de
> Mercado Pago. Ver la decisión del 2026-08-08 al final de este archivo.

### [INICIAL] Validación Zero-Trust Webhook Mercado Pago
- **Contexto**: Recepción de confirmación de pagos de tarjetas.
- **Opciones evaluadas**: Confiar en payload POST vs Consultar API fuente.
- **Decisión**: Consultar directamente a la API de Mercado Pago con el `charge_id`.
- **Razón**: Prevenir manipulación de payloads webhooks por actores maliciosos que falsifiquen IPs.
- **Consecuencias**: Requiere desencriptar en el servidor el `mercadopago_secret_key` del merchant en cada llamada de webhook entrante.

### [RESUELTO] Modelo Canónico de Identidad y Plantillas (SaaS)

- Contexto: El usuario confirmó el diseño real del sistema frente a las dudas levantadas en auditorías previas.
- Decisión: La tabla canónica going forward es **`stores`**. La tabla `profiles` queda relegada exclusivamente para datos de configuración de la cuenta del merchant. La relación oficial es 1:1 (`auth.users → profiles → stores`). Cada tienda adopta un `template_type` ('food', 'comercio', 'moda') que cambia radicalmente el flujo de ventas (ej: sin carrito, con pagos, con variantes obligatorias).

### [RESUELTO] Inconsistencia de Nomenclatura (user_id/store_id/merchant_id)

- Contexto: El mismo UUID que representa la identidad es llamado indistintamente en el esquema y en el código como `user_id` (en `products`), `store_id` (en `product_variants`, `store_leads`) y `merchant_id` (en `orders`).
- Estado: `orders.store_id`, `product_variants.store_id` y `store_leads.store_id` apuntan a `stores`; `products.user_id` se conserva por compatibilidad pero también referencia `stores.id`. Las políticas RLS resuelven propiedad exclusivamente con `stores.owner_id`.

### [RESUELTO] Migración Masiva profiles → stores

- Script existente: `scripts/migrate_profiles_to_stores.ts` — ya estaba en el repositorio.
- **Problema crítico del script existente:** Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` en lugar de `SUPABASE_SERVICE_ROLE_KEY`. Esto hace que el script falle en producción porque la ANON_KEY está bloqueada por RLS y no puede leer perfiles de otros merchants.
- **Riesgo ROJO RESUELTO:** `delivery_orders.store_id` fue corregido para apuntar a `stores(id)` con `ON DELETE CASCADE`, evitando que la futura deprecación de `profiles` elimine registros históricos de delivery por cascada.
- **Riesgo MEDIO RESUELTO:** El CHECK constraint de `stores.template_type` fue alineado con el modelo real `'food'`, `'comercio'`, `'moda'`.
- Script SQL revisado y documentado: `migration_analysis.md` (en raíz del repo).
- Estado: Migración ejecutada en producción el 2026-06-05. Verificación documentada: 7 filas en `stores`, 7 filas en `store_config`, 54 productos de BarRes accesibles, 76 órdenes de `delivery_orders` intactas y 0 merchants con `slug` o `store_name` nulos.

### [RESUELTO] Discrepancia de Nomenclatura Vercel: link-ventas vs enlace-ventas

- Contexto: Existía confusión debido al uso del repo `link-ventas-app` y la existencia de despliegues duplicados en Vercel.
- Decisión: Se eliminó el proyecto duplicado "enlace-ventas" de Vercel (el cual apuntaba al mismo repositorio y causaba builds duplicados en cada push).
- Estado oficial verificado en `.vercel/project.json`: el proyecto canónico de
  Vercel es **`link-ventas-app`**. El codebase `AGODDDD/link-ventas-app`
  abastece a esta única instancia en producción.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Razones exactas originales por las que no se implementó un ORM o sistema de migraciones real.
- DESCONOCIDO: Si la persistencia del carrito con Zustand fue elegida específicamente sobre Redis/KV por un tema de costos.

### [2026-08-08] Suscripciones Pro: aislamiento por entorno y cierre por webhook

- **Contexto**: La validación del Plan Pro distinguió el checkout de Production
  del sandbox de Preview y mostró que Mercado Pago bloquea el autopago del
  vendedor.
- **Decisión**: Mantener credenciales de plataforma separadas por entorno. En
  Production, una compra controlada debe usar un comprador real distinto del
  vendedor y el e-mail de Mercado Pago debe coincidir con el `payer_email` de
  la cuenta autenticada en LinkVentas. En sandbox, usar únicamente una
  aplicación de prueba y un comprador de prueba.
- **Razón**: Evita mezclar fondos o secretos entre entornos y respeta la
  validación de identidad que hace Mercado Pago en suscripciones.
- **Consecuencias**: No se declara listo el flujo Pro hasta observar una
  autorización sandbox y sus eventos firmados de punta a punta. El ticket
  `WCS-45319` queda como dependencia externa para resolver el e-mail de la
  cuenta compradora de prueba.

### [2026-08-13] Suscripciones Pro: no inferir la compatibilidad sandbox

- **Contexto**: La prueba Preview alcanzó Confirmar con comprador TEST y saldo
  ficticio, pero Mercado Pago rechazó el flujo antes del cobro por una mezcla de
  entornos. El panel de la aplicación muestra credenciales `TEST-`, mientras
  soporte pide `APP_USR` para Suscripciones.
- **Decisión**: No sustituir ni probar secretos por conjetura. Mantener Preview
  aislado, conservar la preaprobación fallida como cancelada y pedir la
  configuración exacta al proveedor mediante `WCS-45319`.
- **Razón**: Un prefijo de credencial no prueba por sí mismo que esté asociado
  al vendedor TEST correcto; un cambio especulativo puede mezclar sandbox y
  Production o repetir rechazos sin generar evidencia útil.
- **Consecuencias**: No se puede declarar E2E Pro ni promover cambios de
  facturación hasta verificar webhook firmado, cargo PEN aprobado, activación
  idempotente y cancelación. El detalle operativo está en
  `VALIDACION_SANDBOX_MERCADO_PAGO_2026-08-13.md`.

### [2026-08-10] Incorporación contextual integrada al producto

- **Contexto**: Una introducción única al dashboard no enseñaba cómo operar
  Pedidos, Clientes, Productos, Analytics ni las siete áreas de Configuración.
- **Opciones evaluadas**: checklist estática, servicio externo de product tours
  y recorrido nativo integrado a las rutas existentes.
- **Decisión**: Implementar una guía nativa por sección, con objetivos semánticos
  `data-tour`, persistencia local versionada y repetición manual desde la barra
  superior o el menú móvil.
- **Razón**: Mantiene el copy y la interacción alineados con el producto real,
  evita una dependencia de terceros y permite adaptar Configuración a cada
  pestaña sin almacenar secretos ni nuevos datos de perfil.
- **Diseño**: Superficie clara, azul funcional, texto oscuro y verde solo para
  progreso. Se excluyen morados, gradientes, brillos y símbolos asociados a IA.
- **Consecuencias**: El progreso no se sincroniza entre dispositivos. Cada
  modificación estructural del dashboard debe conservar o actualizar sus
  selectores y pasar una revisión manual de escritorio/móvil.
