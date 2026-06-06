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
Ventas generadas en la tabla core nueva. Producción fue verificada vía `select(col).limit(0)` el 2026-06-05.

Columnas reales verificadas en producción:
- `id` (UUID): Identificador del pedido.
- `store_id` (UUID): Tienda dueña de la orden.
- `order_type` (text): Tipo de pedido (`delivery`, `pickup`, `standard` según `migrations/002_core_schema.sql`).
- `status` (text): Estado del pedido.
- `customer_name` (text): Nombre del cliente.
- `customer_phone` (text): Teléfono del cliente.
- `customer_email` (text): Email del cliente.
- `direccion` (text): Dirección de entrega.
- `referencia` (text): Referencia de entrega.
- `lat` (double precision): Latitud de entrega.
- `lng` (double precision): Longitud de entrega.
- `delivery_fee` (numeric): Costo de delivery.
- `estimated_time` (text): Tiempo estimado.
- `subtotal` (numeric): Monto subtotal de la orden.
- `total` (numeric): Monto total de la orden.
- `metodo_pago` (text): Método de pago.
- `payment_proof_url` (text): Comprobante o identificador de pago.
- `legacy_id` (text): ID histórico usado para trazabilidad con `delivery_orders`.
- `created_at` (timestamp): Fecha de creación.
- `updated_at` (timestamp): Fecha de actualización.

Columnas confirmadas como NO existentes en producción:
- `merchant_id`
- `customer_address`
- `total_amount`
- `items`

### `store_leads`
Contactos capturados para remarketing (carritos abandonados).
- `id` (UUID): Identificador (Inferido).
- `store_id` (UUID): Tienda dueña del lead (Inferido de RLS `auth.uid() = store_id`).
- `customer_phone` (text): Teléfono del cliente (Inferido de README).
- `metadata` (JSONB): Datos adicionales del lead (Inferido).

### `delivery_orders`
Órdenes específicas del flujo legacy de delivery/restaurante.
- `store_id` (UUID): Tienda dueña de la orden. FK corregida en producción para apuntar a `stores(id)` con `ON DELETE CASCADE`.
- `status` (text): Estado de la orden.
- `created_at` (timestamp): Fecha de creación.

### Tablas Adicionales (No documentadas inicialmente)
- `abandoned_carts`: Almacena carritos de compras no completados (Inferido del nombre).
- `delivery_settings`: Configuración de delivery por tienda (Inferido del nombre).
- `menu_categories`: Categorías para organizar el catálogo de productos (Inferido del nombre).
- `order_items`: Productos individuales dentro de una orden (Inferido del nombre).
- `order_items_legacy`: Histórico/respaldo de items de órdenes antiguas (Inferido del nombre).
- `orders_legacy`: Histórico/respaldo de órdenes antiguas (Inferido del nombre).
- `product_variants`: Variaciones específicas de un producto (Inferido del nombre).
- `store_config`: Configuración adicional extendida de la tienda (Inferido del nombre).
- `stores`: Entidad de tiendas separada de perfiles, con slug propio (Inferido del nombre).

## Relaciones
**NOTA DE DEUDA TÉCNICA (Identidad del Merchant):**
Todas las tablas satélite apuntan al mismo UUID de `auth.users`, pero utilizan nombres de columna inconsistentes que generan mezcla en el código:
- `products` usa `user_id`
- `orders` usa `store_id` en producción; `merchant_id` aparece en código/documentos legacy pero no existe en la tabla real verificada el 2026-06-05.
- `store_leads`, `delivery_orders` y `product_variants` usan `store_id`.

```text
auth.users (1) --- (1) profiles / stores
profiles/stores (1) --- (N) products (user_id)
profiles/stores (1) --- (N) orders (store_id)
profiles/stores (1) --- (N) store_leads (store_id)
stores (1) --- (N) delivery_orders (store_id)
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
  - SELECT: DESCONOCIDO en producción. La documentación legacy menciona `merchant_id`, pero esa columna no existe; código actual también consulta `store_id` para flujo core.
- **`store_leads`:**
  - INSERT: Público (`WITH CHECK true`).
  - SELECT: Solo el merchant (`USING auth.uid() = store_id`).

## Índices
- `abandoned_carts`: `idx_abandoned_carts_expires` (`expires_at`) — limpieza de carritos expirados (verificado).
- `delivery_orders`: `idx_delivery_orders_date` (`created_at`) (verificado).
- `delivery_orders`: `idx_delivery_orders_status` (`store_id`, `status`) (verificado).
- `delivery_orders`: `idx_delivery_orders_store` (`store_id`) (verificado).
- Para las demás tablas, se asume la existencia de índices primarios.

## Edge Functions
- **No se detectaron** Edge functions de Supabase en uso. El código utiliza API Routes de Next.js (`app/api/*`).

## Storage Buckets
- `comprobantes`: Privado, 2 políticas, 50MB, any mime (verificado).
- `avatars`: Público, 2 políticas, 50MB, any mime (verificado).
- `productos`: Público, 5 políticas, 50MB, any mime (verificado).

---
## Campos que requieren verificación manual
*(Todos los campos críticos iniciales han sido verificados).*
