/**
 * Gestión Pro Total — Copias de seguridad en TU Google Drive.
 *
 * Este script se instala en la cuenta de Google de la EMPRESA (por ejemplo
 * empresa@gmail.com). Las copias se guardan en una carpeta de ese Drive.
 * Cada empresa instala el suyo: los datos nunca pasan por otra cuenta.
 *
 * 1) Cambia CLAVE por una contraseña larga inventada por ti.
 * 2) Implementar > Nueva implementación > Aplicación web
 *    Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 * 3) Copia la dirección que termina en /exec y pégala en el programa
 *    junto con la misma CLAVE.
 */
var CLAVE = 'CAMBIA-ESTA-CLAVE';
var CARPETA = 'Gestión Pro Total - Copias';
var CARPETA_ID = '';   // opcional: id de una carpeta tuya concreta de Drive

function carpeta_() {
  if (CARPETA_ID) return DriveApp.getFolderById(CARPETA_ID);
  var it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}
function limpio_(n) { return String(n || 'copia.json').replace(/[\\\/:*?"<>|]/g, '_'); }
function salida_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return salida_({ ok: true, mensaje: 'Gestión Pro Total: el enlace funciona' }); }

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (p.clave !== CLAVE || CLAVE === 'CAMBIA-ESTA-CLAVE') return salida_({ ok: false, error: 'Clave incorrecta' });
    var dir = carpeta_();
    if (p.accion === 'probar') return salida_({ ok: true, carpeta: dir.getName(), url: dir.getUrl() });

    if (p.accion === 'parte') {
      var nombre = limpio_(p.nombre);
      var it = dir.getFilesByName(nombre);
      var f;
      if (p.n === 0) {
        while (it.hasNext()) it.next().setTrashed(true);
        f = dir.createFile(nombre, p.datos, 'application/json');
      } else {
        if (!it.hasNext()) return salida_({ ok: false, error: 'Falta el principio del fichero' });
        f = it.next();
        f.setContent(f.getBlob().getDataAsString() + p.datos);
      }
      return salida_({ ok: true, bytes: f.getSize() });
    }

    if (p.accion === 'listar') {
      var fs = dir.getFiles(), lista = [];
      while (fs.hasNext()) {
        var x = fs.next();
        if (/\.json$/i.test(x.getName())) lista.push({ nombre: x.getName(), bytes: x.getSize(), fecha: x.getLastUpdated().toISOString() });
      }
      lista.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
      return salida_({ ok: true, copias: lista.slice(0, 50) });
    }

    if (p.accion === 'leer') {
      var it2 = dir.getFilesByName(limpio_(p.nombre));
      if (!it2.hasNext()) return salida_({ ok: false, error: 'No existe esa copia' });
      var txt = it2.next().getBlob().getDataAsString();
      return salida_({ ok: true, total: txt.length, datos: txt.substr(p.desde || 0, p.largo || 1000000) });
    }
    return salida_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  }
}
