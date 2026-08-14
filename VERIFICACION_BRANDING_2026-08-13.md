# Verificación de branding — 2026-08-13

## Alcance

Verificación posterior al despliegue del sistema de marca LinkVentas publicado
en `main` con el commit `9f64e67`.

Se revisaron la home pública, el símbolo SVG, el manifest y la imagen social.
Las rutas autenticadas (login, dashboard, Pro y administración) comparten el
componente `LinkVentasLogo`, pero requieren una revisión humana con sesión para
evaluar su composición final en cada viewport.

## Evidencia técnica

| Elemento | Evidencia | Resultado |
| --- | --- | --- |
| Despliegue | Vercel `dpl_AKrupLfUqdeohCR2t9cBoNUKunHA`, target Production | Conforme |
| Home | `https://link-ventas-app.vercel.app/` devolvió HTTP 200 | Conforme |
| Símbolo público | `/brand/linkventas-mark.svg` devolvió HTTP 200 y `image/svg+xml` | Conforme |
| Imagen social | `/opengraph-image` devolvió HTTP 200 y `image/png` | Conforme |
| Metadatos | La home publicada expone title, description, Open Graph, Twitter, manifest y favicon SVG de LinkVentas | Conforme |
| Componente reutilizable | `components/brand/LinkVentasLogo.tsx` centraliza el símbolo y lockup para React | Conforme |

## Inspección del artefacto social

La imagen Open Graph publicada mide 1200×630 px y comunica, en este orden:
nombre, promesa operativa, explicación breve y símbolo. El signo conserva los
dos eslabones ascendentes sobre un contenedor azul profundo; el layout tiene
aire suficiente para recortes de redes habituales.

## Contraste calculado

Relaciones calculadas con WCAG sobre los tokens publicados:

| Par de color | Relación | Uso aprobado |
| --- | --- | --- |
| `#102A4C` sobre `#FCFCFC` | 14.04:1 | Titulares y texto |
| `#245DA8` sobre blanco | 6.55:1 | CTA y texto |
| `#087A58` sobre blanco | 5.34:1 | Estados de éxito y texto |
| `#2F7EDA` sobre blanco | 4.10:1 | Símbolo, iconografía, bordes y texto grande; no usar como cuerpo de texto pequeño sobre blanco |
| Blanco sobre `#102A4C` | 14.41:1 | Fondos oscuros |

## Resultado

**Conforme técnicamente.** Los assets, metadatos y home de producción sirven
la identidad aprobada. La evaluación de composición visual autenticada queda
pendiente de una sesión de negocio; no se declara realizada por inferencia.

## Verificación manual pendiente

1. Revisar home y login en 360, 768, 1024 y 1440 px.
2. Iniciar sesión de prueba y revisar dashboard, banner Pro, analítica bloqueada
   y menú móvil en modo claro y oscuro.
3. Confirmar legibilidad del símbolo a 16, 24 y 32 px sobre blanco, carbón y
   foto de baja complejidad.
4. Antes de fijar canonical y `metadataBase`, confirmar el dominio comercial y
   razón social definitivos de LinkVentas.

## Próximo paso recomendado

Con la revisión visual autenticada cerrada, crear el kit externo de marca:
favicon PNG, avatar de redes, portada, plantilla de publicación y piezas de
campaña basadas en el símbolo ya aprobado.
