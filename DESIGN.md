---
name: Annie (regalos) · annieversario
description: Together in every universe. La noche estrellada como mapa; cada juego, su propia piel.
colors:
  noche: "#0c1f4d"
  noche-honda: "#08163a"
  oro: "#f7dc6f"
  oro-palido: "#fbe7a1"
  cobalto: "#2559a3"
  bruma: "#d6e4f0"
  marco-oro: "#b98a33"
  luz-ventana: "#f7d35a"
  mc-tooltip: "#100010"
  mc-tooltip-borde: "#4a0fd0"
  mc-panel: "#c6c6c6"
  mc-sombra-texto: "#3f3f3f"
  clash-pergamino: "#f3ead2"
  clash-tinta: "#2a1a08"
  clash-madera: "#b0733a"
  clash-verde: "#6cb52f"
  clash-rojo: "#e0321f"
  stardew-papel: "#f6cd84"
  stardew-boton: "#f9dca0"
  stardew-tinta: "#3b1a0a"
  stardew-naranja: "#e48a33"
typography:
  display:
    fontFamily: "Caveat Brush, Segoe Print, cursive"
    fontSize: "clamp(2.7rem, 11.5vw, 5.6rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "0.005em"
  display-final:
    fontFamily: "Caveat Brush, Segoe Print, cursive"
    fontSize: "clamp(3.2rem, 15vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.95
  headline:
    fontFamily: "Caveat Brush, Segoe Print, cursive"
    fontSize: "clamp(2.2rem, 9vw, 3.4rem)"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Caveat Brush, Segoe Print, cursive"
    fontSize: "1.4rem"
    fontWeight: 400
  label:
    fontFamily: "Caveat Brush, Segoe Print, cursive"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1
  minecraft-title:
    fontFamily: "Pixelify Sans, monospace"
    fontSize: "1.6rem"
    fontWeight: 400
    lineHeight: 1
  clash-title:
    fontFamily: "Lilita One, sans-serif"
    fontSize: "clamp(1.5rem, 6vw, 2rem)"
    lineHeight: 1
  stardew-title:
    fontFamily: "Jersey 15, monospace"
    fontSize: "1.9rem"
    lineHeight: 1.1
rounded:
  pill: "999px"
  stardew: "4px"
  clash-ventana: "12px"
  clash-boton: "14px"
  clash-panel: "20px"
  jardin: "14px"
spacing:
  pie-gap: "18px"
  nombre-gap: "14px"
  boton-y: "10px"
  boton-x: "22px"
  borde-pantalla: "20px"
components:
  boton-noche:
    backgroundColor: "rgba(12, 31, 77, 0.55)"
    textColor: "{colors.oro-palido}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
    height: "48px"
  boton-noche-hover:
    backgroundColor: "rgba(37, 89, 163, 0.6)"
  puerta-noche:
    backgroundColor: "rgba(12, 31, 77, 0.62)"
    textColor: "{colors.oro-palido}"
  puerta-noche-hover:
    backgroundColor: "rgba(37, 89, 163, 0.6)"
  enlace-jardin:
    textColor: "{colors.oro-palido}"
    rounded: "{rounded.jardin}"
    width: "56px"
    height: "52px"
  paso-noche:
    backgroundColor: "rgba(12, 31, 77, 0.55)"
    textColor: "{colors.oro-palido}"
    size: "52px"
  boton-minecraft:
    backgroundColor: "#6f6f6f"
    textColor: "#ffffff"
    padding: "10px 26px"
  boton-minecraft-hover:
    backgroundColor: "#7d88c8"
  paso-clash:
    backgroundColor: "{colors.clash-verde}"
    textColor: "#ffffff"
    rounded: "{rounded.clash-boton}"
    size: "52px"
  salir-clash:
    backgroundColor: "{colors.clash-rojo}"
    rounded: "{rounded.clash-ventana}"
    size: "48px"
  boton-stardew:
    backgroundColor: "{colors.stardew-boton}"
    textColor: "{colors.stardew-tinta}"
    rounded: "{rounded.stardew}"
    padding: "10px 22px 12px"
  boton-stardew-hover:
    backgroundColor: "#ffe9b8"
---

# Design System: Annie (regalos) · annieversario

> **Alcance.** Este repo aloja varios regalos, cada uno con su propio mundo visual (el jardín raíz `index.html`/`jardin.css`, `flor/`, `mesiversario/`, `cumple/`, `annieversario/`). Este documento registra **solo el mundo de `annieversario/`**; no gobierna a los demás. Los mundos de los otros regalos aún no están documentados.
>
> Fuente de verdad: `annieversario/estilo.css` y la paleta del lienzo en `annieversario/app.js` tal como se publicaron.

## Overview

**Creative North Star: "La noche estrellada como mapa"**

