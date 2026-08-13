# Sistema de marca LinkVentas

## Fundamento

**Nombre oficial:** LinkVentas, sin espacio y con V mayúscula.

**Propuesta:** la operación de un negocio, clara y bajo control. LinkVentas
reúne catálogo, pedidos, cobros y datos en una experiencia directa para
comercios que venden en Perú.

**Personalidad:** clara, confiable, cercana y ágil. La comunicación describe
beneficios operativos concretos; no promete automatizaciones, casos de éxito ni
integraciones que no tengan evidencia publicada.

## Sistema visual

El símbolo oficial combina dos eslabones en ascenso: expresa conexión entre la
venta y la operación, con una dirección clara de avance. No representa una
aeronave ni usa sus proporciones; la referencia inicial se tradujo en un signo
propio, simple y legible a tamaños pequeños.

Las versiones aprobadas son vectoriales y se conservan en `public/brand/`:

- `linkventas-mark.svg`: símbolo a color para superficies claras.
- `linkventas-mark-light.svg`: símbolo monocromo para fondos oscuros.
- `linkventas-lockup.svg`: símbolo y nombre para aplicaciones estáticas.

En React, usar `components/brand/LinkVentasLogo.tsx`. No redibujar el símbolo,
no sustituirlo por `LV` y no separar la flecha de los eslabones.

| Rol | Token | Valor |
| --- | --- | --- |
| Acción y confianza | `--brand-700` | `#245DA8` |
| Acción destacada | `--brand-600` | `#2F7EDA` |
| Fondo funcional | `--brand-100` | `#DCE9FA` |
| Éxito confirmado | `--success-600` | `#087A58` |
| Texto profundo | `--brand-950` | `#102A4C` |

- El azul es el color de marca para CTA, enlaces funcionales y Pro.
- El verde se reserva para éxito, pago confirmado y estados positivos; no
  compite como color principal.
- Ámbar y rojo son exclusivamente semánticos: aviso y error.
- Los fondos son off-white o carbón; no se introduce violeta como identidad
  independiente para billing o dashboard.

## Tipografía y voz

- **Titulares:** Space Grotesk, con jerarquía marcada y tracking compacto.
- **Interfaz y cuerpo:** Inter.
- Frases cortas, verbos de acción y español peruano neutral. Ejemplos:
  “Vende más. Administra mejor.”, “Tu operación, clara y bajo control.”
- Evitar superlativos vacíos, emojis como elemento de marca y afirmaciones sin
  prueba. Un escenario ilustrativo debe estar identificado como tal.

## Implementación y verificación

- Los tokens base viven en `app/globals.css`; las vistas de dashboard pueden
  adaptarse a modo claro/oscuro sin cambiar el significado semántico.
- El símbolo está integrado en landing, acceso, dashboard, plan Pro, avisos y
  metadatos. `app/manifest.ts` y `app/opengraph-image.tsx` entregan sus
  variantes de aplicación y social.
- Antes de afirmar un ahorro, mostrar los supuestos de cálculo. La calculadora
  actual usa un ticket ilustrativo de S/ 45 y una comisión de referencia del
  20%; no representa la tarifa de un tercero.

## Verificación manual

- Confirmar que el nombre legal/comercial y el dominio público elegidos usan
  exactamente `LinkVentas` antes de fijar `metadataBase`, canonical y URLs de
  Open Graph.
- Revisar los contrastes y la carga de Inter/Space Grotesk en móvil y en una
  conexión lenta.
- Probar el símbolo a 16, 24 y 32 px sobre fondos claro y oscuro antes de
  producir piezas impresas o de pauta.
