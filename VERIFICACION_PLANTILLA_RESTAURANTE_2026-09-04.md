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
- La tarjeta de WhatsApp usa la primera imagen disponible del catálogo (o la
  portada del comercio) como apoyo visual, sin fijar imágenes de una tienda
  particular. La franja de confianza conserva la composición de tres mensajes
  y marcas de pago de la referencia.
- El nombre del comercio ya no se repite en una ficha fija de la barra superior:
  el lateral usa `avatar_url` como logo propio y conserva un monograma de
  respaldo sólo para tiendas que aún no configuraron logo. El lateral mide 266
  px, el hero ocupa el ancho disponible y la franja de confianza deja espacio
  para el carrito flotante en escritorio amplio.
- **Mis pedidos** se mantiene como acción secundaria en el lateral y en móvil;
  no se eliminó al simplificar la navegación principal.
- La franja de confianza presenta las garantías y los medios de pago como dos
  grupos independientes. Los distintivos de Visa, Mastercard, Yape, Plin y
  efectivo respetan la composición visual de la referencia: Yape conserva su
  acento turquesa superior y Plin su círculo turquesa, sin recursos remotos.

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
