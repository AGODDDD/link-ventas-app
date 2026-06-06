# Mapa de navegación del proyecto

Este documento detalla la estructura física del repositorio LinkVentas.

## Árbol de Carpetas Principal

- `/app`: Rutas del sistema (Next.js 15 App Router).
- `/components`: Componentes visuales de React reutilizables (Dashboard, Tienda, UI genérica).
- `/hooks`: Custom React Hooks (ej: `useFomo.ts`).
- `/lib`: Utilidades, helpers y clientes (Supabase, cifrado, PDFs, impresión térmica).
- `/scripts`: Scripts de mantenimiento del proyecto (ej: `doctor.ts`).
- `/store`: Gestores de estado global (Zustand).
- `/public`: Archivos estáticos.
- `/types`: Definiciones de TypeScript.
- `/migrations`: (Inferido) Carpeta vacía o residual; las migraciones se manejan vía SQL.

## Archivos y Módulos Críticos

### Backend & API
- `app/api/webhooks/culqi/route.ts`: Endpoint seguro para recibir confirmaciones de pago.
- `lib/supabaseServer.ts`: Cliente de Supabase con permisos privilegiados (`service_role`).
- `lib/encryption.ts`: Funciones de cifrado para proteger llaves de pasarelas de pago (`PAYMENT_ENCRYPTION_KEY`).

### Tienda (Frontend Público)
- `app/tienda/[id]/page.tsx`: Landing de la tienda del merchant (resolución por `slug` o `uuid`).
- `app/tienda/[id]/checkout/page.tsx`: Flujo de cobro y registro de órdenes. **CRÍTICO**.
- `components/tienda/FomoBanner.tsx`: Módulo de persuasión (Social Stock).
- `store/useCartStore.ts`: Estado global del carrito de compras (Zustand).

### Dashboard (Frontend Administrativo)
- `app/dashboard/page.tsx`: Vista principal de ventas y estados del merchant.
- `app/dashboard/configuracion/page.tsx`: Configuración del perfil, FOMO y llaves de Culqi.
- `components/dashboard/ThermalReceipt.tsx`: Generador de tickets para impresoras térmicas.

### Configuración del Proyecto
- `seguridad_supabase.sql`: Script maestro para configuración de BD (Tablas, Columnas, RLS). **SISTEMA PROTEGIDO**.
- `scripts/doctor.ts`: Herramienta de auditoría para verificar la BD vs Código.
- `package.json`: Dependencias (`@supabase/ssr`, `html2canvas`, `pdfkit`, `zustand`).

## Archivos Protegidos (NO MODIFICAR sin revisión extrema)
1. `seguridad_supabase.sql` (Puede romper producción y el RLS).
2. `lib/encryption.ts` (Corrompe las llaves de pasarela de los merchants si se cambia el algoritmo).
3. `app/api/webhooks/culqi/route.ts` (Riesgo de fraude financiero si se altera erróneamente).

---
## Campos que requieren verificación manual
- DESCONOCIDO: Contenido exacto de la carpeta `/migrations` (si se usa realmente o está obsoleta en favor de `seguridad_supabase.sql`).
- DESCONOCIDO: Módulos bajo `/app/admin` (si existe un panel interno para los dueños de LinkVentas).
