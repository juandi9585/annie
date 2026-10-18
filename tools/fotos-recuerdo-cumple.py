#!/usr/bin/env python3
"""Prepara las fotos del recuerdo del cumple (web/cumple/recuerdo/fotos/).

    python tools/fotos-recuerdo-cumple.py

Lee originales/cumple/ (fuera de web/) y escribe WebP:
  * ORIENTA con el EXIF (exif_transpose) y NO copia metadatos: el repo es público.
  * NO recorta: las del juego ya son cuadradas; las dos de 3:4 (tu-3 y juntos)
    se quedan como estaban y la página las encuadra con object-fit.
  * Lado máximo 1200 px, calidad 80.
"""
import os
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, '..', 'originales', 'cumple')
DESTINO = os.path.join(RAIZ, 'cumple', 'recuerdo', 'fotos')

FOTOS = {
    'tu-1.webp':    '22-09 13.25 tu (intento 1).jpg',      # la aprobada
    'tu-2.webp':    '22-09 11.52 tu (intento 2).jpg',
    'tu-3.webp':    '21-09 21.51 tu (intento 3).jpg',
    'flores.webp':  '22-09 13.26 flores (intento 1).jpg',
    'dulce.webp':   '22-09 13.31 dulce (intento 1).jpg',
    'corazon.webp': '22-09 21.28 corazon (intento 1).jpg',
    'juntos.webp':  'final-juntos.jpg',
    'mitad-juan.webp': 'mitad-juan.jpg',
}

os.makedirs(DESTINO, exist_ok=True)
for destino, origen in FOTOS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(ORIGEN, origen))).convert('RGB')
    im.thumbnail((1200, 1200), Image.LANCZOS)
    ruta = os.path.join(DESTINO, destino)
    im.save(ruta, 'WEBP', quality=80, method=6)   # sin exif=: no se escriben metadatos
    print(f'{destino:18} {im.size[0]}x{im.size[1]}  {os.path.getsize(ruta)//1024} KB')
