# Guía de incorporación contextual

Última actualización: **2026-08-10**.

## Objetivo

LinkVentas incorpora una visita guiada contextual para que un comerciante pueda
entender cada área del dashboard mientras observa los controles reales. No es
una checklist estática: el recorrido resalta elementos de la interfaz, explica
su propósito y cambia su contenido según la ruta actual.

La guía evita pasos ficticios y no marca configuraciones como completas. Su
función es enseñar qué revisar y dónde realizar cada acción; los datos reales
siguen siendo la fuente de verdad del producto.

## Cobertura

| Área | Pasos | Contenido principal |
| --- | ---: | --- |
| Dashboard | 5 | métricas, creación de producto, pedidos recientes y tienda pública |
| Pedidos | 4 | búsqueda, filtros, vistas y operación de cada venta |
| Clientes | 5 | compradores, oportunidades, recurrencia, valor y seguimiento |
| Productos | 4 | creación/importación, visibilidad, stock, edición y eliminación |
| Analytics | 5 | periodo, exportación, indicadores, alertas y tendencias |
| Configuración | 10 | cuenta, identidad, plantilla, diseño, pagos, logística, marketing, contenido y revisión final |
| Crear/editar producto | 5 | información, precio, inventario, imágenes, variantes y guardado |

Total actual: **38 pasos contextuales**.

## Comportamiento por sección

`components/dashboard/ProductTour.tsx` selecciona el recorrido mediante
`usePathname`. Cada sección guarda su propio estado en `localStorage` con una
clave versionada por usuario y área:

```text
linkventas:product-tour:<version>:<user_id>:<section_id>
```

- La guía se abre automáticamente la primera vez que ese usuario visita una
  sección desde el navegador actual.
- `completed` indica que terminó el recorrido; `skipped` evita volver a abrirlo
  automáticamente.
- El usuario siempre puede repetir la guía de la sección actual desde el botón
  **Guía** de la barra superior.
- En móvil se conserva **Visita guiada** en el menú lateral, porque la barra
  superior de escritorio no está visible.
- Cambiar la versión de un recorrido permite volver a mostrar una mejora
  material sin borrar otras preferencias del usuario.

La persistencia es deliberadamente local. No sincroniza el progreso entre
dispositivos y no crea tablas ni datos de perfil en Supabase.

## Recorrido de Configuración

El centro de cuenta carga de forma independiente de los ajustes de tienda y conserva sus datos y la edición en curso al cambiar de pestaña. La identidad y el plan se muestran inmediatamente desde la sesión compartida, sin esperar otra consulta. La actualización ocurre en segundo plano; sólo el estado de privacidad muestra una espera y, si falla, **Reintentar**. Las acciones de guardar el nombre o solicitar eliminación esperan la verificación del servidor; el borrador del nombre se conserva aunque llegue una respuesta durante la edición. Los ajustes tienen su propio estado de carga y reintento. La información se vuelve a consultar al entrar nuevamente en la ruta de Configuración.

Validación de esta carga: 49 pruebas unitarias, build de producción y navegación Chromium con respuestas simuladas (perfil visible antes de una respuesta de cuenta retrasada tres segundos y antes de terminar la configuración, tres cambios de pestaña sin repetir la consulta, borrador conservado al llegar la respuesta, acciones de privacidad bloqueadas hasta verificar su estado, identidad visible ante errores, recuperación con reintento y navegación móvil). La latencia con una sesión real depende de la respuesta del servidor y no se mide con esta prueba simulada.

Configuración necesita una guía más profunda porque contiene siete pestañas.
Cada paso puede declarar `settingsTab`; al entrar en ese paso,
`ProductTour.tsx` emite:

```text
linkventas:tour-setting-tab
```

`app/dashboard/configuracion/page.tsx` escucha el evento, valida que el ID
pertenezca a `TABS` y activa la pestaña correspondiente. El recorrido enseña:

1. Estado de cuenta y plan.
2. Logo, nombre, slug y descripción pública.
3. Diferencias entre Comercio, Restaurante y Moda.
4. Portada, Hero y colores de marca.
5. Métodos manuales y Mercado Pago.
6. Delivery, recojo, cobertura, horarios y condiciones por plantilla.
7. Redes sociales, WhatsApp y señal de stock real.
8. Promociones, beneficios y preguntas frecuentes.
9. Guardado de cambios y revisión de la tienda pública.

El cambio de pestañas durante la guía no modifica ni guarda valores. Los datos
del formulario permanecen en memoria hasta que el usuario elige **Guardar
cambios** o **Descartar**.

## Presentación y accesibilidad

La visita usa una superficie blanca, texto gris oscuro y azul funcional. Verde
se reserva para pasos ya recorridos. No utiliza morados, gradientes, brillos ni
iconografía asociada a asistentes de IA.

- El objetivo activo conserva un área visible mediante cuatro capas alrededor
  del elemento y un borde azul de enfoque.
- Si un objetivo no existe por plan, datos o tamaño de pantalla, la explicación
  se presenta centrada sin bloquear el recorrido.
- En móvil, los objetivos ocultos del menú de Configuración se sustituyen por el
  selector visible.
- El diálogo declara `role="dialog"`, `aria-modal="true"` y nombres accesibles.
- `Escape` omite la guía; las flechas izquierda/derecha retroceden o avanzan.
- Los botones ofrecen estados hover, active y etiquetas legibles.

## Puntos de integración

- `app/dashboard/layout.tsx`: monta una sola instancia por sesión autenticada.
- `components/dashboard/ProductTour.tsx`: configuración, spotlight, progreso y
  persistencia.
- `components/dashboard/DashboardTopBar.tsx`: botón **Guía** de escritorio.
- `components/DashboardSidebar.tsx`: acceso móvil y respaldo de navegación.
- `data-tour` e IDs en las páginas del dashboard: objetivos estables del
  recorrido. Estos atributos no contienen información sensible.

## Mantenimiento

Al cambiar la estructura de una sección:

1. Conservar o actualizar su selector `data-tour`.
2. Revisar el texto para que describa una función existente.
3. Evitar depender de clases de Tailwind o posiciones `nth-child`; son menos
   estables que un atributo semántico.
4. Incrementar la versión solo cuando sea necesario volver a presentar el
   recorrido a usuarios que ya lo completaron.
5. Verificar escritorio y móvil, temas claro/oscuro y estados con/sin datos.

## Verificación

Antes de publicar cambios en la guía:

```bash
npm run lint
npm run test:unit
npm run build
git diff --check
```

Comprobación manual mínima:

1. Abrir cada ruta desde una cuenta autenticada.
2. Confirmar que la primera visita inicia el recorrido una sola vez.
3. Completar y repetir desde **Guía**.
4. En Configuración, comprobar el cambio automático de las siete pestañas.
5. Confirmar que omitir no vuelve a abrir la guía automáticamente.
6. Probar navegación con teclado y una pantalla móvil.
7. Verificar que recorrer Configuración no guarda ni descarta cambios.

## Historial de entrega

- `1887b07`: primera visita guiada y rediseño de acceso versionados en `main`.
- `43908b7`: cobertura contextual para todas las áreas del dashboard.
- `6c4f661`: guía avanzada de Configuración y acceso **Guía** en la barra
  superior.

Los tres cambios fueron desplegados por la integración de Git de Vercel y
alcanzaron estado `Ready` en Production.
