# Una flor para Annie

Página estática: un cielo, una loma, tierra, y una semilla sembrada en ella.

Annie toca la semilla y no pasa casi nada — la tierra tiembla y la luz sube un
punto. Toca otra vez, y otra: **al tercer toque la tierra se abomba y sale
disparada una foto**. Tres fotos, tres fases, nueve toques. El décimo abre la
flor y trae el mensaje. Y sólo entonces se puede bajar al jardín, que es la
segunda pantalla: todas las fotos, esparcidas bajo tierra.

No hay build, ni dependencias, ni npm. Se despliega tal cual.

---

Destino: <https://juandi9585.github.io/annie>

## La semilla, y por qué existe

La animación de LottieFiles **no es un capullo que se abre**: es la flor entera
escalando desde un punto. En cualquier fotograma intermedio la flor ya está
dibujada, sólo que pequeña — así que arrancarla "un poco empezada" para tener
algo que tocar significaba enseñarle a Annie el regalo antes de abrirlo.

La solución no está en la animación sino en la página: el objeto que se toca es
**la semilla**, que es un `<button>` de HTML con su halo respirando. Eso libera
a la flor para empezar en un fotograma **vacío de verdad** — no pequeña, no
transparente: todavía no existe.

De ahí sale toda la composición. Si la planta crece desde un punto, ese punto es
tierra: ahí se siembra la semilla, ahí pasa la línea del horizonte y de ahí
salen disparadas las fotos.

## El problema de los diez toques

De cada tres toques, **dos no entregan nada**. Ese es el riesgo de todo el
diseño: si esos dos se sienten vacíos, deja de tocar y nunca llega al mensaje.

Por eso la carga se ve. Cada toque en falso tensa: la semilla (o la tierra, una
vez enterrada) da un tirón corto, y el halo sube un escalón que **no vuelve a
bajar hasta que estalla**. La luz es el único indicador, y no hace falta ninguna
barra de progreso para leerla.

Dos decisiones que van con eso:

- **Sin cerrojo entre toques en falso.** Si toca rápido, avanza rápido. Sólo hay
  420 ms de bloqueo justo después de un estallido, para que un doble toque sin
  querer no se salte una fase entera.
- **La diana cambia de tamaño.** El primer toque es sobre la semilla, que es
  pequeña y precisa: eso enseña el gesto. En cuanto la semilla se entierra, un
  botón transparente del tamaño de la pantalla toma el relevo, porque a partir
  de ahí uno toca donde sea.

El ritmo entero sale de una constante en `app.js`:

```js
var TOQUES_POR_FASE = 3;   // 3 fases x 3 toques + el estallido final = 10
```

Y el número de fases sale de **cuántas fotos haya** en el HTML: añadir o quitar
un `<div class="recuerdo">` cambia el total de toques sin tocar nada más.

## Los números de la animación

Están juntos y comentados al principio de `app.js`:

| Constante | Ahora | Qué es |
|---|---|---|
| `FRAME_FROM` | `0.03` | Dónde empieza el tramo útil. **Tiene que ser un fotograma vacío.** |
| `FRAME_TO` | `0.88` | Dónde deja de moverse la animación; más allá el tween gastaría tiempo en nada. |
| `ORIGIN_X` / `ORIGIN_Y` | `0.542` / `0.883` | El punto del lienzo desde el que crece la planta. Ancla la semilla, el horizonte y la flor. |
| `CIMA_Y` | `0.115` | Dónde queda el pétalo más alto. Sólo sirve para repartir sitio con el mensaje. |

Se miden en `tools/frames.html`, que dibuja una cruz roja en
`ORIGIN_X`/`ORIGIN_Y` sobre cada fotograma: si la cruz cae en la base del tallo
en todos, el número es bueno.

Y uno más, en `styles.css`: `--flor-ancho` (`150vw`) es cuánto puede
sobresalir de la pantalla el **lienzo** del Lottie. Esta flor sólo ocupa el 40%
central de su lienzo cuadrado, así que limitarlo a `100vw` la dejaba diminuta.
Con una animación que llene su lienzo, bájalo.

## Cambiar la flor

