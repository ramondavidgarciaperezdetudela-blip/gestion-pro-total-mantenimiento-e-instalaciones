// Archivos grandes en el propio aparato (modo local, sin servidor): se guardan APARTE, no dentro de los datos.
// Un catálogo de 300 MB metido en la ficha como texto haría lento todo el programa y no cabría en la memoria.
// En la ficha queda una dirección «gptblob:<id>»; al hacer clic en ella se abre o descarga el archivo.
const BD = 'gpt-archivos'; const TABLA = 'f';
export const UMBRAL_GRANDE = 8 * 1024 * 1024; // por debajo se sigue guardando dentro de la ficha (como siempre)
let abierta = null;

function abrir() {
  if (abierta) return abierta;
  abierta = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Este aparato no puede guardar archivos grandes.'));
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(TABLA);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return abierta;
}
const pedir = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const esArchivoLocal = (url) => typeof url === 'string' && url.startsWith('gptblob:');

export async function guardarArchivoLocal(archivo) {
  const db = await abrir();
  const id = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  await new Promise((res, rej) => {
    const tx = db.transaction(TABLA, 'readwrite');
    tx.objectStore(TABLA).put(archivo, id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('No hay espacio para guardar el archivo en este aparato.'));
  });
  return `gptblob:${id}`;
}
export async function leerArchivoLocal(url) {
  const db = await abrir();
  return pedir(db.transaction(TABLA, 'readonly').objectStore(TABLA).get(String(url).slice(8)));
}
export async function borrarArchivoLocal(url) {
  if (!esArchivoLocal(url)) return;
  try { const db = await abrir(); await pedir(db.transaction(TABLA, 'readwrite').objectStore(TABLA).delete(String(url).slice(8))); } catch { /* ya no estaba */ }
}

/** Abre o descarga un archivo local con su nombre. */
export async function descargarArchivoLocal(url, nombre) {
  const blob = await leerArchivoLocal(url);
  if (!blob) throw new Error('El archivo ya no está en este aparato.');
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = nombre || 'archivo'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}

// Un solo vigilante de clics para todo el programa: cualquier enlace «gptblob:» se abre aquí
if (typeof document !== 'undefined' && !globalThis.__gptBlobClics) {
  globalThis.__gptBlobClics = true;
  document.addEventListener('click', (ev) => {
    const a = ev.target?.closest?.('a[href^="gptblob:"]');
    if (!a) return;
    ev.preventDefault();
    descargarArchivoLocal(a.getAttribute('href'), a.getAttribute('download') || a.textContent?.trim()).catch((e) => alert(e.message || 'No se pudo abrir el archivo.'));
  }, true);
}