Un solo cuadro vivo a pantalla completa: un lienzo `<canvas>` pintado pincelada a pincelada con un campo de flujo de remolinos, en la paleta de Van Gogh (azul de Prusia, cobalto, cerúleo, amarillo cromo, blanco), con ciprés y pueblo en silueta; en el pueblo, una casa elegida se pinta más grande, con ventanas y puerta encendidas y flores delante, y es el enlace al jardín. Sobre él, todo el texto es pincel (Caveat Brush) en oro pálido, y las constelaciones son trazos punteados de bruma que se vuelven oro continuo al visitarlas. No hay tarjetas, rejillas ni chrome de interfaz en el cielo: solo el título, las estrellas, la luna, la casa del jardín y una pista.

El sistema tiene dos capas. **La noche** es la piel por defecto: rige el cielo, el cierre y cualquier universo sin piel propia (hoy "Sky: Children of the Light" y "Este universo"). **Las pieles de juego** (Minecraft, Clash of Clans, Stardew Valley) sustituyen por completo el idioma visual al abrir su universo: tipografía, materiales, bordes, sombras y transición de entrada son los nativos de cada juego. Una piel no mezcla su gramática con la noche ni con otra piel.

Móvil primero (iPhone, vertical, de noche): sin scroll (`overflow: hidden` en `html, body`), áreas seguras respetadas, objetivos táctiles de 48-52px.

**Key Characteristics:**
- Un lienzo pintado como único fondo; la interfaz flota sobre él sin superficies propias.
- Texto en pincel, oro pálido sobre azul noche, legibilidad sostenida por halos de sombra azul oscuro, no por cajas.
- Cada universo de juego es una piel completa y nativa, seleccionada por `data-universo`.
- Movimiento con una sola curva de firma (`--curva`), y apagado entero bajo `prefers-reduced-motion`.

## Colors

Noche azul profunda con oro como única luz; las pieles de juego traen paletas cerradas propias que no salen de su universo.

### Primary
- **Oro cromo** (oro): las constelaciones encendidas (trazo continuo con resplandor), el nombre de una constelación ya vista, la selección de texto. Es la señal de "visitado"; no decora.
- **Oro pálido** (oro-palido): todo el texto de la noche (título, pista, nombre del universo, botones) y los bordes al 55% de opacidad de los botones de noche. También el foco (`outline: 3px`).

### Secondary
- **Cobalto** (cobalto): estado hover de los botones de noche, al 60% de opacidad. Es también el centro de la rampa del cielo del lienzo.
- **Oro de marco** (marco-oro): color de respaldo del borde de museo y una de las bandas de ocre de la moldura que `app.js` pinta para el `border-image`.
- **Luz de ventana** (luz-ventana): las ventanas encendidas del pueblo en el lienzo y, en rgba al 40%, el resplandor radial de la casa del jardín al pasar o enfocar.

### Neutral
- **Noche** (noche): fondo de documento, `theme-color`, telón de fundido, base de los botones de noche al 55%.
- **Noche honda** (noche-honda): fondo del cierre y color de todos los halos de sombra de texto (en rgba).
- **Bruma** (bruma): constelaciones aún no visitadas (rgba al 34%, punteadas) y el contador de fotos en la piel de noche.

### Pieles de juego (solo dentro de su universo)
- **Minecraft:** tooltip morado casi negro con borde violeta (mc-tooltip, mc-tooltip-borde), panel gris de inventario con biselado blanco/`#555` (mc-panel), texto blanco con sombra gris dura (mc-sombra-texto), botones de piedra con textura pixelada; hover con tinte azul `#7d88c8` en multiply.
- **Clash of Clans:** panel de pergamino (clash-pergamino) con tinta marrón casi negra (clash-tinta) como único color de borde, cabecera de madera en degradado (clash-madera), botón de paso verde (clash-verde), cerrar en rojo (clash-rojo); fondo de césped verde con rombos.
- **Stardew Valley:** caja de diálogo color papel (stardew-papel), marco de madera en anillos (stardew-naranja, `#b0561c`, stardew-tinta), botones crema (stardew-boton); fondo de tablones de suelo.

### Named Rules
**The Una Sola Luz Rule.** En la noche, el oro es la única luz. Lo no visitado es bruma; lo visitado y el texto son oro. No se introduce un segundo acento.

**The Paleta Cerrada Rule.** Los colores de una piel de juego viven solo bajo su `[data-universo]`. Nunca aparecen en el cielo, en el cierre ni en otra piel.

## Typography

**Display Font:** Caveat Brush (con Segoe Print, cursive), vendorizada en `annieversario/fonts/`.
**Pieles:** Pixelify Sans (Minecraft), Lilita One (Clash), Jersey 15 (Stardew), todas vendorizadas.

