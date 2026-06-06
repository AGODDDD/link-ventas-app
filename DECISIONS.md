# Log de decisiones arquitectónicas

### [INICIAL] Uso de Supabase con RLS
- **Contexto**: Necesidad de un backend Serverless multi-tenant rápido y seguro.
- **Opciones evaluadas**: Firebase, AWS RDS custom, Supabase.
- **Decisión**: Se eligió Supabase.
- **Razón**: Permite manejar la separación de tenants a nivel de base de datos usando Row Level Security (RLS) y autenticación integrada.
- **Consecuencias**: Acopla la seguridad de la app a las políticas de PostgreSQL y requiere scripts específicos (`seguridad_supabase.sql`) para mantener los entornos sincronizados.

### [INICIAL] Next.js 15 App Router
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

### [INICIAL] Facturación SaaS Manual
- **Contexto**: Cobro mensual a los merchants por el Plan Pro de LinkVentas.
- **Opciones evaluadas**: Stripe Billing, Cobro manual.
- **Decisión**: Cobro manual por WhatsApp.
- **Razón**: (Inferido) Menor fricción de implementación inicial en un mercado latinoamericano.
- **Consecuencias**: Cuellos de botella operativos para habilitar cuentas. No automatizable masivamente.

### [INICIAL] Validación Zero-Trust Webhook Culqi
- **Contexto**: Recepción de confirmación de pagos de tarjetas.
- **Opciones evaluadas**: Confiar en payload POST vs Consultar API fuente.
- **Decisión**: Consultar directamente a la API de Culqi con el `charge_id`.
- **Razón**: Prevenir manipulación de payloads webhooks por actores maliciosos que falsifiquen IPs.
- **Consecuencias**: Requiere desencriptar en el servidor el `culqi_secret_key` del merchant en cada llamada de webhook entrante.

### [RESUELTO] Modelo Canónico de Identidad y Plantillas (SaaS)

- Contexto: El usuario confirmó el diseño real del sistema frente a las dudas levantadas en auditorías previas.
- Decisión: La tabla canónica going forward es **`stores`**. La tabla `profiles` queda relegada exclusivamente para datos de configuración de la cuenta del merchant. La relación oficial es 1:1 (`auth.users → profiles → stores`). Cada tienda adopta un `template_type` ('food', 'comercio', 'moda') que cambia radicalmente el flujo de ventas (ej: sin carrito, con pagos, con variantes obligatorias).

### [DEUDA TÉCNICA ACTIVA] Inconsistencia de Nomenclatura (user_id/store_id/merchant_id)

- Contexto: El mismo UUID que representa la identidad es llamado indistintamente en el esquema y en el código como `user_id` (en `products`), `store_id` (en `product_variants`, `store_leads`) y `merchant_id` (en `orders`).
- Estado: El usuario ha confirmado que esto **no es un diseño intencional**, sino deuda técnica originada durante la migración del modelo.
- Riesgo: Alta fricción y fragilidad cognitiva para nuevos agentes/desarrolladores.
- Decisión pendiente: Refactorizar y estandarizar la capa de acceso a datos para usar un solo identificador (`store_id`) apuntando a la tabla canónica `stores`.

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
- Estado Oficial: El proyecto oficial y canónico en Vercel es **"link-ventas"** bajo el dominio `link-ventas-app.vercel.app`. El codebase `AGODDDD/link-ventas-app` abastece a esta única instancia en producción.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Razones exactas originales por las que no se implementó un ORM o sistema de migraciones real.
- DESCONOCIDO: Si la persistencia del carrito con Zustand fue elegida específicamente sobre Redis/KV por un tema de costos.
