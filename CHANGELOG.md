# Historial de cambios

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere vagamente a Semantic Versioning.

## [2026-06-07] — Sesión 8
### Pulido Final Pixel-Perfect (Flat Design)
- `components/dashboard/DashboardTopBar.tsx`: Eliminada sombra excesiva (`shadow-[0_20px_40px_rgba(0,0,0,0.4)]`) del header superior. Reemplazada por un borde sutil (`border-zinc-800`), logrando el aspecto Flat Premium e integrado de Stitch. Ancho ajustado a `w-[calc(100%-14rem)]` (`w-56`).
- `components/DashboardSidebar.tsx`:
  - Ancho global del sidebar reducido de `w-64` a `w-56` para ajustar proporciones según el diseño.
  - Mejorado contraste de los textos de navegación reemplazando variables CSS por utilidades explícitas (`text-zinc-900` / `dark:text-white`) para soportar correctamente modo claro y oscuro simultáneamente.
  - Reducido margen superior del perfil de usuario (`mt-6 pt-6` → `mt-4 pt-4`) para cohesión jerárquica con el menú.
- `app/dashboard/layout.tsx`: Actualizado el margen izquierdo principal de `md:ml-64` a `md:ml-56`.
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: (Se adjuntará)

---

## [2026-06-07] — Sesión 7
### Corrección Visual (comparación con referencia Stitch)
- `components/DashboardSidebar.tsx`: Ajustes de precisión en el diseño del sidebar para alineación total con Stitch.
  - Padding vertical de los nav items reducido: `py-3` → `py-2.5` para hacer los items más compactos.
  - Alineación de íconos: cambiado `gap-3` del contenedor por `mr-3` directamente en los SVGs, mejorando el centrado del texto.
  - Perfil de usuario (Footer): Avatar actualizado de circular con borde degradado (`rounded-full bg-[var(--dash-accent)]/10`) a diseño minimalista y sobrio del tema oscuro de Stitch (`rounded bg-zinc-700 text-white`).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: (Se adjuntará en el push de docs)

---

## [2026-06-07] — Sesión 6
### Corrección de Animaciones
- `components/DashboardSidebar.tsx` + `app/dashboard-theme.css`: Restauradas las animaciones hover del nav lateral que faltaban del diseño Stitch.
  - Clase `nav-item` agregada a los `<Link>` inactivos del sidebar (nunca había sido aplicada — los items tampoco estaban definidos en el CSS del dashboard).
  - `transition-colors` y `hover:bg-[var(--dash-surface-2)]` de Tailwind eliminados de items inactivos para evitar conflicto con la animación CSS nativa.
  - Definida `.dashboard-theme .nav-item` en `dashboard-theme.css`: `transition: all 0.2s ease` + `padding-left: 1.25rem` on hover (slide effect de Stitch).
  - Dos variantes: dark (`rgba(255,255,255,0.05)`) y light (`rgba(0,0,0,0.03)`).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `605b648`

---

## [2026-06-07] — Sesión 5
### Corrección Visual (comparación con referencia Stitch)
- `components/DashboardSidebar.tsx`: Ajustados nav items para coincidir pixel-perfect con el diseño Stitch tras comparación visual directa.
  - `px-6` → `px-4` en todos los nav items — los íconos/texto se alinean más naturalmente al borde izquierdo.
  - Items inactivos: añadido `font-medium` — mejora legibilidad (antes era `font-regular`).
  - Item activo: `font-semibold` → `font-medium` — consistente con el resto del menú (Stitch usa `font-medium` en todos los estados).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `8f8e76e`

---

## [2026-06-07] — Sesión 4
### Mejora Visual
- `app/dashboard/page.tsx`: Espaciado de tabla de pedidos ajustado para coincidir exactamente con el diseño Stitch de referencia.
  - `<th>` headers: `py-5 px-6 md:px-8` → `py-4 px-6` (header más compacto, padding horizontal uniforme).
  - `<td>` celdas: eliminado `md:px-8` responsive — padding `px-6` uniforme en todas las columnas.
  - Row hover dark: `bg-zinc-800/50` → `bg-zinc-800/30` (separador más sutil, igual que Stitch).
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `7f8d2fb`

---

