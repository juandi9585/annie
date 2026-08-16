# Créditos

## Las fotos — `assets/fotos/`

Nuestras, de Annie y mías. No hay licencia que anotar, pero sí dos cosas:

- Los originales están en `assets/fotos-originales/` y **no los sirve la
  página**: sólo existen para poder regenerar los recortes con
  `tools/fotos.py`. Si quieres que no se publiquen, bórralos del repo después
  de procesarlos — o añádelos a `.gitignore` antes del primer commit.
- Las que sí se publican salen **sin metadatos**: Pillow no copia el EXIF si no
  se lo pides, así que las coordenadas GPS de cada foto se quedan fuera. En un
  repositorio público eso no es un detalle.

## Animación de la flor — `assets/flower.json`

- **Título del archivo:** "Flower growing Lottie JSON animation2"
- **Origen:** LottieFiles, sección de animaciones gratuitas
- **Autor/a:** *pendiente* — anotar aquí el nombre que aparece en la página de
  la animación
- **URL:** *pendiente* — el enlace de la animación en lottiefiles.com
- **Licencia:** Lottie Simple License (FL 9.13.21)
- **Formato:** 1000×1000, 30 fps, 60 frames, sin imágenes externas embebidas

La página usa el tramo `0.03`–`0.88` de su timeline, no la animación completa
(ver README). Empieza tan abajo a propósito: ahí el lienzo está vacío, y lo que
se ve antes de tocar es la semilla, que es un objeto de la página.

Las animaciones gratuitas de LottieFiles se publican bajo la
[Lottie Simple License (FL 9.13.21)](https://lottiefiles.com/page/license), que
permite descargar, reproducir, modificar y distribuir los archivos, incluso con
fines comerciales. **La atribución no es obligatoria**, pero se anota aquí porque
cuesta nada y es lo correcto.

## Runtime — `vendor/lottie.min.js`

[lottie-web](https://github.com/airbnb/lottie-web) 5.13.0, build `lottie_svg.min.js`.
Licencia MIT, © Airbnb.

Está vendorizado a propósito, no cargado desde un CDN: la página no debe depender
de que un tercero siga sirviendo esa ruta dentro de unos años.

## Tipografía — `assets/fonts/`

**Fraunces**, de Undercase Type (Phaedra Charles y Flavia Zimbardi).
[Licencia SIL Open Font 1.1](https://scripts.sil.org/OFL), copia completa en
`assets/fonts/OFL.txt`. Repositorio:
<https://github.com/undercasetype/Fraunces>.

Se usa en **dos cortes ópticos**, que es de donde le viene el carácter a la
página: el mismo dibujo de letra afinado para dos tamaños distintos.

| | eje | para |
|---|---|---|
| Display | `opsz 144 / wght 600 / SOFT 100 / WONK 1` | el título. Contrastada y algo torcida: perfecta a 40 px, ilegible a 17. |
| Texto | `opsz 14 / wght 400 / SOFT 100 / WONK 0` | la carta. Trazo más parejo y sin las formas raras, que a tamaño de párrafo estorban. |

Las dos son **instancias estáticas**, descargadas ya fijadas desde Google
Fonts: no llevan ejes variables y pesan 18 KB cada una en vez de 121.

Cada corte va en dos archivos con su `unicode-range`:

- `fraunces-display.woff2` / `fraunces-texto.woff2` — latin. Cubren el español
  entero, y son las dos únicas que se descargan siempre.
- `…-ext.woff2` — latin-ext. El navegador **sólo las pide** si el texto llega a
  usar un carácter de ese rango.

Están servidos desde el propio dominio, como `lottie.min.js`. La `pista`
("tócala") va en la sans del sistema a propósito: contrasta con la serif y no
cuesta ni una petición.
