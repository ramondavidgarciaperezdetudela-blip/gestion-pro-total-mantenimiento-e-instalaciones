// Conecta los archivos grandes de la copia (archivosCopia.js) con el aparato real: archivos del modo local, del servidor propio…
import { base44 } from '@/api/base44Client';
import { leerConfig } from '@/nube/config';
import { peticion } from '@/nube/almacenRemoto';
import { listarArchivosLocales, guardarArchivoLocalConId, esArchivoLocal } from '@/nube/archivosLocales';
import { remapearUrls } from '@/lib/archivosCopia';

const modo = () => { try { return leerConfig(); } catch { return null; } };

/** Qué archivos grandes acompañan a la copia: los guardados en este aparato (modo local) y los del servidor propio que usan las fichas. */
export async function recogerArchivosParaCopia(urlsVistas = new Set()) {
  const items = [];
  for (const l of await listarArchivosLocales().catch(() => [])) {
    items.push({
      id: l.id, origen: 'local', nombre: l.id, tipo: '',
      abrir: async () => {
        const b = await l.leer(); if (!b) throw new Error('El archivo ya no está en este aparato.');
        return { reader: b.stream().getReader(), bytes: b.size };
      }
    });
  }
  const c = modo();
  if (c?.modo === 'servidor' && c.url) {
    for (const url of urlsVistas) {
      const nombre = decodeURIComponent(url.split('/').pop() || 'archivo').replace(/^[0-9a-f]{32}-(\d+-[0-9a-f]{6}-)?/, "");
      items.push({
        id: url, origen: 'servidor', nombre, tipo: '',
        abrir: async () => {
          const r = await peticion(url, { method: 'GET' });
          if (!r.body) throw new Error('El servidor no devolvió el archivo.');
          return { reader: r.body.getReader(), bytes: Number(r.headers.get('content-length')) || 0 };
        }
      });
    }
  }
  return items;
}

/**
 * Deja en este aparato los archivos de una copia y corrige las fichas para que apunten a ellos.
 * Si el aparato guarda archivos como la copia (mismo modo local) se conserva el mismo identificador; si no, se suben de nuevo.
 */
export async function restaurarArchivosDeCopia(archivos, datos, avisar) {
  const mapa = {}; const fallos = []; let hechos = 0;
  const c = modo();
  for (const [i, a] of archivos.entries()) {
    avisar?.(`Restaurando archivo ${i + 1}/${archivos.length}: ${a.nombre}`);
    if (a.guardado) { hechos++; continue; } // ya quedó en el aparato al leer la copia
    try {
      const archivo = new File([a.blob], a.nombre || 'archivo', { type: a.tipo || a.blob.type || 'application/octet-stream' });
      if (a.origen === 'local' && esArchivoLocal(a.id) && (!c || c.modo === 'local')) { await guardarArchivoLocalConId(archivo, a.id); hechos++; continue; }
      if (a.origen === 'servidor' && c?.modo === 'servidor' && c.url && a.id.startsWith(`${c.url.replace(/\/+$/, '')}/archivos/`)) {
        // Mismo servidor: si el archivo sigue ahí no hace falta subirlo otra vez
        const r = await peticion(a.id, { method: 'HEAD' }).catch(() => null);
        if (r && r.ok) { hechos++; continue; }
      }
      const res = await base44.integrations.Core.UploadFile({ file: archivo });
      const url = res?.file_url || res?.url; if (!url) throw new Error('No se pudo subir.');
      mapa[a.id] = url; hechos++;
    } catch (e) { fallos.push({ nombre: a.nombre, motivo: e?.message || String(e) }); }
  }
  const tocados = remapearUrls(datos, mapa);
  return { hechos, fallos, tocados };
}