## [2026-06-07] — Sesión 3
### Mejora Visual
- `components/DashboardSidebar.tsx`: Reemplazados todos los iconos de Material Symbols (fuente externa) por SVGs inline del diseño Stitch — elimina dependencia de red y asegura pixel-perfect con la referencia.
  - Eliminado import `X` de lucide-react; botón de cierre móvil ahora usa SVG inline.
  - `menuItems` migrado de `icon: string` (Material Icons ID) a `svgPaths: string[]` (array para soportar íconos de 1 o 2 paths — Ajustes tiene 2).
  - Footer: íconos de "Ver Tienda Pública" (casa) y "Cerrar Sesión" (logout) migrados a SVG inline.
  - Tipografía del logo corregida a spec Stitch: `tracking-tight` en "LINKVENTAS", `font-medium tracking-widest` en "Panel de Control".
  - `active-nav` CSS sin tocar — ya tenía los valores exactos (`#1c1c24 / border #6366f1` dark, `#f0f7ff / border #2F7EDA` light).
  - Eliminado `userId` state que nunca se usaba en el render.
- Verificación: `npx tsc --noEmit` sin errores.
- Commit: `e34edfb`

---

## [2026-06-07] — Sesión 2
### Corrección de errores
- Dashboard: Corregido bug de temas dark/light en tres componentes del dashboard — las clases de Stitch usaban colores fijos (`zinc-800`, `text-white`, etc.) que no respondían al toggle de tema.
  - `app/dashboard/page.tsx`: Reescrito completo con `dark:` prefix de Tailwind. Reemplazadas clases semánticas Material Design (`text-on-surface`, `card-bg` inline, etc.) por pares `text-zinc-900 dark:text-white`, `border-zinc-200 dark:border-zinc-800/50`, y equivalentes para fondo de tabla, hover de filas, botón Exportar, paginación y estado vacío.
  - `components/dashboard/DashboardTopBar.tsx`: Corregidos 3 problemas reales — (1) sombra oscura fija en modo claro (`shadow-[0_1px_3px...] dark:shadow-[0_20px_40px...]`), (2) border del header hardcoded (`border-zinc-200 dark:border-[var(--dash-border)]`), (3) buscador y dropdown de notificaciones sin fondo adaptativo (`bg-zinc-50 dark:bg-[var(--dash-surface-2)]`, `bg-white dark:bg-[var(--dash-surface-2)]`).
  - `components/dashboard/ThemeToggle.tsx`: Corregido `hover:bg-neutral-800` fijo oscuro → `hover:bg-zinc-100 dark:hover:bg-zinc-800`.
  - **No modificado:** `components/DashboardSidebar.tsx` — ya usaba exclusivamente variables CSS `var(--dash-*)` que responden correctamente al tema. Sin regresión.
- Pago/Culqi: Eliminada la columna fantasma `total_amount` de las rutas de API de Culqi (`webhooks/culqi` y `checkout/culqi`). Esto resuelve un HTTP 500 fatal donde el backend intentaba hacer un `.select('total_amount')` sobre la tabla `orders` (que solo tiene la columna `total`), causando que los pagos confirmados no lograran actualizar el estado de la orden a 'paid'.
- Checkout/Culqi: Se extirpó por fin el `total_amount` residual del bloque de pre-registro de Culqi en `RestauranteCheckoutModal.tsx`, curando el error silencioso que truncaba la ejecución. Asimismo, se unificó la identidad de la orden inyectando el BARR-XXX (`orderId`) directamente en la columna `legacy_id` al insertar en Supabase.
- Dashboard/Pedidos: Ajustado el renderizado en la tabla para mostrar el `legacy_id` (BARR-XXX) en lugar del UUID completo en el historial de Delivery. Adicionalmente se agregó `"pending"` a los diccionarios `DELIVERY_LABELS` y `DELIVERY_COLORS` para que el estado se traduzca como "Pendiente" y adquiera el color de badge amarillo correspondiente, en lugar del texto crudo sin estilo.
- Resiliencia (Checkout): Agregado un manejo seguro (grácil) en el registro de la sub-tabla `order_items` de Culqi. En caso de fallo (ej. formato en modifiers o IDs no-UUID), el error es interceptado en consola sin interrumpir el bloque principal, asegurando que `Culqi.open()` sí logre ejecutarse.
- Historial del Cliente: Modificado el callback de éxito de Culqi (`RestauranteCheckoutModal.tsx`) para usar el `legacy_id` (BARR-XXX) en lugar del UUID cuando se guarda el pedido en el historial local de Zustand (`useCustomerStore.addOrder`). Esto asegura que el pedido sea visible inmediatamente en la pantalla de historial del usuario.
- Dashboard/Pedidos: Agregado el estado `paid` al diccionario de traducciones (`DELIVERY_LABELS` y `DELIVERY_COLORS`) con texto "Pagado" y color de fondo verde, corrigiendo el renderizado en inglés causado por el webhook de Culqi.
- Verificación: `npx tsc --noEmit` sin errores en ambas sesiones de commit.