1. Busca en LottieFiles filtrando por **Free**:
   [flower-blooming](https://lottiefiles.com/free-animations/flower-blooming) ·
   [blooming-flower](https://lottiefiles.com/free-animations/blooming-flower) ·
   [rose-flower](https://lottiefiles.com/free-animations/rose-flower)

2. **No sirve cualquier flor.** La interacción recorre el timeline a mano, así que
   tiene que ser una progresión lineal de menos a más, y tiene que **crecer desde
   abajo** — la escena la hace salir de la tierra. Compruébalo arrastrando el
   scrubber del preview en LottieFiles: si al arrastrar de izquierda a derecha la
   flor se abre o crece, sirve. Si gira en bucle o rebota, no.

3. Descarga en **Lottie JSON** (no `.lottie`, no GIF) y guárdalo como
   `assets/flower.json`.

4. Abre `tools/frames.html` y ajusta los números de arriba en `app.js`.

5. Regenera `assets/preview.jpg` (ver abajo) y rellena `CREDITS.md`.

## Las fotos

Los originales van en `assets/fotos-originales/` tal como salen del móvil. El
que los prepara es `tools/fotos.py`:

```bash
python tools/fotos.py
```

Escribe en `assets/fotos/` dos versiones de cada una: la grande (900×1125, WebP)
y la miniatura del jardín (400×500). Hace tres cosas que importan:

- **Orienta.** Las fotos del móvil vienen giradas con una etiqueta EXIF; sin
  corregirlo, la mitad saldrían tumbadas.
- **Recorta a 4:5 vertical**, que es lo que llena una pantalla de móvil sin
  franjas. Dónde recortar lo decide `FOCO` en el reparto: un recorte centrado a
  ciegas corta cabezas.
- **Borra los metadatos**, y con ellos las coordenadas GPS. Esto no es
  cosmético: el repositorio es público.

El reparto (qué foto va a qué sitio, en qué orden y con qué foco) está en una
lista al principio del script. Es lo único que hay que tocar al cambiarlas.

Luego hay que reflejarlo en `index.html`, que lista las fotos a mano en dos
sitios: los tres `<div class="recuerdo">` que dispara la semilla, y la rejilla
del jardín.

### Cuánto pesa

| | |
|---|---|
| Primera carga, sin fotos | 349 KB |
| Las 3 fotos del acto 1 | 345 KB — se descargan mientras ella lee "tócala" |
| Las 9 miniaturas del jardín | 205 KB — `loading="lazy"`, sólo al acercarse |
| Una foto grande | ~110 KB — sólo si toca esa copia |

Las tres del acto 1 se precargan por adelantado a propósito: entre toque y
toque hay segundos de sobra, y así ninguna llega tarde a su propia entrada.

## El jardín

La segunda pantalla no es otro cielo: es lo que hay **debajo** de la flor. Por
eso arranca exactamente en el color de la tierra de la escena —al deslizar no
hay costura— y se va oscureciendo conforme se baja.

**El scroll está bloqueado** (`body { overflow: hidden }`) hasta que la flor sale.
Antes de eso no hay nada que buscar ahí abajo, y un scroll disponible antes de
tiempo se lleva por delante la sorpresa. `app.js` pone `.is-abierto` un segundo
después del mensaje, y con ella aparece la flecha de "hay más".

Si el número de fotos es impar, **la última cruza las dos columnas y se centra**,
más grande: la fila coja se convierte en el cierre. Por eso ahí conviene poner
una buena.

Tocar una copia la abre a pantalla completa. Se cierra tocando en cualquier
sitio o con `Esc`.

## Cambiar el mensaje

**Está en `index.html`, dentro de la valla de `═══` que pone `EL MENSAJE`.** Es
lo único de ese archivo que hace falta tocar:

```html
<div class="mensaje" id="mensaje" role="status">

  <p class="titulo">¡Felices 10&nbsp;meses, Annie!</p>

  <p class="carta">Te adoro bebi, eres lo mejor que me ha pasado en la vida.</p>

</div>
```

- **`titulo`** — corto. Es un grito, no una frase. Dos líneas como mucho.
- **`carta`** — aquí caben **dos o tres frases** sin que se rompa nada. Puedes
  poner varios `<p class="carta">` seguidos y entran escalonados.
- **`&nbsp;`** — un espacio que no se parte. `10&nbsp;meses` evita que el 10 se
  quede solo al final de una línea. Úsalo donde te moleste el corte.

No hay que tocar CSS ni JS para nada de esto.

### Por qué no se rompe

En el móvil el mensaje y la flor comparten pantalla, así que `ajustarFlor()` en
`app.js` **mide el mensaje y le da a la flor lo que sobra**. Escribas una frase
o un párrafo, el texto nunca acaba entre los pétalos: la flor se encoge.

Tiene un suelo (`FLOR_MIN`, 38% de la pantalla). Si te alargas tanto que la flor
lo toca, el texto empezará a acercársele — **esa es la señal de que el resto va
en la segunda pantalla**, no aquí arriba.

## Ver la página en local

```bash
python -m http.server 8000
```

y abrir <http://127.0.0.1:8000>. **Hace falta un servidor**: `app.js` carga el
JSON con `fetch`, y bajo `file://` eso lo bloquea CORS.

Para probarla en el móvil, que es donde la va a abrir:

```bash
python -m http.server 8000 --bind 0.0.0.0
```

y entrar desde el teléfono a `http://<tu-ip-local>:8000`.

## Regenerar `assets/preview.jpg`

Es la imagen que sale en la tarjeta de WhatsApp. Muestra la escena **en reposo**
—semilla y "tócala", sin flor y sin mensaje—: si el preview lo enseñara todo,
abrir la página ya no descubriría nada.

`tools/preview.html` no dibuja nada por su cuenta: mete `index.html` en un
iframe de 600 px (la misma disposición que verá ella en el móvil), lo amplía x2
y lo sube, de forma que por la ventana de 1200×630 se vea la mitad de abajo de
la escena. Así el preview no puede desincronizarse del diseño.

Con el servidor levantado:

```bash
chrome --headless=new --disable-gpu --hide-scrollbars \
       --run-all-compositor-stages-before-draw --virtual-time-budget=8000 \
       --window-size=1200,630 --screenshot=assets/preview.jpg \
       http://127.0.0.1:8000/tools/preview.html
```

En Windows, `chrome` es `"C:\Program Files\Google\Chrome\Application\chrome.exe"`.

Tres cosas que no son opcionales:

- **`--run-all-compositor-stages-before-draw`**: sin él la captura sale a medio
  fundido, casi en blanco.
- **La extensión `.jpg`**: Chrome deduce el formato del nombre. La misma imagen
  en PNG pesa 489 KB y en JPEG 21 KB, porque el grano de papel es ruido y el PNG
  no comprime ruido.
- **Cambiar el nombre del archivo si ya habías compartido el enlace**: WhatsApp
  y Telegram cachean `og:image` por URL y no vuelven a mirarla. Un nombre nuevo
  —con su `<meta>` actualizada en `index.html`— es la única forma fiable de que
  se refresque.

## Desplegar en GitHub Pages

```bash
gh repo create annie --public --source=. --push
gh api -X POST repos/{owner}/annie/pages -f "source[branch]=main" -f "source[path]=/"
```

Queda en <https://juandi9585.github.io/annie>. El repo se llama `annie` porque el
nombre del repo *es* la URL.

Dos avisos:

- **Comprueba la cuenta activa antes**: `gh auth status`. Tiene que ser
  `juandi9585`; si no, `gh auth switch`. Las meta de `index.html` llevan ese
  usuario escrito, así que publicar desde otra cuenta rompería el preview.
- **El repo tiene que ser público** (Pages desde repo privado requiere GitHub
  Pro), o sea que el texto del mensaje queda legible en GitHub. Si eso molesta,
  la alternativa sin repo público es [Netlify Drop](https://app.netlify.com/drop):
  arrastrar la carpeta y ya.

Tras desplegar, mándate el enlace por WhatsApp y comprueba que la tarjeta sale
bien **y que no se ve el mensaje**.

---

## Cómo está hecho

- `index.html` — markup y metadatos del preview.
- `styles.css` — la escena entera. No hay imágenes: cielo, sol, lomas, tierra,
  montículo y semilla son degradados y `border-radius`.
- `app.js` — carga el Lottie, ancla su punto de crecimiento, lleva la cuenta de
  los toques, dispara las fotos y abre el jardín.
- `tools/fotos.py` — prepara las fotos (ver arriba).
- `assets/fonts/` — Fraunces en dos cortes ópticos, 18 KB cada uno (ver
  `CREDITS.md`).
- `vendor/lottie.min.js` — [lottie-web](https://github.com/airbnb/lottie-web) 5.13.0
  (MIT), build SVG. Vendorizado a propósito: la página no debe depender de un CDN
  ajeno dentro de unos años.
- `tools/frames.html` — tira de fotogramas con la cruz del punto de crecimiento.
- `tools/preview.html` — sólo para generar la imagen del preview.

### La escena

Todo cuelga de tres variables CSS, y cambiarlas mueve la composición entera:

- `--eje` — la vertical donde se siembra. En pantalla ancha se descentra al 63%
  para que el mensaje tenga su propio sitio en vez de caerle encima a la flor.
- `--horizonte` — dónde cae la línea del suelo, y con ella la semilla y la base
  del tallo.
- `--sol-x` — dónde está el sol. El calor del horizonte es un degradado radial
  centrado en él, no una banda de lado a lado, para que la luz nunca venga del
  lado contrario al sol.

La paleta es azul pastel, con el amarillo reservado a dos cosas: la flor y la
semilla. La semilla lleva ese color a propósito — es la flor prometida antes de
existir.

### El detalle que importa

**No se llama a `anim.play()`.** El Lottie se mantiene parado y `app.js` lo
recorre frame a frame con un tween propio y su propia curva de easing.
Reproducir un Lottie a su velocidad de exportación es justo lo que delata una
plantilla.

Y lo primero que se mueve al tocar no es la flor: es la tierra. El montículo se
estira hacia arriba y el brote asoma 224 ms después, cuando el empujón está en
su punto más alto. Ese orden es lo que hace que parezca que algo empuja desde
abajo, y no que se está reproduciendo un archivo.

### Accesibilidad

La semilla es un `<button>` real (funciona con teclado y lector de pantalla).
Con `prefers-reduced-motion: reduce` la página abre ya florecida, sin animación
y sin pedir interacción. Si el JSON no carga, el mensaje se muestra igualmente
sobre la misma escena.
