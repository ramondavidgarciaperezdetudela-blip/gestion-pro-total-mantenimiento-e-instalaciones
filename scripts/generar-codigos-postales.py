#!/usr/bin/env python3
"""
Genera src/lib/cp-espana-datos.js: los codigos postales de Espana con el
municipio y la provincia a la que pertenecen.

DE DONDE SALEN LOS DATOS

  1) La relacion codigo postal -> codigo INE de municipio:
     https://github.com/inigoflores/ds-codigos-postales
     fichero data/codigos_postales_municipios.csv
     (procesado del Centro Nacional de Informacion Geografica, CNIG)

     OJO: ese repositorio tiene DOS ficheros. El que trae el nombre del
     municipio (codigos_postales_municipios_join.csv) esta INCOMPLETO: le
     faltan nueve provincias enteras, entre ellas Barcelona y Alicante. El
     bueno es codigos_postales_municipios.csv, que las trae todas, pero solo
     con el codigo del municipio, sin el nombre.

  2) Los nombres de los municipios por su codigo INE:
     https://github.com/IagoLast/pselect  fichero data/municipios.json
     Se usa para rellenar los nombres que el primero no trae. Las dos listas
     se han cotejado: de 11.830 nombres coinciden 11.822, y los 8 que no son
     variantes bilingues del mismo pueblo (Alboraia / Alboraya). Manda el
     nombre del primer repositorio cuando lo tiene.

LA PROVINCIA no viene en ningun sitio, pero sale sola: las dos primeras
cifras del codigo INE del municipio SON el codigo de provincia. Hay que
sacarla de ahi y no de las dos primeras cifras del codigo postal, que seria
lo facil: 25 codigos postales pertenecen a un municipio de otra provincia
(Yecla es de Murcia y su CP empieza por 03, que es Alicante). Con el atajo,
esos 25 saldrian con la provincia equivocada.

Uso:
  python3 scripts/generar-codigos-postales.py relacion.csv nombres.json [nombres.csv]
"""
import csv
import json
import sys
from pathlib import Path

SALIDA = Path("src/lib/cp-espana-datos.js")

CABECERA = """/**
 * cp-espana-datos.js - GENERADO AUTOMATICAMENTE. No editar a mano.
 *
 * Codigos postales de Espana con su municipio.
 *   Relacion CP-municipio: github.com/inigoflores/ds-codigos-postales (CNIG)
 *   Nombres de municipios: el mismo, completado con github.com/IagoLast/pselect
 *   Se regenera con: scripts/generar-codigos-postales.py
 *
 * {n_cp} codigos postales - {n_mun} municipios - {n_rel} relaciones.
 * Sin nombre de municipio: {sin_nombre} codigos postales (se ensena la provincia).
 *
 * Va en un fichero aparte y se carga solo cuando se busca un codigo postal:
 * son unos {kb} KB que no tienen por que pesar en el arranque.
 *
 * Formato, apretado a proposito:
 *   MUNICIPIOS  "codigoINE|nombre" - la posicion en la lista es su indice
 *   RELACION    "cp>indice,indice;cp>indice" - un codigo postal puede tocar
 *               varios municipios, por eso son varios indices
 */

"""


def cargar_nombres(rutas):
    """Nombres de municipio por codigo INE sin ceros delante."""
    nombres = {}
    # Primero el JSON (relleno), despues el CSV (manda).
    for ruta in rutas:
        p = Path(ruta)
        if not p.is_file():
            continue
        if p.suffix == ".json":
            for m in json.loads(p.read_text(encoding="utf-8")):
                mid = str(m.get("id", "")).lstrip("0")
                nombre = (m.get("nm") or "").strip()
                if mid and nombre:
                    nombres[mid] = nombre
        else:
            for f in csv.DictReader(open(p, encoding="utf-8")):
                mid = (f.get("municipio_id") or "").strip().lstrip("0")
                nombre = (f.get("nombre") or "").strip()
                if mid and nombre:
                    nombres[mid] = nombre
    return nombres


def main():
    if len(sys.argv) < 3:
        print("Uso: generar-codigos-postales.py relacion.csv nombres.json [nombres.csv]")
        return 1

    relaciones = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
    if not relaciones:
        print("El CSV de relaciones esta vacio")
        return 1
    nombres = cargar_nombres(sys.argv[2:])
    if not nombres:
        print("No se ha cargado ningun nombre de municipio")
        return 1

    municipios = {}
    orden = []
    relacion = {}
    sin_nombre = set()

    for f in relaciones:
        cp = (f.get("codigo_postal") or "").strip().zfill(5)
        mid = (f.get("municipio_id") or "").strip().lstrip("0")
        if len(cp) != 5 or not mid:
            continue
        nombre = nombres.get(mid)
        if not nombre:
            sin_nombre.add(cp)
            continue
        clave = mid.zfill(5)
        if clave not in municipios:
            municipios[clave] = len(orden)
            orden.append(clave + "|" + nombre)
        idx = municipios[clave]
        lista = relacion.setdefault(cp, [])
        if idx not in lista:
            lista.append(idx)

    if not relacion:
        print("No ha salido ningun codigo postal")
        return 1

    # Los que se han quedado sin ningun municipio con nombre.
    sin_nombre = {cp for cp in sin_nombre if cp not in relacion}

    cadena = ";".join(
        cp + ">" + ",".join(str(i) for i in idxs)
        for cp, idxs in sorted(relacion.items())
    )
    kb = (len(cadena) + sum(len(m) for m in orden)) // 1024

    texto = CABECERA.format(
        n_cp=len(relacion), n_mun=len(orden), n_rel=len(relaciones),
        sin_nombre=len(sin_nombre), kb=kb,
    )
    # json.dumps y no repr: hay municipios con apostrofo (L'Hospitalet) y
    # cambiar las comillas a lo bruto rompia el fichero generado.
    texto += "export const MUNICIPIOS = " + json.dumps(orden, ensure_ascii=False) + ";\n\n"
    texto += "export const RELACION = " + json.dumps(cadena) + ";\n"

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(texto, encoding="utf-8")

    # Comprobar en vez de fiarse: las 52 provincias tienen que estar.
    provincias = {orden[i].split("|")[0][:2] for i in range(len(orden))}
    faltan = [f"{i:02d}" for i in range(1, 53) if f"{i:02d}" not in provincias]
    print(f"escrito {SALIDA}: {len(relacion)} CP, {len(orden)} municipios, {kb} KB")
    print(f"codigos postales sin nombre de municipio: {len(sin_nombre)}")
    if faltan:
        print("ERROR: faltan provincias enteras: " + ", ".join(faltan))
        return 1
    print("OK: estan las 52 provincias")
    return 0


if __name__ == "__main__":
    sys.exit(main())
