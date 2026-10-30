#!/usr/bin/env python3
"""
Deja que la app de Android hable con la IA gratuita del ordenador por el wifi.

El problema: desde Android 9, el sistema BLOQUEA por defecto las conexiones
sin cifrar (http). La IA gratuita corre en el ordenador de casa o del taller y
se le habla por http a una dirección de la red local (192.168.x.x), porque un
ordenador de casa no tiene certificado https de nadie. Sin este permiso, la
llamada no sale del móvil y no se ve ningún error claro: simplemente no va.

Se permite el tráfico sin cifrar a secas porque el sistema de Android NO
admite comodines para direcciones IP: no hay forma de decir «solo 192.168.*».
Esto no rebaja la seguridad de lo demás: todo lo que la aplicación manda a
internet (Base44, OpenRouter, las descargas) va por https porque así están
escritas sus direcciones, y eso no cambia. Lo único que se abre es poder
hablar con un ordenador de la propia red.

Se ejecuta DESPUÉS de `cap add android` / `cap sync`, porque esos comandos
regeneran el proyecto entero y se llevarían por delante este cambio.

Uso: python3 scripts/permitir-ia-en-red-local.py [carpeta-android]
"""
import re
import sys
from pathlib import Path

CONFIG_RED = """<?xml version="1.0" encoding="utf-8"?>
<!--
  Permite hablar con la IA gratuita que corre en el ordenador de la red local
  (http://192.168.x.x). Android lo bloquea por defecto desde la versión 9 y no
  admite comodines para direcciones IP, así que hay que permitirlo en general.
  Todo lo que va a internet sigue yendo por https igualmente.
-->
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
"""

ATRIBUTOS = (
    'android:networkSecurityConfig="@xml/network_security_config"\n'
    '        android:usesCleartextTraffic="true"'
)


def main():
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "android")
    manifiesto = raiz / "app/src/main/AndroidManifest.xml"
    if not manifiesto.is_file():
        print("ERROR: no existe " + str(manifiesto) + ". Falta ejecutar 'cap add android'.")
        return 1

    xml = raiz / "app/src/main/res/xml"
    xml.mkdir(parents=True, exist_ok=True)
    (xml / "network_security_config.xml").write_text(CONFIG_RED, encoding="utf-8")
    print("escrito " + str(xml / "network_security_config.xml"))

    texto = manifiesto.read_text(encoding="utf-8")
    if "networkSecurityConfig" in texto:
        print("el permiso ya estaba en el manifiesto")
        return 0

    # Se engancha a la etiqueta <application ...>, respetando lo que ya tenga.
    nuevo, cuantos = re.subn(r"(<application\b)", r"\1\n        " + ATRIBUTOS, texto, count=1)
    if cuantos != 1:
        print("ERROR: no se encuentra la etiqueta <application> en el manifiesto")
        return 1
    manifiesto.write_text(nuevo, encoding="utf-8")

    # Comprobar que ha quedado, en vez de fiarse.
    final = manifiesto.read_text(encoding="utf-8")
    if "networkSecurityConfig" not in final or "usesCleartextTraffic" not in final:
        print("ERROR: el manifiesto no ha quedado con el permiso")
        return 1
    print("el manifiesto ya permite hablar con la IA de la red local")
    return 0


if __name__ == "__main__":
    sys.exit(main())
