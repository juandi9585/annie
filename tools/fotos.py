#!/usr/bin/env python3
"""Prepara las fotos de assets/fotos-originales/ para la web.

    python tools/fotos.py

Lee los originales tal como salen del móvil y escribe en assets/fotos/:

    NN-nombre.webp        900x1125  — la que se ve grande
    NN-nombre-mini.webp   400x500   — la del jardín, antes de tocarla

Tres cosas que hace y que importan:

  * ORIENTA. Las fotos del móvil vienen giradas con una etiqueta EXIF; sin
    corregirlo, la mitad saldrían tumbadas.

  * RECORTA A 4:5 vertical, que es la proporción que llena una pantalla de
    móvil sin dejar franjas. Dónde recortar lo decide FOCO (ver abajo): con
    un recorte centrado a ciegas se cortan cabezas.

  * BORRA LOS METADATOS. Pillow no copia el EXIF si no se lo pides, así que
    las coordenadas GPS de cada foto se quedan fuera. Esto NO es cosmético:
    el repositorio es público.
"""

import os
import glob
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'assets', 'fotos-originales')
DESTINO = os.path.join(RAIZ, 'assets', 'fotos')

PROPORCION = 4 / 5          # ancho / alto
GRANDE, MINI = 900, 400
CALIDAD_GRANDE, CALIDAD_MINI = 80, 78

# ---------------------------------------------------------------------------
# EL REPARTO.  Es lo único que hay que tocar al cambiar de fotos.
#
#   orden — el número con el que sale. Las tres primeras son las que dispara
#           la semilla, en ese orden; el resto van al jardín.
#   foco  — dónde está lo que importa, en fracción de la altura del original.
#           0 = arriba del todo, 0.5 = centro, 1 = abajo. Con 3:4 el recorte
#           es leve; con 9:16 se tira media foto y esto decide qué mitad.
# ---------------------------------------------------------------------------
REPARTO = [
    # los tres que salen disparados de la semilla
    ('IMG-20260426-WA0064.jpg',    1, 'abrazo',    0.42),
    ('IMG-20260219-WA0510.jpg',    2, 'playa',     0.38),
    ('IMG-20260321-WA0112.jpg',    3, 'ramo',      0.44),
    # el jardín
    ('IMG-20260130-WA0038(1).jpg', 4, 'vestido',   0.45),
    ('IMG-20260419-WA0060.jpg',    5, 'sushi',     0.45),
    ('20260807_211202.jpg',        6, 'gorros',    0.40),
    ('IMG-20260803-WA0002.jpg',    7, 'noche',     0.42),
    ('IMG-20260321-WA0104.jpg',    8, 'helados',   0.50),
    ('20260216_185542.jpg',        9, 'juntos',    0.50),
]


def recortar(im, foco):
    """Recorta a 4:5 conservando todo el ancho y eligiendo la franja vertical."""
    ancho, alto = im.size
    alto_util = min(alto, int(round(ancho / PROPORCION)))
    ancho_util = min(ancho, int(round(alto_util * PROPORCION)))

    # El centro va donde diga el foco, pero sin salirse de la foto.
    centro = foco * alto
    arriba = int(round(centro - alto_util / 2))
    arriba = max(0, min(arriba, alto - alto_util))
    izq = (ancho - ancho_util) // 2

    return im.crop((izq, arriba, izq + ancho_util, arriba + alto_util))


def main():
    os.makedirs(DESTINO, exist_ok=True)

    sueltas = {os.path.basename(f) for f in glob.glob(os.path.join(ORIGEN, '*'))}
    total = 0

    for nombre, orden, apodo, foco in REPARTO:
        ruta = os.path.join(ORIGEN, nombre)
        if not os.path.exists(ruta):
            print('  FALTA  ' + nombre)
            continue
        sueltas.discard(nombre)

        im = ImageOps.exif_transpose(Image.open(ruta)).convert('RGB')
        im = recortar(im, foco)

        base = '%02d-%s' % (orden, apodo)
        for ancho, calidad, sufijo in ((GRANDE, CALIDAD_GRANDE, ''),
                                       (MINI, CALIDAD_MINI, '-mini')):
            copia = im.resize((ancho, int(round(ancho / PROPORCION))), Image.LANCZOS)
            salida = os.path.join(DESTINO, base + sufijo + '.webp')
            copia.save(salida, 'WEBP', quality=calidad, method=6)
            total += os.path.getsize(salida)
            print('  %-26s %4dx%-4d %6.1f KB' % (
                os.path.basename(salida), copia.width, copia.height,
                os.path.getsize(salida) / 1024))

    for s in sorted(sueltas):
        print('  SIN REPARTO  ' + s + '  (no se usa)')

    print('\n  total en assets/fotos/: %.1f KB' % (total / 1024))
    print('  recuerda: index.html lista las fotos a mano, revisa que cuadren')


if __name__ == '__main__':
    main()
