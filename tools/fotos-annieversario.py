#!/usr/bin/env python3
"""Prepara las fotos del Annieversario para la web (repetible).

    python tools/fotos-annieversario.py

Lee ../aniversario/imagenes/ y escribe annieversario/fotos/<universo>-<n>.webp:
EXIF aplicado y SIN metadatos (repo público). El universo sale del nombre del
archivo (Minecraft1.png -> minecraft-1). Las capturas en pixel art van sin
pérdida para que los píxeles no se emborronen.

Al final imprime cada salida: copia las que falten al bloque de universos de
annieversario/index.html.
"""
import os
import re
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(os.path.dirname(RAIZ), 'aniversario', 'imagenes')
DEST = os.path.join(RAIZ, 'annieversario', 'fotos')

UNIVERSOS = [  # (patrón en el nombre, universo, sin pérdida)
    (r'minecraft', 'minecraft', False),
    (r'coc|clash', 'clash', True),
    (r'stardew', 'stardew', True),
    (r'sky', 'sky', False),
    (r'juntos', 'juntos', False),
]
LADO = 1600

os.makedirs(DEST, exist_ok=True)
cuenta = {}
for nombre in sorted(os.listdir(ORIG), key=lambda s: [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]):
    base = nombre.lower()
    regla = next((u for u in UNIVERSOS if re.search(u[0], base)), None)
    if not regla:
        print('?? sin universo, la salto:', nombre)
        continue
    _, uni, sin_perdida = regla
    cuenta[uni] = cuenta.get(uni, 0) + 1
    salida = f'{uni}-{cuenta[uni]}.webp'
    im = ImageOps.exif_transpose(Image.open(os.path.join(ORIG, nombre))).convert('RGB')
    im.thumbnail((LADO, LADO), Image.NEAREST if sin_perdida else Image.LANCZOS)
    if sin_perdida:
        im.save(os.path.join(DEST, salida), 'WEBP', lossless=True, method=6)
    else:
        im.save(os.path.join(DEST, salida), 'WEBP', quality=82, method=6)  # sin exif=
    print(f'{nombre:32} -> {salida:16} {im.size[0]}x{im.size[1]}  {os.path.getsize(os.path.join(DEST, salida)) // 1024} KB')
