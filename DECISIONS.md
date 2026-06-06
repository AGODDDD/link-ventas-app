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

### [Pendiente] Discrepancia de Nomenclatura: link-ventas vs link-ventas-app

- Contexto: El repositorio remoto de GitHub está nombrado como `AGODDDD/link-ventas-app`, pero el `package.json`, `README.md` y las variables refieren al proyecto interno como `link-ventas`.
- Estado: Ambos nombres hacen referencia a exactamente el mismo codebase. No existen dos repositorios separados activos para el frontend/backend en esta instancia.
- Riesgo: Agentes y desarrolladores pueden confundirse al buscar el repositorio o al inicializar comandos desde la consola.
- Decisión pendiente: Estandarizar si el nombre del repositorio remoto debe cambiarse a `link-ventas`, o si el `package.json` debe actualizarse a `link-ventas-app` para evitar confusión.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Razones exactas originales por las que no se implementó un ORM o sistema de migraciones real.
- DESCONOCIDO: Si la persistencia del carrito con Zustand fue elegida específicamente sobre Redis/KV por un tema de costos.
