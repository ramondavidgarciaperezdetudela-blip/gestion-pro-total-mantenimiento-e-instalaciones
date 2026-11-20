/**
 * Gestión Pro Total — Copias de seguridad en TU Google Drive (script v2).
 *
 * Este script se instala en la cuenta de Google de la EMPRESA. Las copias se
 * guardan en una carpeta de ese Drive; cada empresa instala el suyo.
 *
 * Cada copia se guarda en trozos dentro de su propia carpeta: así aguanta
 * copias de cientos de MB (con fotos) sin pararse a mitad.
 *
 * PASOS (la aplicación los enseña también, y ya te da la CLAVE puesta):
 *  1) Pega este código y, si no has copiado el de la aplicación, cambia
 *     CLAVE por una contraseña larga inventada por ti.
 *  2) Arriba, junto a «Ejecutar», elige la función «autorizar» y pulsa
 *     ▶ Ejecutar. Google pedirá permiso («Revisar permisos» → tu cuenta →
 *     «Avanzado» → «Ir a ... (no seguro)» → «Permitir»). ES NORMAL QUE LO
 *     DIGA «no seguro»: es tu propio script.
 *  3) Implementar > Nueva implementación > ⚙ Aplicación web
 *     Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *  4) Copia la dirección que termina en /exec y pégala en el programa.
 *
 * Si cambias algo del código después: Implementar > Administrar
 * implementaciones > ✏ > Versión: «Nueva versión» > Implementar.
 */
var CLAVE = 'CAMBIA-ESTA-CLAVE';
var CARPETA = 'Gestión Pro Total - Copias';
var CARPETA_ID = '';   // opcional: id de una carpeta tuya concreta de Drive
var VERSION = 2;

function carpeta_() {
  if (CARPETA_ID) return DriveApp.getFolderById(CARPETA_ID);
  var it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}
function limpio_(n) { return String(n || 'copia.json').replace(/[\\\/:*?"<>|]/g, '_'); }
function parte_(k) { return ('00000' + k).slice(-5) + '.txt'; }
function salida_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Ejecútala UNA vez desde el editor (▶): hace que Google pida el permiso para usar tu Drive. */
function autorizar() {
  var d = carpeta_();
  Logger.log('Listo. Las copias irán a la carpeta «' + d.getName() + '» de tu Drive: ' + d.getUrl());
}

// Abrir el enlace en el navegador: si ves este mensaje, el enlace está bien publicado.
function doGet() {
  return salida_({ ok: true, version: VERSION, claveCambiada: CLAVE !== 'CAMBIA-ESTA-CLAVE', mensaje: 'Gestión Pro Total: el enlace funciona' });
}

function copiaCarpeta_(dir, nombre) {
  var it = dir.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : null;
}
function quitar_(dir, nombre) {
  var f = dir.getFoldersByName(nombre); while (f.hasNext()) f.next().setTrashed(true);
  var a = dir.getFilesByName(nombre); while (a.hasNext()) a.next().setTrashed(true);
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (CLAVE === 'CAMBIA-ESTA-CLAVE') return salida_({ ok: false, error: 'El script todavía lleva la clave de ejemplo «CAMBIA-ESTA-CLAVE». Cámbiala en el código por la que has puesto en el programa y vuelve a implementar (Nueva versión).' });
    if (p.clave !== CLAVE) return salida_({ ok: false, error: 'La clave no coincide con la del script. Tiene que ser exactamente la misma (mayúsculas y minúsculas).' });
    var dir = carpeta_();
    if (p.accion === 'probar') return salida_({ ok: true, version: VERSION, carpeta: dir.getName(), url: dir.getUrl() });

    // Subida: cada trozo es un fichero dentro de la carpeta de la copia.
    if (p.accion === 'parte') {
      var nombre = limpio_(p.nombre), c;
      if (p.n === 0) { quitar_(dir, nombre); c = dir.createFolder(nombre); }
      else { c = copiaCarpeta_(dir, nombre); if (!c) return salida_({ ok: false, error: 'Falta el principio de la copia' }); }
      var previos = c.getFilesByName(parte_(p.n)); while (previos.hasNext()) previos.next().setTrashed(true);
      c.createFile(parte_(p.n), p.datos, 'text/plain');
      return salida_({ ok: true });
    }
    // Cierre: se comprueba que están TODOS los trozos antes de dar la copia por buena.
    if (p.accion === 'cerrar') {
      var cc = copiaCarpeta_(dir, limpio_(p.nombre));
      if (!cc) return salida_({ ok: false, error: 'No existe esa copia' });
      for (var k = 0; k < p.partes; k++) {
        if (!cc.getFilesByName(parte_(k)).hasNext()) return salida_({ ok: false, error: 'Falta el trozo ' + (k + 1) + ' de ' + p.partes });
      }
      cc.createFile('OK.txt', String(p.partes), 'text/plain');
      return salida_({ ok: true, partes: p.partes });
    }

    if (p.accion === 'listar') {
      var lista = [], fo = dir.getFolders();
      while (fo.hasNext()) {
        var x = fo.next();
        if (!x.getFilesByName('OK.txt').hasNext()) continue;       // subida sin terminar: no se ofrece
        var bytes = 0, fi = x.getFiles();
        while (fi.hasNext()) bytes += fi.next().getSize();
        lista.push({ nombre: x.getName(), bytes: bytes, fecha: x.getLastUpdated().toISOString() });
      }
      var fs = dir.getFiles();                                      // copias de la versión 1 (un solo fichero)
      while (fs.hasNext()) {
        var y = fs.next();
        if (/\.json$/i.test(y.getName())) lista.push({ nombre: y.getName(), bytes: y.getSize(), fecha: y.getLastUpdated().toISOString() });
      }
      lista.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
      return salida_({ ok: true, copias: lista.slice(0, 50) });
    }

    if (p.accion === 'leer') {
      var nom = limpio_(p.nombre), largo = p.largo || 1000000, desde = p.desde || 0;
      var cr = copiaCarpeta_(dir, nom);
      if (cr) {
        var ok = cr.getFilesByName('OK.txt');
        if (!ok.hasNext()) return salida_({ ok: false, error: 'Esa copia no se terminó de subir' });
        var n = parseInt(ok.next().getBlob().getDataAsString(), 10);
        var k2 = Math.floor(desde / largo);
        var it3 = cr.getFilesByName(parte_(k2));
        var datos = it3.hasNext() ? it3.next().getBlob().getDataAsString() : '';
        var total = (n - 1) * largo + cr.getFilesByName(parte_(n - 1)).next().getBlob().getDataAsString().length;
        return salida_({ ok: true, total: total, datos: datos });
      }
      var it2 = dir.getFilesByName(nom);
      if (!it2.hasNext()) return salida_({ ok: false, error: 'No existe esa copia' });
      var txt = it2.next().getBlob().getDataAsString();
      return salida_({ ok: true, total: txt.length, datos: txt.substr(desde, largo) });
    }
    return salida_({ ok: false, error: 'Acción desconocida (¿script antiguo? Copia el nuevo desde el programa)' });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  }
}
