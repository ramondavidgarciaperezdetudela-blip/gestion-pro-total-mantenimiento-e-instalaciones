// Planos de CADCraft en móvil y tableta.
// La versión web de CADCraft no puede descargar archivos dentro de la app de Android, así que
// cuando guarda un plano nos lo manda (mensaje «cadcraft:save») y aquí se guarda de verdad:
//  · Android: en Documentos/CADCraft del dispositivo, y se ofrece compartirlo.
//  · Navegador: descarga normal.
// Además se conserva una copia dentro de la app («Mis planos») para reabrirlos con un toque.

const BD = 'gpt-cadcraft';
const ALMACEN = 'planos';

export function nombreSeguro(nombre) {
  const limpio = String(nombre || 'Plano.dxf').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim().slice(0, 120);
  return limpio || 'Plano.dxf';
}

function abrirBD() {
  return new Promise((resolver, rechazar) => {
    try {
      const sol = indexedDB.open(BD, 1);
      sol.onupgradeneeded = () => sol.result.createObjectStore(ALMACEN, { keyPath: 'nombre' });
      sol.onsuccess = () => resolver(sol.result);
      sol.onerror = () => rechazar(sol.error);
    } catch (e) { rechazar(e); }
  });
}

async function operar(modo, fn) {
  const bd = await abrirBD();
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const r = fn(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(r?.result);
    tx.onerror = () => rechazar(tx.error);
  });
}

export async function guardarCopiaInterna(nombre, bytes) {
  await operar('readwrite', (a) => a.put({ nombre: nombreSeguro(nombre), bytes, fecha: Date.now() }));
}
export async function listarPlanos() {
  try {
    const todos = (await operar('readonly', (a) => a.getAll())) || [];
    return todos.sort((a, b) => b.fecha - a.fecha);
  } catch { return []; }
}
export async function borrarPlano(nombre) { await operar('readwrite', (a) => a.delete(nombre)); }

function aBase64(bytes) {
  let s = '';
  const u = new Uint8Array(bytes);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

function descargar(nombre, bytes) {
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Guarda el plano que manda CADCraft. Devuelve un texto para avisar al usuario y,
 * en Android, la dirección del archivo para poder compartirlo.
 */
export async function guardarPlano(nombreOriginal, bytes) {
  const nombre = nombreSeguro(nombreOriginal);
  try { await guardarCopiaInterna(nombre, bytes); } catch { /* sin copia interna: sigue */ }
  if (window.Capacitor?.isNativePlatform?.()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const path = `CADCraft/${nombre}`;
    await Filesystem.writeFile({ path, data: aBase64(bytes), directory: Directory.Documents, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Documents });
    return { nombre, donde: `Documentos/CADCraft/${nombre}`, uri };
  }
  descargar(nombre, bytes);
  return { nombre, donde: 'Descargas' };
}

export async function compartirPlano(nombre, uri) {
  const { Share } = await import('@capacitor/share');
  await Share.share({ title: nombre, text: nombre, url: uri, dialogTitle: 'Compartir plano' });
}
