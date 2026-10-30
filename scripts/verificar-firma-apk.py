#!/usr/bin/env python3
"""
Comprueba con qué clave está firmado un APK.

Para que Android deje instalar una versión ENCIMA de la anterior, las dos
tienen que estar firmadas con la MISMA clave. Si cambia la clave, Android
obliga a desinstalar y el usuario pierde los datos de la aplicación.

Esto se comprobaba «leyendo el workflow y dando por hecho que funcionaba», y
resultó que no: Gradle se generaba su propia clave de depuración en cada
compilación (CN=Android Debug, distinta cada vez) en vez de usar la fija del
repositorio. Por eso ahora se comprueba el APK ya construido, y si la clave no
es la que toca la compilación falla en vez de publicar un APK que obligue a
desinstalar.

Se lee la firma del esquema v2/v3, que va en el bloque de firma del ZIP (no en
META-INF, que es el esquema v1, ya en desuso).

Uso:
    python3 scripts/verificar-firma-apk.py <fichero.apk> <huella-sha256-esperada>

La huella se saca del keystore con:
    keytool -list -keystore android-signing/debug.keystore -storepass android
"""

import hashlib
import struct
import sys

ID_ESQUEMA_V2 = 0x7109871A
ID_ESQUEMA_V3 = 0xF05368C0
MAGIA = b'APK Sig Block 42'


def leer_campo(datos, pos):
    """Lee un campo con prefijo de longitud (uint32 little-endian)."""
    largo = struct.unpack_from('<I', datos, pos)[0]
    return datos[pos + 4:pos + 4 + largo], pos + 4 + largo


def certificados_del_apk(ruta):
    """Devuelve [(esquema, certificado_der), …] del APK."""
    with open(ruta, 'rb') as f:
        datos = f.read()

    magia = datos.rfind(MAGIA)
    if magia == -1:
        raise SystemExit('ERROR: el APK no tiene firma v2/v3 (bloque de firma no encontrado).')

    fin = magia + len(MAGIA)
    tamano = struct.unpack_from('<Q', datos, magia - 8)[0]
    inicio = fin - tamano - 8
    if struct.unpack_from('<Q', datos, inicio)[0] != tamano:
        raise SystemExit('ERROR: el bloque de firma está corrupto (los dos tamaños no coinciden).')

    encontrados = []
    pos = inicio + 8
    while pos < magia - 8:
        largo = struct.unpack_from('<Q', datos, pos)[0]
        identificador = struct.unpack_from('<I', datos, pos + 8)[0]
        valor = datos[pos + 12:pos + 8 + largo]

        if identificador in (ID_ESQUEMA_V2, ID_ESQUEMA_V3):
            esquema = 'v2' if identificador == ID_ESQUEMA_V2 else 'v3'
            firmantes, _ = leer_campo(valor, 0)
            p = 0
            while p < len(firmantes):
                firmante, p = leer_campo(firmantes, p)
                datos_firmados, _ = leer_campo(firmante, 0)
                # Dentro van: digests, certificados, atributos. Saltamos los digests.
                tras_digests = struct.unpack_from('<I', datos_firmados, 0)[0] + 4
                certs, _ = leer_campo(datos_firmados, tras_digests)
                q = 0
                while q < len(certs):
                    cert, q = leer_campo(certs, q)
                    encontrados.append((esquema, cert))
        pos += 8 + largo

    return encontrados


def con_dos_puntos(huella):
    return ':'.join(huella[i:i + 2] for i in range(0, len(huella), 2))


def main():
    if len(sys.argv) != 3:
        raise SystemExit(f'Uso: {sys.argv[0]} <fichero.apk> <huella-sha256-esperada>')

    apk = sys.argv[1]
    esperada = sys.argv[2].replace(':', '').replace(' ', '').upper()

    certificados = certificados_del_apk(apk)
    if not certificados:
        raise SystemExit('ERROR: no se ha encontrado ningún certificado en el APK.')

    print(f'Certificados encontrados en {apk}: {len(certificados)}')
    coincide = False
    for esquema, cert in certificados:
        huella = hashlib.sha256(cert).hexdigest().upper()
        marca = '  <-- es la esperada' if huella == esperada else ''
        print(f'  esquema {esquema}: {con_dos_puntos(huella)}{marca}')
        if huella == esperada:
            coincide = True

    print()
    if coincide:
        print('FIRMA CORRECTA: este APK se instala encima del anterior sin desinstalar.')
        return 0

    print('FIRMA INCORRECTA: el APK NO está firmado con la clave del repositorio.')
    print(f'  esperada: {con_dos_puntos(esperada)}')
    print('  Si se publica así, Android obligará a desinstalar la versión anterior')
    print('  y el usuario perderá los datos de la aplicación.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
