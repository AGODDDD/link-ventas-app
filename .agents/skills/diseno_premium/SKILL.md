---
name: Diseño Premium Anti-IA
description: Fuerza a los agentes a crear interfaces modernas, fluidas y de nivel SaaS premium, evitando diseños genéricos, cuadrados o plantillas básicas.
---

# 🎨 Reglas de Diseño Premium Anti-IA

Esta skill es de uso **OBLIGATORIO** siempre que estés creando o modificando componentes visuales (UI/UX) en este proyecto. Tu objetivo es lograr diseños que transmitan lujo, confianza y un acabado humano "pixel-perfect".

## 1. Prohibido lo "Genérico"
- **Colores:** Abandona los colores básicos por defecto. Utiliza paletas en formato HSL, off-whites para fondos (`#F9FAFB`), grises muy oscuros para textos (`#0F172A`) y acentos vibrantes.
- **Bordes y Sombras:** Nada de cajas duras. Usa `rounded-xl`, `rounded-2xl` o `rounded-full` según el componente. Las sombras deben ser suaves, difuminadas y sutiles (ej: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` en lugar del `shadow-md` tosco de Tailwind).
- **Glassmorphism:** Para barras de herramientas, modales o tarjetas de resumen flotantes, usa fondos translúcidos con blur (`backdrop-blur-xl bg-white/70` en claro, `bg-black/60` en oscuro).

## 2. Micro-Interacciones y Fluidez (La UI debe estar viva)
- Todo elemento interactivo (botones, tarjetas, inputs) DEBE tener estados fluidos: `transition-all duration-300 ease-out`.
- Tarjetas de productos: al hacer hover, usa `hover:-translate-y-1 hover:shadow-2xl`.
- Botones: añade un ligero feedback de clic con `active:scale-95`.
- Nunca hagas que el contenido aparezca de golpe. Usa animaciones de entrada (fade-in, slide-up). Tienes **GSAP** instalado; úsalo para animaciones complejas, o **Tailwind Animate** para las sencillas.

## 3. Tipografía con Intención
- **Jerarquía Extrema:** Haz los títulos realmente grandes y con letter-spacing negativo (`tracking-tight`). Haz los textos secundarios pequeños y con contraste suavizado (`text-muted-foreground` o `opacity-70`).
- **Pesos:** Usa `font-medium` o `font-semibold` para mejorar legibilidad en UI.

## 4. Contenido Realista (No "Lorem Ipsum")
- Al estructurar layouts, inyecta copies reales y persuasivos.
- Usa precios formateados, descripciones que inviten a comprar y nombres de productos atractivos ("Camisa Oxford de Lino", no "Producto Prueba 1").

## 5. Espacios y Respiro (Whitespace is Luxury)
- Las interfaces de IA suelen ser apretadas. Tú usarás paddings generosos (`p-6`, `p-8`, `gap-8`) para que cada elemento tenga su protagonismo, especialmente en el nicho de moda.

## 6. Detalles de e-commerce
- **Insignias y Badges:** Usa pills (pastillas) con colores pasteles y textos en el tono oscuro de ese color para resaltar "Nuevo", "Agotado", "Oferta".
- **Botones Primarios:** Los CTA de compra deben ser inconfundibles. Si es posible, con un sutil gradiente o un glow por detrás.
