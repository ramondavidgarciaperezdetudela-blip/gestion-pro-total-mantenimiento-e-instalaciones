#!/usr/bin/env python3
"""Regenera el inventario de código fuente para el Registro de la Propiedad
Intelectual.

Se hace a partir de lo que hay en Git de verdad, no a mano: en un depósito
registral el documento tiene que cuadrar con el código que se deposita, y a
mano se queda desfasado a la primera versión que pase.
"""
import subprocess, os, io, datetime, json, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)

def git(*a):
    return subprocess.check_output(['git', *a], text=True).splitlines()

version = json.load(io.open('package.json', encoding='utf-8'))['version']
commit = git('rev-parse', 'HEAD')[0]

EXT_FUENTE = ('.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.py', '.yml', '.json')
EXCLUIR = ('distribucion/', 'docs/', 'package-lock.json', 'android-signing/')

ficheros = []
for f in git('ls-files'):
    if any(f.startswith(x) or f == x for x in EXCLUIR):
        continue
    if not f.endswith(EXT_FUENTE):
        continue
    try:
        n = sum(1 for _ in io.open(f, encoding='utf-8', errors='ignore'))
    except OSError:
        continue
    ficheros.append((f, n))
ficheros.sort()

def cuenta(pref, ext=('.js', '.jsx')):
    return sum(1 for f, _ in ficheros if f.startswith(pref) and f.endswith(ext))

lineas_src = sum(n for f, n in ficheros if f.startswith('src/') and f.endswith(('.js', '.jsx', '.css')))

# Carpetas de src, con cuántos ficheros tiene cada una.
carpetas = {}
for f, _ in ficheros:
    if not f.startswith('src/'):
        continue
    partes = f.split('/')
    clave = '/'.join(partes[:2]) if len(partes) > 2 else f
    carpetas[clave] = carpetas.get(clave, 0) + 1

hoy = datetime.date.today().strftime('%d/%m/%Y')
out = [
    '# Inventario de código fuente',
    '',
    '> Listado de ficheros de código fuente que componen el programa, a efectos del',
    '> depósito en el Registro de la Propiedad Intelectual. Generado automáticamente',
    '> a partir del control de versiones (Git).',
    '',
    f'**Versión:** {version}  ',
    f'**Fecha de generación:** {hoy}  ',
    f'**Identificador de la revisión (commit):** `{commit}`',
    '',
    '## Resumen',
    '',
    '| Concepto | Valor |',
    '|---|---|',
    f'| Ficheros fuente (src + configuración + scripts) | {len(ficheros)} |',
    f'| Líneas de código (JS/JSX/CSS en src) | {lineas_src:,} |'.replace(',', '.'),
    f'| Páginas funcionales | {cuenta("src/pages/")} |',
    f'| Componentes | {cuenta("src/components/")} |',
    f'| Librerías propias | {cuenta("src/lib/")} |',
    '| Lenguajes | JavaScript, JSX, HTML, CSS, Python |',
    '| Sistema de construcción | Vite 6 · Electron · Capacitor |',
    '',
    '## Estructura de directorios',
    '',
    '```',
]
for c, n in sorted(carpetas.items(), key=lambda x: -x[1]):
    out.append(f'{n:5d}  {c}')
out += ['```', '', '## Listado completo de ficheros fuente', '',
        '| # | Fichero | Líneas |', '|---|---|---|']
for i, (f, n) in enumerate(ficheros, 1):
    out.append(f'| {i} | `{f}` | {n} |')
out += ['', f'**Total: {len(ficheros)} ficheros, '
        f'{sum(n for _, n in ficheros):,} líneas.**'.replace(',', '.'), '']

io.open('docs/propiedad-intelectual/INVENTARIO-CODIGO-FUENTE.md', 'w', encoding='utf-8').write('\n'.join(out))
print(f'Inventario regenerado: {len(ficheros)} ficheros, {lineas_src} líneas en src, '
      f'{cuenta("src/pages/")} páginas, {cuenta("src/components/")} componentes.')
