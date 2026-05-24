# LinkVentas ⚡

Plataforma SaaS de e-commerce de alto rendimiento. Convierte tus enlaces en una tienda kinetica, profesional y optimizada para la conversión en segundos.

## 🌟 Características Principales

-   **Tienda Kinetica**: Diseño brutalista y fluido enfocado en productos premium.
-   **Dashboard Analytics**: Visualización en tiempo real de ingresos, leads y ticket promedio.
-   **Motor FOMO (Social Stock)**: Generador de urgencia para maximizar ventas.
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
NEXT_PUBLIC_ADMIN_USER_ID=uuid_del_admin
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_solo_servidor
PAYMENT_ENCRYPTION_KEY=64_caracteres_hex_para_cifrar_llaves_culqi
```

`SUPABASE_SERVICE_ROLE_KEY` y `PAYMENT_ENCRYPTION_KEY` deben configurarse solo en el entorno del servidor/Vercel. No deben exponerse en el navegador.

### 3. Configurar Base de Datos
Copia el contenido de `seguridad_supabase.sql` y ejecútalo en el SQL Editor de tu Dashboard de Supabase. Esto configurará todas las tablas y políticas de seguridad (RLS).

### 4. Lanzar el Proyecto
```bash
npm run dev
```

---

## 🩺 Mantenimiento (El Doctor)

Este proyecto incluye un auditor inteligente para asegurar que tu base de datos y tu código estén siempre sincronizados.

Si algo no funciona, corre:
```bash
npx tsx scripts/doctor.ts
```
El "Doctor" analizará tu conexión y te dará los comandos SQL necesarios para arreglar cualquier fallo estructural.

---

## 📚 Documentación Completa

Para detalles profundos sobre la arquitectura, el modelo de datos y los módulos internos, consulta:
👉 **[DOCUMENTACION.md](./DOCUMENTACION.md)**

---

© 2026 LinkVentas - Built for High Conversion.
