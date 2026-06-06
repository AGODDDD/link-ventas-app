# Fuente única de verdad sobre la base de datos

Este documento describe el esquema de base de datos de LinkVentas en Supabase, inferido a partir de `seguridad_supabase.sql` y `scripts/doctor.ts`.

## Tablas Principales

### `profiles`
Contiene la configuración general del merchant/tienda.
- `id` (UUID): Identificador único ligado a `auth.users` (Inferido por política RLS `auth.uid() = id`).
- `slug` (text, UNIQUE): URL amigable para la tienda (Ej: `/tienda/mi-marca`).
- `store_name` (text): Nombre del comercio (Inferido de uso en `app/pendiente/page.tsx`).
- `plan` (text): Plan de facturación interno ('trial', 'free', 'pro', 'inactivo') (Inferido).
- `plan_expires_at` (timestamp): Fecha de expiración del plan Pro (Inferido).
- `culqi_active` (boolean): Indica si la pasarela Culqi está activa (Inferido).
- `culqi_secret_key` (text): Llave secreta encriptada (Inferido).
- `fomo_enabled` (boolean): Activa/Desactiva el motor FOMO.
- `fomo_min_viewers` (integer): Rango mínimo del motor FOMO.
- `fomo_max_viewers` (integer): Rango máximo del motor FOMO.
- `fomo_message` (text): Mensaje a mostrar, usa `{count}` como variable.
- `template_type` (text): Tipo de plantilla, default 'comercio'.
- `horario` (text): Horario de atención.
- `direccion` (text): Dirección física.
- `whatsapp_phone` (text): Teléfono para orders manuales (Inferido de README).
- `whatsapp_order_template` (text): Plantilla para mensaje de WhatsApp.

### `products`
Catálogo de productos de cada tienda.
- `id` (UUID): Identificador único (Inferido).
- `user_id` (UUID): Merchant dueño del producto (Inferido de RLS `auth.uid() = user_id`).
- `name` (text): Nombre del producto (Inferido).
- `price` (numeric): Precio del producto (verificado).
- `brand` (text): Marca o categoría (Inferido).
- `stock` (integer): Inventario disponible.
- `variants` (JSONB): Variantes del producto (tallas, colores).
- `is_available` (boolean): Si el producto está a la venta.
- `preparation_time` (text): Tiempo de preparación.
- `gallery` (text[]): URLs de imágenes adicionales.
- `image_url` (text): Imagen principal (Inferido).

### `orders`
Ventas generadas.
- `id` (UUID): Identificador del pedido (Inferido).
- `merchant_id` o `store_id` (UUID): Tienda dueña de la orden (Inferido de RLS `auth.uid() = merchant_id` y webhook webhook).
- `customer_name` (text): Nombre del cliente (Inferido).
- `subtotal` (numeric): Monto subtotal de la orden (verificado).
- `total_amount` / `total` (numeric): Monto total de la orden (verificado).
- `status` (text): Estado de la orden ('pending', 'paid', etc) (Inferido).
- `order_type` (text): 'delivery' u otros.
- `delivery_address` (text): Dirección de entrega.
- `payment_proof_url` (text): Comprobante o identificador de pago ('CONTRA_ENTREGA', 'WHATSAPP_LINK', 'CULQI_AUTOMATIC').

### `store_leads`
Contactos capturados para remarketing (carritos abandonados).
- `id` (UUID): Identificador (Inferido).
- `store_id` (UUID): Tienda dueña del lead (Inferido de RLS `auth.uid() = store_id`).
- `customer_phone` (text): Teléfono del cliente (Inferido de README).
- `metadata` (JSONB): Datos adicionales del lead (Inferido).

## Relaciones

```text
auth.users (1) --- (1) profiles
profiles (1) --- (N) products
profiles (1) --- (N) orders
profiles (1) --- (N) store_leads
```

## Políticas RLS (Row Level Security)

- **`profiles`:** 
  - SELECT: Público (`USING true`).
  - UPDATE: Solo el merchant (`USING auth.uid() = id`).
- **`products`:**
  - SELECT: Público (`USING true`).
  - ALL: Solo el merchant (`USING auth.uid() = user_id`).
- **`orders`:**
  - INSERT: Público (`WITH CHECK true` - para que los clientes puedan comprar).
  - SELECT: Solo el merchant (`USING auth.uid() = merchant_id`).
- **`store_leads`:**
  - INSERT: Público (`WITH CHECK true`).
  - SELECT: Solo el merchant (`USING auth.uid() = store_id`).

## Índices
- **DESCONOCIDO**: No hay evidencia de índices explícitos creados más allá de los primarios/únicos (`slug UNIQUE`).

## Edge Functions
- **No se detectaron** Edge functions de Supabase en uso. El código utiliza API Routes de Next.js (`app/api/*`).

## Storage Buckets
- `comprobantes`: Privado, 2 políticas, 50MB, any mime (verificado).
- `avatars`: Público, 2 políticas, 50MB, any mime (verificado).
- `productos`: Público, 5 políticas, 50MB, any mime (verificado).

---
## Campos que requieren verificación manual
- DESCONOCIDO: Si existen índices adicionales en la DB para rendimiento.
