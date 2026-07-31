# Documentación técnica

El storefront carga solo tiendas activas, calcula el carrito en el cliente y crea pedidos mediante `/api/orders`. El servidor recalcula precio y stock en PostgreSQL.

Mercado Pago tokeniza tarjetas en el cliente y el backend inicia el cobro. El webhook validado contra la API de Mercado Pago es la única fuente para aprobar pagos y activar Pro.

El dashboard consulta `orders` y usa la RPC `transition_order_status`; no puede actualizar estados arbitrariamente.
