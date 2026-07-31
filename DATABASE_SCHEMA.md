# Esquema vigente

`stores` identifica la única tienda de cada cuenta. `store_config` contiene configuración pública y Mercado Pago; `profiles` contiene plan y token cifrado.

`products` pertenece a `stores.id`. Las combinaciones de Moda viven en `product_variants` con `talla`, `color`, `combination_key` y stock propio.

`orders` usa exclusivamente `store_id`, `direccion`, `subtotal`, `delivery_fee`, `total`, `status` y `payment_status`. Las líneas son `order_items`; las reservas son `order_inventory_reservations`.

No existen columnas alternativas de pedidos. Las migraciones de `supabase/migrations` son la fuente de verdad.
