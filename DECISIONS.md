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

### [En curso] Migración de profiles → stores como identidad del merchant

- Contexto: el sistema usa profiles como tabla principal del merchant, pero existe una tabla stores separada con estructura similar
- Estado: migración parcial, ambas tablas coexisten actualmente  
- Riesgo: agentes futuros pueden confundirse sobre cuál tabla usar
- Decisión pendiente: definir tabla canónica y deprecar la otra
- Acción requerida por el usuario: confirmar cuál es la tabla oficial going forward

### [RESUELTO] Discrepancia de Nomenclatura Vercel: link-ventas vs enlace-ventas

- Contexto: Existía confusión debido al uso del repo `link-ventas-app` y la existencia de despliegues duplicados en Vercel.
- Decisión: Se eliminó el proyecto duplicado "enlace-ventas" de Vercel (el cual apuntaba al mismo repositorio y causaba builds duplicados en cada push). 
- Estado Oficial: El proyecto oficial y canónico en Vercel es **"link-ventas"** bajo el dominio `link-ventas-app.vercel.app`. El codebase `AGODDDD/link-ventas-app` abastece a esta única instancia en producción.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Razones exactas originales por las que no se implementó un ORM o sistema de migraciones real.
- DESCONOCIDO: Si la persistencia del carrito con Zustand fue elegida específicamente sobre Redis/KV por un tema de costos.
