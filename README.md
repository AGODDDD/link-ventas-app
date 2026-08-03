# LinkVentas ⚡

Plataforma SaaS de e-commerce de alto rendimiento. Convierte tus enlaces en una tienda kinetica, profesional y optimizada para la conversión en segundos.

## 🌟 Características Principales

-   **Tienda Kinetica**: Diseño brutalista y fluido enfocado en productos premium.
-   **Dashboard Analytics**: Visualización en tiempo real de ingresos, leads y ticket promedio.
-   **Disponibilidad real**: Señal de stock limitado basada exclusivamente en el inventario del producto.
-   **Gestión de Órdenes**: Panel de control intuitivo con impresión de tickets térmicos.
-   **CRM de Leads**: Captura automática de contactos para recuperación de carritos abandonados.

## 🚀 Inicio Rápido

### 1. Clonar y Configurar
```bash
git clone [repository-url]
cd link-ventas
npm install
```

### 2. Variables de Entorno
Crea un archivo `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
APP_URL=https://tu-dominio.com
ADMIN_USER_ID=uuid_del_admin
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_solo_servidor
PAYMENT_ENCRYPTION_KEY=64_caracteres_hex_para_cifrar_secretos_de_pago
CRON_SECRET=secreto_largo_aleatorio_para_los_crons_de_vercel
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR_public_key_de_la_plataforma
MP_ACCESS_TOKEN=APP_USR_access_token_solo_servidor_de_la_plataforma
MP_WEBHOOK_SECRET=secreto_de_firma_entregado_por_mercado_pago
```

`SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_ENCRYPTION_KEY`, `CRON_SECRET`, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` deben configurarse solo en el entorno del servidor/Vercel. `MP_WEBHOOK_SECRET` corresponde exclusivamente a la aplicación que cobra el Plan Pro. `NEXT_PUBLIC_MP_PUBLIC_KEY` tokeniza ese cobro. Cada comercio configura desde su dashboard su Public Key, Access Token y firma secreta de Webhooks; ambos secretos se cifran antes de persistirse. `APP_URL` fija el origen HTTPS usado en las notificaciones de pago.

### 3. Configurar Base de Datos
El esquema y RLS se administran exclusivamente con las migraciones versionadas:

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

### 4. Lanzar el Proyecto
```bash
npm run dev
```

### 5. Verificar el código
```bash
npm run lint
npm run test:unit
npm run build
```

La prueba E2E de Mercado Pago solo debe ejecutarse contra sandbox y requiere
`CHECKOUT_STORE_URL`, `MP_TEST_CARD_NUMBER`, `MP_TEST_CARD_EXPIRATION` y
`MP_TEST_CARD_SECURITY_CODE` explícitos. No tiene un destino de producción por defecto.

---

## 📚 Documentación Completa

Para detalles profundos sobre la arquitectura, el modelo de datos y los módulos internos, consulta:
👉 **[DOCUMENTACION.md](./DOCUMENTACION.md)**

---

© 2026 LinkVentas - Built for High Conversion.
