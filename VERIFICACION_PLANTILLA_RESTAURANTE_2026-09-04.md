# Verificación de la plantilla Restaurante — 2026-09-04

## Alcance

Se mantuvo la composición editorial de restaurante: lateral oscuro, hero de
identidad del comercio, categorías horizontales, tarjetas de catálogo y un
carrito flotante. La identidad, imágenes, catálogo, canales y operación siguen
derivándose de `stores`, `store_config`, `products`, `delivery_settings` y
`menu_categories`; no se incorporan datos fijos de una tienda de demostración.

## Capacidades recuperadas y corregidas

- **Mis pedidos** vuelve a estar disponible desde el lateral de escritorio y
  desde el encabezado móvil, además de abrirse después de un checkout exitoso.
- La dirección de entrega y cada tarjeta de producto son controles semánticos
  operables por teclado, con foco visible.
- El agregado rápido no añade artículos agotados ni permite compras cuando el
  componente reciba el modo de solo lectura.
- El texto de pedido mínimo se muestra únicamente cuando el comercio configuró
  un importe positivo. La regla de aceptación continúa siendo validada por
  `app/api/orders/route.ts` en servidor.
- Se retiró el patrón remoto de Unsplash que ya no correspondía a recursos
  usados por la aplicación.

## Validación técnica

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | Correcto |
| `npm run test:unit` | 49 pruebas correctas |
| `npx next build --webpack` | Correcto |
| `git diff --check` | Correcto |
| Contrato de plantilla restaurante | Cubre fuente pública, identidad operacional, acceso a pedidos, accesibilidad y pedido mínimo |

## Límites de esta verificación

- No se ejecutó un pedido real ni un pago; el flujo sensible permanece bajo las
  comprobaciones de servidor y las pruebas controladas de Mercado Pago.
- La comprobación visual final debe hacerse sobre una tienda configurada en
  Production, verificando escritorio y móvil con catálogo, dirección, carrito,
  historial y checkout.

## Archivos de runtime

- `components/tienda/templates/RestauranteTemplate.tsx`
- `lib/restaurantStorefront.ts`
- `next.config.ts`

Los contratos viven en `tests/restauranteTemplateContract.test.ts`. Este
documento y `CHANGELOG.md` son documentación versionada; no son una ruta servida
por la aplicación.
