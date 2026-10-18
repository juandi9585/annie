---
version: 1
slug: "annieversario-index-html"
primary_target: "annieversario/index.html"
related_targets: []
---

# Surface: annieversario/ (primer aniversario, 18/10/2026)

Mode: Experience. Móvil primero (iPhone Safari, vertical, de noche). URL fija por un QR impreso: /annie/annieversario/.

Job: Annie recorre las fotos de "todos sus universos" (Minecraft, Clash of Clans, Stardew, Sky y la vida real) y llega a "Feliz Annieversario". Casi sin texto: el título, el nombre de cada universo, el cierre.
Content: fotos en fotos/, declaradas en un bloque JSON cercado de index.html (universo → fotos). Sky2 (los dos dentro del cuadro en el museo de Sky) se reserva para el cierre. Más fotos pueden llegar: cada una es una estrella más.
Constraints: estático, sin dependencias; fuentes vendorizadas en fonts/; fotos sin EXIF; prefers-reduced-motion; botones reales con foco.

## Direction contract

THESIS: el cielo de La noche estrellada es el mapa; cada foto es una estrella y cada universo una constelación que se enciende al visitarla. Al abrir una estrella la pantalla se convierte en ese juego. Rechaza la galería en rejilla y el carrusel.
OWN-WORLD: lienzo de pinceladas de Van Gogh vivo (canvas, campo de flujo con remolinos: azul de Prusia, cobalto, cerúleo, amarillo cromo, blanco), ciprés y pueblo en silueta; Caveat Brush pintada. Cada universo trae su gramática nativa: Minecraft (tooltip morado, ranura de inventario, tierra pixelada, Pixelify Sans), Clash (nubes que se cierran, panel de madera y pergamino, Lilita con contorno), Stardew (caja de diálogo de madera, Jersey 15), Sky y la vida real (marco dorado de museo sobre el cielo).
STORY: ve el cuadro, lee "Together in every universe", toca estrellas, entra en cada mundo, vuelve; al completar todas, las constelaciones se unen y el cielo se abre a Sky2: "Feliz Annieversario".
FIRST VIEWPORT: cielo de remolinos a pantalla completa; título pintado arriba; constelaciones latiendo en el tercio medio; ciprés a la izquierda, pueblo abajo; pista mínima "toca una estrella".
FORM: forma fijada por el usuario (constelación sobre Van Gogh + temas por juego); sin roll de concept-seed: brief-pinned. Code-led (sin generación de imágenes).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
