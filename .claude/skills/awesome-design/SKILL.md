---
name: awesome-design
description: Colección de 84 DESIGN.md (sistemas de diseño en texto analizados de webs conocidas, de VoltAgent/awesome-design-md). Úsala como referencia de estilo cuando haya que decidir tipografía, color, espaciado, componentes o tono visual de una pantalla, o cuando el usuario pida que algo «se parezca a» un sitio concreto.
---

# Awesome DESIGN.md

Cada carpeta de `design-md/<sitio>/` trae un `DESIGN.md`: un sistema de diseño en Markdown
(tokens de color, tipografía, espaciado, radios, sombras, componentes, movimiento y reglas de uso)
analizado a partir de esa web, y un `README.md` con su ficha.

## Cómo usarla

1. Lista las carpetas de `design-md/` y elige una o dos referencias que encajen con lo que se busca
   (sobria y técnica: `linear.app`, `vercel`, `stripe`, `supabase`; datos densos: `posthog`, `sentry`, `clickhouse`…).
2. Lee su `DESIGN.md` entero antes de tocar estilos.
3. Toma de ahí **principios y proporciones** (jerarquía tipográfica, escala de espaciado, contraste, densidad,
   cómo se usan los acentos), y tradúcelos a los tokens propios del proyecto.

## Reglas en este proyecto (USAR 242)

- Es una referencia, no una plantilla: **no copiar marcas, logotipos, nombres ni la identidad de ninguna empresa**.
  La app conserva su propia identidad (verde oscuro, amarillo de acción, emblema UIEM/USAR 242).
- Los colores salen siempre de las variables de `:root` en `styles.css`, con su versión oscura.
- Lo que se aplique tiene que seguir funcionando en el móvil (390 px de ancho), con objetivos táctiles de 44 px
  y contraste suficiente en claro y en oscuro.

Licencia: MIT (VoltAgent), ver `LICENSE`.
