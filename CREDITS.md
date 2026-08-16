# Créditos

## Animación de la flor — `assets/flower.json`

> **PENDIENTE DE SUSTITUIR.** Ahora mismo contiene una floración de marcador
> generada para esta página. Sirve para probar la interacción, pero la flor
> definitiva debe venir de LottieFiles.
>
> Al reemplazarla, rellena estos campos y borra este aviso:
>
> - **Título:** …
> - **Autor/a:** …
> - **URL:** …
> - **Licencia:** Lottie Simple License (FL 9.13.21)

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

## Tipografía

Serif del sistema (`Iowan Old Style` / `Palatino` / `Georgia`). Sin webfonts:
cero peticiones externas y ningún parpadeo de texto sin estilo al cargar.
