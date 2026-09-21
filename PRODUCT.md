# Product

<!-- impeccable:product-schema 1 -->

> Escrito con usuario simulado estructurado: las respuestas salen del brief que
> Juan dio en la sesión de la sorpresa de cumpleaños (21/09/2026). No se hizo
> entrevista aparte; lo que se infirió va marcado como tal.

## Platform

web

## Users

Una sola destinataria: Annie, la novia de Juan. Vive en España y él en
Venezuela; la relación es a distancia. Abre las páginas en su iPhone, con
Safari, desde un enlace que le llega por WhatsApp. Las abre en momentos
señalados (un aniversario, un cumpleaños) y a veces vuelve varias veces el
mismo día.

El autor es Juan: escribe los textos, elige las fotos y edita la página sin
tocar CSS ni JS. Necesita zonas del HTML claramente cercadas para eso.

## Product Purpose

Pequeñas sorpresas web, una por ocasión, hechas a mano para una sola persona.
Cada una es un regalo en sí misma, no un envoltorio de otro: la página tiene
que emocionar al abrirla y aguantar que la vuelva a abrir.

Éxito: Annie llega al final (el mensaje, la tarjeta) sin atascarse, sin
pantallas rotas y sin tener que preguntarle a Juan cómo funciona.

## Positioning

No es una plantilla de felicitación: cada página tiene un gesto propio (tocar
una semilla, hacer una foto en vivo) que sólo tiene sentido entre ellos dos, y
la distancia es parte del mecanismo — lo que ella hace en la página le llega a
él al otro lado del océano.

## Operating Context

- Se abre en un iPhone, casi siempre en vertical, a menudo de noche.
- El enlace llega por WhatsApp: el preview del enlace no debe revelar la
  sorpresa.
- Algunas sorpresas se desarrollan a lo largo de un día (varias visitas), con un
  backend propio de Juan (Apps Script) que guarda el progreso.
- Juan no tiene un iPhone para probar: lo propio de iOS Safari tiene que
  resolverse por construcción, no por prueba.

## Capabilities and Constraints

- Sitio estático en GitHub Pages (`juandi9585.github.io/annie`), una carpeta
  por sorpresa. Sin build, sin npm, sin dependencias ni CDNs: HTML, CSS y JS
  vanilla. Lo de terceros que haga falta va vendorizado.
- El repositorio es público: nada de datos sensibles en el código, fotos sin
  metadatos, y los textos de los regalos concretos no se describen en la
  documentación.
- Tipografía propia servida desde el dominio (`assets/fonts/`).
- Textos generados por IA (en las sorpresas con backend) se tratan como no
  confiables: siempre como texto, nunca como HTML.

## Brand Commitments

- Idioma: español, en la voz de Juan (tú, cariñoso, directo, sin cursilería
  de tarjeta comercial).
- Annie ya conoce y le gusta la paleta azul pastel de la primera sorpresa:
  las siguientes la conservan y la pueden evolucionar, no sustituir.
- El amarillo se reserva para lo que es regalo o flor.

## Evidence on Hand

- Fotos reales de los dos en `assets/fotos/` (procesadas, sin EXIF).
- La primera sorpresa (`index.html` en la raíz) como referencia viva del mundo
  visual.
- No hay que inventar recuerdos, fechas ni frases de Juan: los textos de
  mensaje los escribe él en bloques cercados.

## Product Principles

1. La sorpresa no se revela antes de tiempo (ni en el preview, ni en el HTML
   visible, ni por un scroll disponible antes de hora).
2. Nada puede verse roto en su iPhone: cada error tiene un mensaje humano y
   una salida.
3. Juan edita sin programar: un bloque cercado y comentado por cada texto suyo.
4. La espera y la interacción son parte del regalo, no fricción que esconder.

## Accessibility & Inclusion

`prefers-reduced-motion` respetado siempre. Controles como `<button>` reales,
con foco visible. (Inferido: no se estableció ninguna necesidad específica más
allá de eso.)