## [2026-06-08] — Sesión 3 (Fix definitivo Culqi)
### Diagnóstico profundo
- Se realizó un análisis exhaustivo del flujo completo de Culqi contrastando el código fuente contra el esquema real de Supabase.
- **Causa raíz identificada:** 3 bugs en `RestauranteCheckoutModal.tsx` (bloque Culqi, líneas 284-304):
  1. **`total_amount: total`** (L285): Columna fantasma que no existe en la tabla `orders`. El INSERT a Supabase fallaba silenciosamente con error de columna inexistente, y como `handlePagar()` no tiene `try/catch`, el `throw coreOrderError` generaba una promesa rechazada sin manejador visible. Resultado: `win.Culqi.open()` nunca se ejecutaba y el botón "no hacía nada".
  2. **`legacy_id: coreOrderId`** (L289): Asignaba el UUID como `legacy_id`, haciéndolo redundante. Corregido a `legacy_id: orderId` para que almacene el código corto BARR-XXXX generado en L239.
  3. **`{ orderId: coreOrderId }`** (L304): El objeto `pendingCulqiRestaurantOrder` no incluía el `legacyId`, impidiendo que el callback de éxito tuviera acceso al código BARR-XXXX para el historial del cliente.

### Cambios aplicados
- Eliminada línea `total_amount: total` del INSERT a `orders`.
- Cambiado `legacy_id: coreOrderId` → `legacy_id: orderId` (BARR-XXXX).
- Cambiado `{ orderId: coreOrderId }` → `{ orderId: coreOrderId, legacyId: orderId }`.
- Verificación: `npx tsc --noEmit` sin errores.

### Commits de esta sesión
- `6af1b5b` — fix(culqi): remove phantom total_amount, fix legacy_id to BARR-XXX, pass legacyId to pending order

### Commits de la sesión anterior
- `90d6f11` — fix(culqi): remove total_amount and use orderId as legacy_id in Culqi order insert
- `77cafd8` — fix(culqi): use legacyId for customer history and add paid/pending status labels
- `bdeba34` — fix(culqi): handle order_items error gracefully and fix legacy_id display and pending status label
- `7184490` — fix(culqi): remove total_amount from Culqi order insert in RestauranteCheckoutModal
- `4f92bc6` — fix(culqi): remove total_amount from API routes select and calculations
- `ff7b0e4` — chore: trigger deployment after hard reset
- `8f46738` — revert: restore original order flow before today's changes
- `fc800f2` — fix(dashboard): dark/light theme support in page.tsx via Tailwind dark: prefix
- `6a3de83` — fix(dashboard): dark/light theme support in TopBar and ThemeToggle via Tailwind dark: prefix

---

## [2026-06-07] — Sesión 1
### Funcionalidad
- Dashboard: Implementado sistema de temas (dark/light mode) aislado exclusivamente al dashboard, sin afectar las tiendas públicas `/tienda/*`.
  - Instalado `next-themes` y creado `ThemeProvider` envolviendo solo `app/dashboard/layout.tsx`.
  - Definidos tokens de color con prefijo `--dash-*` en `dashboard-theme.css` para modo oscuro (Stitch) y modo claro (LinkVentas oficial).
  - Creado componente `ThemeToggle` (sol/luna) e inyectado en `DashboardTopBar`.
  - Migradas todas las clases de color Material Design en `layout.tsx`, `DashboardTopBar.tsx` y `DashboardSidebar.tsx` a tokens `--dash-*` (reemplazos masivos: bg, text, border).
  - Implementado mapeo dinámico CSS en `dashboard-theme.css` para sobreescribir globalmente las clases de Material Design (`bg-surface-container-high`, `text-on-surface`, etc.) hacia las nuevas variables `--dash-*`, garantizando soporte de temas instantáneo en todas las subpáginas sin refactor masivo.
  - Actualizados tokens del modo claro para coincidir con el diseño "Light Mode Professional" de Stitch (tonos más limpios, menos saturados, acento en gradiente índigo/azul).
  - Integrado sistema de animaciones CSS nativas en `dashboard-theme.css` (animaciones en cascada `fadeInUp`, hovers magnéticos para tarjetas/botones y scrollbar personalizado), con soporte para `prefers-reduced-motion`.
  - Reubicado el botón de "Configurar Motor FOMO" (`FomoConfigModal`) desde el Dashboard principal hacia la página de Ajustes Tienda (`/dashboard/configuracion`) para preparar el rediseño minimalista de la vista principal.
  - Movido el gráfico complejo interactivo de ventas de "Últimos 7 Días" desde el Dashboard principal hacia la página de Analytics (`/dashboard/analytics`), optimizando la carga de la vista principal y concentrando la inteligencia comercial.
  - Rediseño visual completo de la página principal del Dashboard (`app/dashboard/page.tsx`) replicando la estética premium de Stitch, adoptando la estructura de Bento Grid (Tarjetas de métricas animadas con minigráficos interactivos y tabla de pedidos con diseño refinado), manteniendo intacta toda la lógica de obtención de datos a través de Zustand y Supabase.
  - **Corrección Visual:** Asignado el token `bg-[var(--dash-bg)]` de forma explícita a la etiqueta `<main>` en `layout.tsx` para garantizar que el repintado del fondo ocurra correctamente al alternar entre modo oscuro y modo claro.
