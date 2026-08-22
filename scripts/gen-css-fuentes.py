#!/usr/bin/env python3
"""Genera src/fuentes.css con las letras INCRUSTADAS.

Por qué incrustadas y no como fichero aparte: el programa de escritorio se
carga desde file:// y el APK desde un origen propio. Una ruta como
"/fuentes/inter.woff2" resuelve bien en la web y en ningún otro sitio, así
que las letras se verían solo en el navegador — el fallo más fácil de no
notar, porque en desarrollo funciona.

Yendo dentro del propio CSS funcionan en los tres sitios y sin conexión.
"""
import base64, os, io

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTES = os.path.join(RAIZ, 'public', 'fuentes')

FAMILIAS = [
    ('Atkinson Hyperlegible', 'atkinson'),
    ('Inter', 'inter'),
    ('Open Sans', 'opensans'),
    ('Lato', 'lato'),
    ('Roboto', 'roboto'),
    ('Merriweather', 'merriweather'),
    ('Source Serif 4', 'sourceserif'),
    ('JetBrains Mono', 'jetbrainsmono'),
]

out = ['''/* Letras incluidas en el programa. FICHERO GENERADO: no editar a mano.
 * Se rehace con  python3 scripts/gen-css-fuentes.py
 *
 * Van incrustadas dentro del CSS a propósito. Una ruta a un fichero suelto
 * solo resuelve en la web; en el programa de escritorio (file://) y en el
 * APK no, y las letras no se verían. Así funcionan en los tres sitios y sin
 * conexión.
 *
 * Licencias: public/fuentes/LEEME-LICENCIAS.txt (SIL OFL 1.1 y Apache 2.0).
 */
''']

total = 0
for familia, base in FAMILIAS:
    for peso, sufijo in ((400, ''), (700, '-negrita')):
        ruta = os.path.join(FUENTES, f'{base}{sufijo}.woff2')
        datos = open(ruta, 'rb').read()
        total += len(datos)
        b64 = base64.b64encode(datos).decode('ascii')
        out.append(f"""@font-face {{
  font-family: '{familia}';
  src: url(data:font/woff2;base64,{b64}) format('woff2');
  font-weight: {peso}; font-style: normal; font-display: swap;
}}""")

io.open(os.path.join(RAIZ, 'src', 'fuentes.css'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'{len(FAMILIAS)} familias, {len(FAMILIAS)*2} ficheros, {total//1024} KB de letra incrustada.')
