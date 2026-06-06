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
3. Completa datos personales (registra `store_leads`).
4. Selecciona método de pago:
   - **Manual (Yape/Plin/Efectivo)**: Sube comprobante (opcional). Crea `order` como 'pending' o con proof URL manual.
   - **Culqi**: Inserta tarjeta. Genera token de Culqi. Crea orden como 'pending'.
5. Si es Culqi, el Webhook (`api/webhooks/culqi/route.ts`) es llamado asíncronamente por Culqi.
6. El Webhook verifica el pago consultando a Culqi (Zero-Trust), valida monto y actualiza `status` a 'paid'.

## Flujo de Productos
1. El merchant entra al Dashboard.
2. Sube imagen (va a Supabase Storage bucket `productos`).
3. Crea registro en la tabla `products` enlazando el `user_id`.

## Integración con Supabase
- **Auth**: Gestión de sesiones de los merchants.
- **DB**: Almacenamiento seguro por tenants usando RLS.
- **Storage**: Manejo de imágenes de productos.
- **Realtime / Edge Functions**: **DESCONOCIDO** (No hay evidencia de uso actual intensivo).

## Integración con Vercel
- El sistema está optimizado para Vercel (mencionado en `README.md`).
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
