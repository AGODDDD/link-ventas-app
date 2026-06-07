# Historial de cambios

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere vagamente a Semantic Versioning.

## [2026-06-07]
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
