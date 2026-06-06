# Fuente única de verdad sobre la arquitectura

Este documento describe la arquitectura global del sistema LinkVentas, sus integraciones y decisiones base.

## Arquitectura General

LinkVentas utiliza una arquitectura Full-Stack Serverless basada en **Next.js (App Router)**.
Toda la lógica de backend se resuelve mediante API Routes (`app/api`) y la seguridad se delega a **Supabase (Row Level Security)**.

```text
[Cliente Web (React)]
      |
      |-- (Navegación / Carrito Zustand)
      |
[Next.js App Router] --- API Webhooks (Culqi) ---> [Culqi API]
      |   |
      |   +------------- API Internas (/api/billing, etc)
      |
[Supabase]
  |-- PostgreSQL (Base de datos relacional)
  |-- GoTrue (Autenticación)
  |-- Storage (Buckets para imágenes)
```

## Flujo de Autenticación
1. El merchant ingresa correo y contraseña en el Frontend (`app/login` o equivalente).
2. Se autentica vía `@supabase/ssr` (GoTrue).
3. Supabase emite un JWT que Next.js almacena en cookies.
4. El token se utiliza automáticamente en las consultas de Supabase para aplicar RLS.

## Flujo de Órdenes (Checkout)
1. El cliente entra a `/tienda/[id]` y añade productos al `SlideOverCart` (estado global en `localStorage` vía Zustand).
2. Navega a `/tienda/[id]/checkout`.
3. Completa datos personales (registra `store_leads` y/o `abandoned_carts` de forma temporal si no completa el pago).
4. Selecciona método de pago:
   - **Manual (Yape/Plin/Efectivo)**: Sube comprobante (opcional). Crea `order` como 'pending' o con proof URL manual.
   - **Culqi**: Inserta tarjeta. Genera token de Culqi. Crea orden como 'pending'.
5. Si es Culqi, el Webhook (`api/webhooks/culqi/route.ts`) es llamado asíncronamente por Culqi.
6. El Webhook verifica el pago consultando a Culqi (Zero-Trust), valida monto y actualiza `status` a 'paid'.

## Flujo de Productos
1. El merchant entra al Dashboard.
2. Sube imagen (va a Supabase Storage bucket `productos`).
3. Crea registro en la tabla `products` enlazando el `user_id`. (Soporta `product_variants` para organizar tallas/colores).

## Modelo de Identidad y Multi-Plantilla (SaaS)
LinkVentas es un SaaS multi-plantilla donde cada merchant crea **UNA sola tienda**. El diseño intencional de la base de datos sigue esta relación canónica:
`auth.users (1) → (1) profiles → (1) stores`

- **`stores`**: Es la tabla canónica going forward para la identidad y configuración del comercio.
- **`profiles`**: Se mantiene únicamente para datos de configuración atados a la cuenta del merchant.

Cada tienda pertenece a uno de estos 3 `template_type`:
- **`food` (Restaurante/Food)**: Pedidos por WhatsApp, sin carrito de compras complejo.
- **`comercio` (Comercio General)**: Flujo e-commerce clásico con carrito, checkout y pasarela de pagos.
- **`moda` (Moda/Boutique)**: Incluye look premium y obliga al uso de variantes (talla/color) para los productos.

- **Delivery**: Coexiste un modelo de `orders` general con un modelo heredado/específico en `delivery_orders` y configuraciones en `delivery_settings`. Los tickets y consultas se apoyan en ambos para retrocompatibilidad (evidenciado en `route.ts`).

## Integración con Supabase
- **Auth**: Gestión de sesiones de los merchants.
- **DB**: Almacenamiento seguro por tenants usando RLS.
- **Storage**: Manejo de imágenes de productos.
- **Realtime / Edge Functions**: **DESCONOCIDO** (No hay evidencia de uso actual intensivo).

## Integración con Vercel
- El sistema está optimizado para Vercel (mencionado en `README.md`).
- El proyecto oficial en producción es **link-ventas** (`link-ventas-app.vercel.app`).
- Variables de entorno clave: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_ENCRYPTION_KEY`.

## Integraciones Externas
- **Culqi**: Pasarela de pagos automatizada en Perú. Llave encriptada en BD.
- **WhatsApp**: Enrutamiento para activaciones manuales (SaaS) y envíos de órdenes manuales por el cliente.

## Decisiones Arquitectónicas Importantes
- **Estado Local para Carritos:** Uso de `Zustand` con persistencia en `localStorage` reduce la carga en la BD de Supabase, optimizando costos pero delegando el estado crítico al navegador.
- **Zero-Trust Webhooks:** Verificación doble en pagos automatizados para prevenir manipulación del payload.
- **B2B SaaS Billing Manual:** LinkVentas actualmente gestiona sus cobros de plataforma manualmente por WhatsApp.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Uso exacto de Supabase Realtime para notificaciones en vivo.
- DESCONOCIDO: Proceso completo de creación del token Culqi en el frontend (si usa la librería culqi-js v4).
