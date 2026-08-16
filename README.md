# Una flor para Annie

Página estática: un capullo cerrado que florece cuando Annie lo toca, y entonces
aparece el mensaje.

No hay build, ni dependencias, ni npm. Son cinco archivos y se despliegan tal cual.

---

Destino: <https://juandi9585.github.io/annie>

## El tramo útil de la animación

`app.js` **no recorre el timeline entero**, sino el tramo `FRAME_FROM` →
`FRAME_TO` (ahora `0.30` → `0.88`).

La animación actual crece desde una mota invisible y se queda quieta antes del
final. Sin recortar, la página abriría con la pantalla prácticamente vacía —
nada que tocar — y el último tercio del gesto no movería nada.

Si cambias de animación, revisa esos dos números con `tools/frames.html`
(instrucciones dentro). Y ajusta también el zoom de `tools/preview.html`, que
está encuadrado a mano sobre la flor de ahora.

---

## Cambiar la flor

1. Busca en LottieFiles filtrando por **Free**:
   [flower-blooming](https://lottiefiles.com/free-animations/flower-blooming) ·
   [blooming-flower](https://lottiefiles.com/free-animations/blooming-flower) ·
   [rose-flower](https://lottiefiles.com/free-animations/rose-flower)

2. **No sirve cualquier flor.** La interacción recorre el timeline a mano, así que
   tiene que ser una progresión lineal de menos a más. Compruébalo arrastrando el
   scrubber del preview en LottieFiles: si al arrastrar de izquierda a derecha la
   flor se abre o crece, sirve. Si gira en bucle o rebota, no.

3. Descarga en **Lottie JSON** (no `.lottie`, no GIF) y guárdalo como
   `assets/flower.json`.

4. Abre `tools/frames.html` y elige `FRAME_FROM` / `FRAME_TO` en `app.js`. Casi
   ninguna animación aprovecha su timeline entero: suelen empezar en vacío y
   terminar quietas.

5. Regenera `assets/preview.png` (ver abajo) y rellena `CREDITS.md`.

## Cambiar el mensaje

En `index.html`, entre los comentarios `<!-- MENSAJE -->`:

```html
<p>¡Felices 10&nbsp;meses, Annie!</p>
```

Añadir líneas es escribir más `<p>`: se escalonan solas al aparecer, sin tocar
CSS ni JS. El `&nbsp;` evita que "10" se quede solo al final de una línea.

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

## Regenerar `assets/preview.png`

Es la imagen que sale en la tarjeta de WhatsApp. Muestra el **capullo cerrado**,
nunca la flor abierta ni el mensaje: si el preview lo enseñara todo, abrir la
página ya no descubriría nada.

Con el servidor levantado:

```bash
chrome --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=8000 \
       --window-size=1200,630 --screenshot=assets/preview.png \
       http://127.0.0.1:8000/tools/preview.html
```

En Windows, `chrome` es `"C:\Program Files\Google\Chrome\Application\chrome.exe"`.

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
- `styles.css` — todo el diseño.
- `app.js` — carga el Lottie y controla la floración.
- `vendor/lottie.min.js` — [lottie-web](https://github.com/airbnb/lottie-web) 5.13.0
  (MIT), build SVG. Vendorizado a propósito: la página no debe depender de un CDN
  ajeno dentro de unos años.
- `tools/preview.html` — sólo para generar la imagen del preview.

El detalle que importa: **no se llama a `anim.play()`**. El Lottie se mantiene
parado y `app.js` lo recorre frame a frame con un tween propio y su propia curva
de easing. Reproducir un Lottie a su velocidad de exportación es justo lo que
delata una plantilla; con un temporizado propio la flor se abre como si la
animación se hubiera hecho para esta página.

Accesibilidad: el capullo es un `<button>` real (funciona con teclado y lector de
pantalla), y con `prefers-reduced-motion: reduce` la página abre ya florecida, sin
animación y sin pedir interacción. Si el JSON no carga, el mensaje se muestra
igualmente.