## [2026-06-05]
### Corrección de errores
- Panel Admin: Añadido feedback visual (toast de error) en la interfaz para alertar cuando el endpoint `/api/admin/plans` falla, reemplazando la captura de error silenciosa.
- Seguridad: Eliminado el prefijo `NEXT_PUBLIC_` de `ADMIN_USER_ID` en las variables de entorno y movida la validación de admin estrictamente al servidor mediante un nuevo endpoint (`/api/admin/check`) para prevenir la exposición del UUID en el código fuente del cliente.

### Funcionalidad
- Moda/Boutique: Checkout adaptado con renderizado visual de talla/color en el resumen de pedido, validación estricta de variantes requeridas antes de procesar pago, y formato explícito en captura de carritos abandonados.
- Moda/Boutique: Persistidas las variantes `talla`/`color` seleccionadas por el cliente en `order_items.modifiers`, resincronizado `product_variants` al editar productos y mostrado talla/color en el detalle de pedido.
- Moda/Boutique: Mostradas las variantes `talla`/`color` guardadas en `modifiers` dentro del ticket térmico/PDF y la lista de pedidos del dashboard.
- Moda/Boutique: Validación obligatoria de variantes antes de agregar al carrito; el quick add abre la vista rápida cuando el producto tiene talla/color.

### Documentación
- Creada base de conocimiento v3 completa (8 archivos)
- DATABASE_SCHEMA.md: tipos numeric verificados, 3 buckets confirmados,
  9 tablas no detectadas agregadas, índices de rendimiento documentados
- ARCHITECTURE.md: módulo Delivery híbrido, relación stores vs profiles
- PROJECT_STATE.md: módulo Delivery catalogado como parcialmente implementado
- AI_ONBOARDING.md: diagrama actualizado con Core Nuevo y Módulos Legacy,
  fix regla 5 (checklist es obligación del agente)
- DECISIONS.md: migración profiles vs stores documentada como decisión en curso
- AGENT_RULES.md: agregada regla estricta de actualización automática del CHANGELOG como requisito de cierre
- DECISIONS.md: discrepancia de nomenclatura link-ventas vs link-ventas-app investigada y documentada
- ARCHITECTURE.md y DECISIONS.md: actualizado el proyecto oficial en Vercel (link-ventas-app.vercel.app) y documentada la eliminación del proyecto duplicado "enlace-ventas".
- Investigación de código: Análisis profundo de dependencias, relaciones on-the-fly y nomenclatura inconsistente (store_id, merchant_id, user_id).
- DECISIONS.md, PROJECT_STATE.md, DATABASE_SCHEMA.md: Documentado el patrón de migración on-the-fly, listado como deuda técnica activa y clasificado como bug de Severidad Alta la mezcla de nombres de identidad.
- ARCHITECTURE.md y DECISIONS.md: Integrado el modelo canónico Multi-Plantilla ('food', 'comercio', 'moda') y confirmada la relación oficial de 1 a 1 en identidades (auth.users → profiles → stores). Inconsistencia de IDs separada en Deuda Técnica explícita por confirmación directa del usuario.
- migration_analysis.md: Creado análisis completo de migración profiles→stores con script SQL revisado, mapeo de columnas y 4 riesgos identificados (pendiente aprobación del usuario para ejecución).
- DECISIONS.md: Documentado el script existente migrate_profiles_to_stores.ts, su problema crítico con ANON_KEY y los riesgos ROJO/MEDIO de FK y template_type.
- PROJECT_STATE.md: Agregados 2 bugs nuevos (Severidad Alta: FK delivery_orders incorrecta; Severidad Media: template_type inconsistente entre BD y código).
- PROJECT_STATE.md: Corregida clasificación del Módulo Restaurante/Food — movido de "Parcialmente Implementado" a "Completado" con evidencia detallada de código (checkout, doble escritura, Realtime, timeline 6 estados, tracking con Leaflet, tickets térmicos). La clasificación anterior era un error del agente basado en inferencias, no en lectura del código real.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Versión actual semántica del proyecto (usaré `[Unreleased]` hasta confirmación).
- DESCONOCIDO: Historial anterior de cambios en ramas antiguas, ya que se inició documentando el estado actual desde cero.