**Character:** Un pincel seco que parece pintado en el mismo cuadro; un solo peso (400) en toda la noche. Las pieles usan la fuente que cada juego usa en su propia UI.

### Hierarchy
- **Display** (display): el título del cielo, centrado y balanceado; en apaisado se reduce a `clamp(2.7rem, 5.2vw, 4.6rem)` para no tocar el halo de la luna. Entra "pintándose" de izquierda a derecha.
- **Display final** (display-final): "Feliz Annieversario" en el cierre; misma animación de pintado, con 4.2s de retraso.
- **Headline** (headline): nombre del universo al abrirlo en la piel de noche.
- **Body** (body): la pista inferior y el contador de fotos.
- **Label** (label): nombres de constelación junto a las estrellas (`#e6eef7` hasta ser vistas, luego oro; centrados, balanceados y partidos en líneas a partir de 150px, interlineado 1.05) y el botón de volver. "Tu jardín", bajo la casa, va un poco menor (1.2rem).

### Named Rules
**The Un Solo Pincel Rule.** En la noche no hay otra familia ni otro peso que Caveat Brush 400. La jerarquía se hace con tamaño, nunca con peso.

**The Halo, No Caja Rule.** El texto sobre el lienzo se sostiene con sombras de texto en noche-honda (p. ej. `0 2px 0 rgba(8,22,58,.45), 0 8px 28px rgba(8,22,58,.7)`), nunca con un panel detrás.

## Layout

Una pantalla fija sin scroll. El cielo ocupa todo el viewport (`position: fixed; inset: 0`); título anclado arriba (`safe-area-inset-top + clamp(20px, 5.5vh, 52px)`), pista anclada abajo (`safe-area-inset-bottom + 26px`), estrellas, luna y casa del jardín posicionadas en absoluto por `app.js` sobre el cuadro. Cada constelación ocupa un hueco de la franja libre entre el título y las colinas; las grandes se colocan primero y, si no caben en su hueco, buscan cualquier sitio libre. La casa del jardín se elige entre las del pueblo que no chocan con ningún nombre.

Un universo abierto es un diálogo a pantalla completa que centra una columna: nombre, ventana de foto, pie (paso anterior · contador · paso siguiente, `gap: 18px`) y volver. La ventana conserva la proporción de la foto (`--ar`) y se limita a `min(calc(100vw - 64px), 760px, alto × ar)` con alto `min(58dvh, 620px)`; Clash y Stardew estrechan esos límites para dejar sitio a su marco. Con una sola foto el pie desaparece.

El cierre es una foto a sangre (`100dvh`, `object-fit: cover`) con el título arriba y las salidas abajo (`justify-content: space-between`), velado por un degradado de noche-honda solo en los extremos.

## Elevation & Depth

La noche es plana: la profundidad la da el propio lienzo (y, al abrir un universo de noche, el cuadro se desenfoca a `blur(6px)` y el cielo baja a 8% de opacidad). Las únicas sombras de caja de la noche son el marco de museo y la puerta del cierre, ambas difusas en azul casi negro. Las pieles de juego usan la elevación nativa de su juego: biselado de inventario en Minecraft, sombra inferior dura y relieve interior en Clash, anillos interiores en Stardew.

### Shadow Vocabulary
- **Marco de museo** (`box-shadow: 0 24px 50px rgba(3,10,30,.6), 0 4px 10px rgba(3,10,30,.4)`): la ventana de foto en la piel de noche, girada `-1deg`.
- **Resplandor de constelación** (`filter: drop-shadow(0 0 4px rgba(247,220,111,.75))`): solo en trazos encendidos y en el lazo final.
- **Botón de Clash** (`inset 0 3px 0 rgba(255,255,255,.5), 0 4px 0 #2a1a08`): sombra dura inferior que se hunde 3px al pulsar. Nativa de Clash; no sale de esa piel.
- **Botón de piedra** (`inset 3px 3px 0 rgba(255,255,255,.38), inset -3px -4px 0 rgba(0,0,0,.45)`): biselado de Minecraft.

### Named Rules
**The Sombra Nativa Rule.** Una sombra dura o desplazada solo existe donde el juego que se imita la usa (Clash, Minecraft). La noche nunca la usa.

## Shapes

La noche es redonda: estrellas, luna y botones de paso son círculos; volver es una píldora (`999px`). El marco de museo de la noche es una moldura dorada en inglete: cuatro trapecios pintados a pinceladas por bandas (canto oscuro, luz, oro, ocre, filo claro, canto) con el inglete marcado por un trazo fino, servida como `border-image` 9-slice. Los chevrons de paso se dibujan con bordes CSS de 3px (4px en Minecraft), no con glifos. Cada piel trae su forma: Minecraft es rectangular sin radio; Clash usa radios generosos (12/14/20px) con contorno de 4px en tinta; Stardew casi recto (4px) con marcos de madera concéntricos.

