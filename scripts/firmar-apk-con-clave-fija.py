#!/usr/bin/env python3
"""
Declara en android/app/build.gradle la clave con la que se firma el APK.

Por qué hace falta: `npx cap add android` regenera el proyecto Android entero
en cada compilación, sin ninguna configuración de firma. Sin ella, Gradle usa
su clave de depuración «por defecto» y, en un servidor de compilación limpio,
**se la inventa nueva cada vez** (CN=Android Debug, con fecha del día). Cada
APK salía firmado con una clave distinta, así que Android no lo reconocía como
una actualización y obligaba a desinstalar la versión anterior, perdiendo los
datos de la aplicación.

Copiar la clave a ~/.android/debug.keystore no bastaba: se comprobó
descargando el APK publicado y leyendo su firma, y llevaba la clave inventada,
no la del repositorio. Así que aquí se declara de forma explícita, que no
depende de dónde busque Gradle.

Uso:
    python3 scripts/firmar-apk-con-clave-fija.py [ruta-build.gradle]
"""

import re
import sys

BLOQUE_FIRMA = """
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
"""


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else 'android/app/build.gradle'
    texto = open(ruta).read()

    if 'signingConfigs' in texto:
        print('build.gradle ya tenía signingConfigs; no se toca.')
        return 0

    # Dentro del bloque android { … }, nada más abrirlo.
    texto, n = re.subn(r'(\nandroid\s*\{)', r'\1' + BLOQUE_FIRMA, texto, count=1)
    if n != 1:
        print('ERROR: no se ha encontrado el bloque "android {" en', ruta, file=sys.stderr)
        return 1

    # Que el tipo de compilación debug use esa firma, sin depender del
    # comportamiento por defecto de la versión de Gradle que toque.
    texto, n2 = re.subn(
        r'(\n(\s*)buildTypes\s*\{)',
        r'\1\n\2    debug {\n\2        signingConfig signingConfigs.debug\n\2    }',
        texto, count=1)

    open(ruta, 'w').write(texto)
    print(f'Firma declarada en {ruta} (buildTypes retocado: {"sí" if n2 == 1 else "no"})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
