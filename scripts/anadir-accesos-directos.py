#!/usr/bin/env python3
"""
Accesos directos de la app de Android: al mantener pulsado el icono en la
pantalla de inicio salen SAT, Agenda, Clientes, Documentos, Plano frigorífico y
Copias de seguridad, y se pueden arrastrar a la pantalla de inicio como iconos
propios.

Cada acceso abre la app con una dirección gestionpro://app/<Pantalla>; la app
(componente AccesosDirectos) la lee y va a esa pantalla.

Se ejecuta DESPUÉS de `cap add android` / `cap sync`, que regeneran el proyecto.
Uso: python3 scripts/anadir-accesos-directos.py [carpeta-android]
"""
import re
import sys
from pathlib import Path

PAQUETE = "com.gestionprototal.app"
ACCESOS = [
    ("sat", "Nueva orden SAT", "SAT", "SAT"),
    ("agenda", "Agenda", "Agenda", "Agenda"),
    ("clientes", "Clientes", "Clientes", "Contacts"),
    ("documentos", "Documentos", "Documentos", "Documents"),
    ("plano", "Plano frigorífico", "Plano", "PlanoFrigorifico"),
    ("copias", "Copia de seguridad", "Copias", "BackupCenter"),
]


def main():
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "android")
    manifiesto = raiz / "app/src/main/AndroidManifest.xml"
    if not manifiesto.is_file():
        print("ERROR: no existe " + str(manifiesto) + ". Falta ejecutar 'cap add android'.")
        return 1

    res = raiz / "app/src/main/res"
    (res / "xml").mkdir(parents=True, exist_ok=True)
    (res / "values").mkdir(parents=True, exist_ok=True)

    cadenas = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"]
    atajos = ['<?xml version="1.0" encoding="utf-8"?>',
              '<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">']
    for i, (clave, largo, corto, ruta) in enumerate(ACCESOS):
        cadenas.append('    <string name="acceso_%s_largo">%s</string>' % (clave, largo))
        cadenas.append('    <string name="acceso_%s_corto">%s</string>' % (clave, corto))
        atajos.append(
            '    <shortcut android:shortcutId="%s" android:enabled="true" android:icon="@mipmap/ic_launcher"\n'
            '        android:shortcutShortLabel="@string/acceso_%s_corto"\n'
            '        android:shortcutLongLabel="@string/acceso_%s_largo">\n'
            '        <intent android:action="android.intent.action.VIEW"\n'
            '            android:targetPackage="%s"\n'
            '            android:targetClass="%s.MainActivity"\n'
            '            android:data="gestionpro://app/%s" />\n'
            '    </shortcut>' % (clave, clave, clave, PAQUETE, PAQUETE, ruta))
    cadenas.append("</resources>")
    atajos.append("</shortcuts>")
    (res / "values/accesos_directos.xml").write_text("\n".join(cadenas) + "\n", encoding="utf-8")
    (res / "xml/shortcuts.xml").write_text("\n".join(atajos) + "\n", encoding="utf-8")

    texto = manifiesto.read_text(encoding="utf-8")
    if "android.app.shortcuts" in texto:
        print("el manifiesto ya tiene los accesos directos")
        return 0
    # La actividad principal: la que lleva el filtro LAUNCHER.
    m = re.search(r"<activity\b(?:(?!</activity>).)*?android\.intent\.category\.LAUNCHER.*?</activity>", texto, re.S)
    if not m:
        print("ERROR: no encuentro la actividad principal en el manifiesto")
        return 1
    bloque = m.group(0)
    extra = (
        '\n            <meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />\n'
        '            <intent-filter>\n'
        '                <action android:name="android.intent.action.VIEW" />\n'
        '                <category android:name="android.intent.category.DEFAULT" />\n'
        '                <category android:name="android.intent.category.BROWSABLE" />\n'
        '                <data android:scheme="gestionpro" android:host="app" />\n'
        '            </intent-filter>\n        '
    )
    nuevo = bloque[: -len("</activity>")] + extra + "</activity>"
    manifiesto.write_text(texto.replace(bloque, nuevo, 1), encoding="utf-8")
    print("accesos directos añadidos: " + ", ".join(a[0] for a in ACCESOS))
    return 0


if __name__ == "__main__":
    sys.exit(main())
