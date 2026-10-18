#!/usr/bin/env python3
"""Prepara las fotos del Mesiversario para la web (repetible).

    python tools/fotos-mesiversario.py

Lee los originales de ../originales/mesiversario/ y escribe en
mesiversario/fotos/ en WebP: EXIF aplicado (orientación) y SIN metadatos
(el repo es público: nada de GPS). Lado largo máx. 1400 px; cabecera 1600 px.
"""
import os
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(os.path.dirname(RAIZ), 'originales', 'mesiversario')
DEST = os.path.join(RAIZ, 'mesiversario', 'fotos')

FOTOS = [  # (origen relativo, salida, lado largo máx.)
    ('carrusel-site/00-cabecera.jpeg', 'cabecera.webp', 1600),
    ('carpeta-annie/IMG-20260321-WA0105.jpg', 'foto-1.webp', 1400),
    ('carpeta-annie/IMG-20260219-WA0538.jpg', 'foto-2.webp', 1400),
    ('carpeta-annie/IMG-20260212-WA0009.jpg', 'foto-3.webp', 1400),
    ('carpeta-annie/IMG-20260130-WA0077.jpg', 'foto-4.webp', 1400),
    ('carpeta-annie/DSC01183.JPG', 'foto-5.webp', 1400),
]

os.makedirs(DEST, exist_ok=True)
for src, out, lado in FOTOS:
    im = ImageOps.exif_transpose(Image.open(os.path.join(ORIG, src))).convert('RGB')
    im.thumbnail((lado, lado), Image.LANCZOS)
    im.save(os.path.join(DEST, out), 'WEBP', quality=80, method=6)  # sin exif=
    print(out, im.size, os.path.getsize(os.path.join(DEST, out)) // 1024, 'KB')

# la tarjeta (JPEG/PNG según salga) -> WebP también, sin metadatos
g = ImageOps.exif_transpose(Image.open(os.path.join(ORIG, 'gift card.jpg'))).convert('RGB')
g.thumbnail((900, 900), Image.LANCZOS)
g.save(os.path.join(DEST, 'gift-card.webp'), 'WEBP', quality=85, method=6)
print('gift-card.webp', g.size)
