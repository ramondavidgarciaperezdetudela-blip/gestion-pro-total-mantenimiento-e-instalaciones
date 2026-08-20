#!/usr/bin/env python3
"""
Mete en el proyecto de Android el trozo nativo que abre el EXPLORADOR DE
FICHEROS del sistema para guardar la copia de seguridad.

¿Por qué aquí dentro y no como dependencia de npm?
El plugin publicado para esto fija compileSdk 35 en su propio build.gradle, y
este proyecto compila contra el 36 (se lo exige androidx). Gradle se planta y
no compila NADA: ya pasó. Además era un plugin de un solo autor con una única
versión publicada; para sesenta líneas de código no compensa depender de eso.

Al ir dentro del módulo de la aplicación, hereda su compileSdk y no puede
haber conflicto de versiones.

Se ejecuta DESPUÉS de `cap add android` / `cap sync`, porque esos comandos
regeneran el proyecto entero y se llevarían por delante cualquier añadido.

Uso: python3 scripts/anadir-guardar-como.py [carpeta-android]
"""
import re
import sys
from pathlib import Path

PAQUETE_APP = "com.gestionprototal.app"

FUENTE_PLUGIN = """package com.gestionprototal.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/**
 * GuardarComo - abre el explorador de ficheros de Android para que el usuario
 * diga donde guardar un fichero, y lo escribe alli.
 *
 * Usa ACTION_CREATE_DOCUMENT, que es el cuadro del sistema donde se navega
 * por las carpetas del telefono, de la tarjeta o de Drive. Es la unica forma
 * limpia de dejar un fichero donde el usuario quiera: Android le da permiso a
 * la aplicacion para escribir SOLO en el fichero elegido, asi que no hacen
 * falta permisos de almacenamiento ni saltarse las restricciones de las
 * carpetas publicas.
 *
 * El contenido llega en base64 porque el puente con la pantalla mueve texto,
 * y una copia de seguridad lleva acentos y enies que se romperian si viajaran
 * como texto suelto.
 */
@CapacitorPlugin(name = "GuardarComo")
public class GuardarComo extends Plugin {

    @PluginMethod
    public void guardar(PluginCall call) {
        String nombre = call.getString("filename", "copia.json");
        String tipo = call.getString("mimeType", "application/json");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(tipo);
        intent.putExtra(Intent.EXTRA_TITLE, nombre);

        try {
            // startActivityForResult es la forma que documenta Capacitor y la
            // que usan sus propios plugins. Registrar el lanzador a mano en
            // load() revienta si la pantalla ya ha arrancado.
            startActivityForResult(call, intent, "alElegirCarpeta");
        } catch (Exception e) {
            call.reject("Este telefono no tiene explorador de ficheros: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void alElegirCarpeta(PluginCall call, ActivityResult resultado) {
        if (call == null) return;

        if (resultado.getResultCode() != Activity.RESULT_OK || resultado.getData() == null) {
            // Ha cerrado el explorador sin elegir. No es un fallo: la copia ya
            // esta guardada en el telefono.
            call.reject("cancelado");
            return;
        }

        Uri destino = resultado.getData().getData();
        if (destino == null) {
            call.reject("El sistema no devolvio ninguna carpeta");
            return;
        }

        try (OutputStream salida = getContext().getContentResolver().openOutputStream(destino)) {
            if (salida == null) throw new Exception("no se pudo abrir el fichero para escribir");
            salida.write(Base64.decode(call.getString("data", ""), Base64.DEFAULT));
            salida.flush();
            JSObject r = new JSObject();
            r.put("uri", destino.toString());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("No se pudo escribir el fichero: " + e.getMessage());
        }
    }
}
"""

MAIN_ACTIVITY = """package com.gestionprototal.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Se registra ANTES de super.onCreate: despues el puente ya esta
        // montado y el plugin no llegaria a tiempo.
        registerPlugin(GuardarComo.class);
        super.onCreate(savedInstanceState);
    }
}
"""

LINEA_ACTIVITY = 'implementation "androidx.activity:activity:$androidxActivityVersion"'
LINEA_APPCOMPAT = '    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"'


def main():
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "android")
    destino = raiz / "app/src/main/java" / PAQUETE_APP.replace(".", "/")
    if not destino.is_dir():
        print("ERROR: no existe " + str(destino) + ". Falta ejecutar 'cap add android'.")
        return 1

    plugin = destino / "GuardarComo.java"
    plugin.write_text(FUENTE_PLUGIN, encoding="utf-8")
    print("escrito " + str(plugin))

    # androidx.activity llega por appcompat, pero como es "implementation" de
    # otro modulo podria no estar expuesto al nuestro: se pone explicito y se
    # acaba la duda. La version ya la define Capacitor en variables.gradle.
    gradle = raiz / "app/build.gradle"
    if gradle.is_file():
        texto = gradle.read_text(encoding="utf-8")
        if "androidx.activity:activity" not in texto:
            if LINEA_APPCOMPAT not in texto:
                print("ERROR: no se encuentra donde anadir androidx.activity en app/build.gradle")
                return 1
            texto = texto.replace(
                LINEA_APPCOMPAT,
                LINEA_APPCOMPAT + "\n    " + LINEA_ACTIVITY,
                1,
            )
            gradle.write_text(texto, encoding="utf-8")
            if "androidx.activity:activity" not in gradle.read_text(encoding="utf-8"):
                print("ERROR: no se pudo anadir androidx.activity a app/build.gradle")
                return 1
            print("anadida la dependencia androidx.activity")
        else:
            print("androidx.activity ya estaba")

    activity = destino / "MainActivity.java"
    activity.write_text(MAIN_ACTIVITY, encoding="utf-8")
    print("reescrito " + str(activity))

    # Comprobar que ha quedado como debe, en vez de fiarse.
    texto_activity = activity.read_text(encoding="utf-8")
    if "registerPlugin(GuardarComo.class)" not in texto_activity:
        print("ERROR: MainActivity no registra el plugin")
        return 1
    if not re.search(r"registerPlugin\(GuardarComo\.class\);\s*\n\s*super\.onCreate", texto_activity):
        print("ERROR: el registro tiene que ir ANTES de super.onCreate")
        return 1

    fuente = plugin.read_text(encoding="utf-8")
    for trozo in ["ACTION_CREATE_DOCUMENT", "startActivityForResult", "@ActivityCallback"]:
        if trozo not in fuente:
            print("ERROR: al plugin le falta " + trozo)
            return 1

    print("OK: el explorador de ficheros queda dentro de la aplicacion")
    return 0


if __name__ == "__main__":
    sys.exit(main())