## Components

### Botones de la noche
- **Character:** vidrio de noche con filo de oro.
- **Shape:** píldora (volver) o círculo de 52px (paso); borde de 2px en oro pálido al 55%.
- **Color:** fondo noche al 55%, texto oro pálido; hover a cobalto al 60%.
- **Focus:** `outline: 3px solid` oro pálido, `outline-offset: 3px`. Deshabilitado: opacidad 0.35.
- La misma receta se reutiliza en "Volver a las estrellas" del cierre.

### Estrella y constelación (firma)
- Objetivo táctil invisible de 52px, circular, sobre la estrella pintada en el lienzo.
- Trazos: bruma al 34%, 1.3px, punteado `1.5 7`, enmascarados bajo cada nombre (un hueco redondeado de 10px): ningún trazo tacha una palabra. Al visitarla: oro, 1.9px, continuo, con resplandor; el trazo nuevo se dibuja con `stroke-dashoffset` en 1.1s. Al completar todas, los lazos entre constelaciones aparecen en oro pálido, escalonados.

### Ventana de universo (firma, por piel)
- **Noche:** moldura de museo dorada en inglete (ver Shapes), inclinada `-1deg`; se abre con un `clip-path: circle()` que crece desde la estrella tocada (1.05s, se cierra en 0.9s, `cubic-bezier(0.65, 0, 0.35, 1)`). El contenido sube y aparece (marco-entra, 0.9s).
- **Minecraft:** nombre como tooltip de objeto; foto en ranura hundida dentro del panel de inventario; botones de piedra. Entra con un telón de bloques pixelados que se colocan en ola desde la estrella tocada, cada uno creciendo con un pequeño rebote; el contenido entra rápido (marco-entra, 0.45s).
- **Clash:** panel de pergamino con cabecera de madera y texto con contorno (`-webkit-text-stroke: 5px`), X roja de cerrar en la esquina. Entra con dos nubes que se cierran (0.95s); el panel aparece con rebote de escala (marco-rebota, `cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Stardew:** caja de diálogo de madera con pestaña de nombre sobresaliente; foto con `image-rendering: pixelated`. Entra con fundido a negro (0.7s); la caja sube 44px (marco-sube).
- Salida común: el contenido baja 12px y se desvanece (marco-sale, 0.3s) antes del telón.
- Cambio de foto: deslizamiento de 28px con fundido en 0.42s.

### Casa del jardín
- **Character:** una luz más del pueblo, no un botón.
- Enlace invisible de 56×52px (radio 14px) sobre la casa pintada en el lienzo, con la etiqueta "Tu jardín" debajo en pincel oro pálido y halo de noche.
- **Hover / Focus:** resplandor radial de luz de ventana que aparece en 0.4s y la etiqueta se aclara a `#fff6d8`; foco con el anillo común (`outline-offset: 2px`).

### Puerta de noche (cierre)
- La puerta compartida al jardín (`assets/puerta.css`) en su variante nocturna: tinta oro pálido, texto secundario en bruma, borde oro pálido al 45%, fondo noche al 62% y sombra difusa `0 10px 30px rgba(3,10,30,.4)`; hover a cobalto al 60%. No puede brillar más que el final: entra la última (7.4s).

### Cierre
- Foto a sangre que entra desenfocada y ampliada y se enfoca; en vertical la cámara se desplaza de la luna a la pareja (`object-position` 40% a 72% en 6.5s). Título y salidas aparecen escalonados (4.2s, 6.6s, 7.4s).

## Do's and Don'ts

### Do:
- **Do** usar `--curva` (`cubic-bezier(0.7, 0, 0.2, 1)`) para todo movimiento de la noche.
- **Do** mantener cada piel encerrada en su selector `[data-universo="…"]`, y dejar que cualquier universo nuevo sin piel caiga en la noche.
- **Do** dibujar los iconos con CSS o SVG (chevrons de borde, X de dos barras), con `aria-label` en el botón.
- **Do** interrumpir los trazos de constelación bajo los nombres; ninguna línea cruza texto.
- **Do** que los enlaces del cielo vivan dentro del cuadro (la casa del jardín), no como botones superpuestos.
- **Do** dar a cada control un objetivo de al menos 48px y un `:focus-visible` visible.
- **Do** apagar animaciones y transiciones bajo `prefers-reduced-motion` (el telón pasa a un fundido corto).

### Don't:
- **Don't** poner paneles, tarjetas o rejillas sobre el cielo; el texto se sostiene con halos.
- **Don't** usar en la noche las sombras duras, contornos de texto o fuentes pixeladas de las pieles.
- **Don't** añadir una segunda familia o un segundo peso a la noche.
- **Don't** mezclar materiales entre pieles (piedra de Minecraft en Clash, madera de Stardew en la noche).
