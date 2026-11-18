/**
 * trabajoFotos.js — Búsqueda de fotos en internet que sigue en segundo plano.
 *
 * Vive fuera de las pantallas: si cambias de página o cierras la tarifa, la búsqueda sigue y el panel
 * fijo (FotosEnSegundoPlano) enseña cada paso. Va en paralelo (6 a la vez) y cada artículo tiene un
 * tiempo máximo, así ninguna búsqueda lenta puede dejar el proceso parado.
 */
import { base44 } from '@/api/base44Client';
import { nombreBase } from '@/lib/imagenesProducto';
import { buscarImagenArticulo } from '@/lib/imagenesProductoApp';

const PARALELO = 12;
const TIEMPO_MAX_ARTICULO = 20000; // ms
const MAX_PASOS = 40;

const vacio = { activa: false, total: 0, hechos: 0, encontradas: 0, sinFoto: 0, enCurso: [], pasos: [], inicio: 0, fin: 0, detenido: false, aviso: '' };
let estado = { ...vacio };
let cancelar = false;
const oyentes = new Set(); const oyentesFoto = new Set();
const emitir = () => oyentes.forEach((f) => f());

export const leerTrabajoFotos = () => estado;
export const suscribirTrabajoFotos = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
/** La pantalla de tarifas se apunta aquí para pintar las fotos según llegan: f({ ids, url }) */
export const suscribirFotoNueva = (f) => { oyentesFoto.add(f); return () => oyentesFoto.delete(f); };
/** Otros trabajos en segundo plano (p. ej. fotos desde PDF) avisan aquí de las fotos nuevas para pintarlas en la lista. */
export const avisarFotoNueva = (x) => oyentesFoto.forEach((f) => f(x));
export const detenerTrabajoFotos = () => { cancelar = true; estado = { ...estado, detenido: true }; emitir(); };
export const cerrarTrabajoFotos = () => { if (!estado.activa) { estado = { ...vacio }; emitir(); } };

const conTiempo = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res({ ok: false, motivo: 'tiempo' }), ms))]);
const paso = (txt, tipo) => { estado = { ...estado, pasos: [{ txt, tipo, t: Date.now() }, ...estado.pasos].slice(0, MAX_PASOS) }; };

/**
 * Lanza la búsqueda para los artículos sin foto de `precios` (de un proveedor o de todos).
 * Devuelve false si no había nada que buscar o ya hay una en marcha.
 */
export function iniciarTrabajoFotos({ precios, idProveedor = 'all', proveedores = [] }) {
  if (estado.activa) return false;
  const sinFoto = precios.filter((p) => !p.image_url && (idProveedor === 'all' || p.supplier_id === idProveedor));
  if (!sinFoto.length) return false;
  const web = (it) => ({ ...it, supplier_web: proveedores.find((x) => x.id === it.supplier_id)?.website || '' });
  // Mismo producto en varias medidas = una sola búsqueda: todas usan la foto principal
  const clave = (p) => `${p.supplier_id || ''}|${nombreBase(p.product_name).toLowerCase()}|${String(p.notes || '').toLowerCase().slice(0, 60)}`;
  const conFotoDe = new Map();
  for (const p of precios) if (p.image_url && nombreBase(p.product_name)) { const k = clave(p); if (!conFotoDe.has(k)) conFotoDe.set(k, p.image_url); }
  const grupos = new Map();
  for (const p of sinFoto) { const k = nombreBase(p.product_name) ? clave(p) : `id|${p.id}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); }
  const pendientes = [...grupos.entries()].map(([k, lista]) => ({ k, lista }));

  cancelar = false;
  estado = { ...vacio, activa: true, total: sinFoto.length, inicio: Date.now(), pasos: [], enCurso: [] };
  paso(`Empiezo: ${sinFoto.length.toLocaleString('es-ES')} artículos sin foto (${pendientes.length.toLocaleString('es-ES')} búsquedas distintas)`, 'info');
  emitir();

  let idx = 0;
  const poner = async (lista, url) => {
    // Todas las fotos del grupo se guardan en UNA escritura (los servidores limitan las peticiones por minuto)
    try { await base44.entities.SupplierPrice.bulkUpdate(lista.map((it) => ({ id: it.id, image_url: url }))); } catch { /* se reintenta una a una */
      for (const it of lista) await base44.entities.SupplierPrice.update(it.id, { image_url: url }).catch(() => null);
    }
    oyentesFoto.forEach((f) => f({ ids: lista.map((x) => x.id), url }));
  };
  const trabajador = async () => {
    while (idx < pendientes.length && !cancelar) {
      const { k, lista } = pendientes[idx++];
      const nombre = String(lista[0].product_name || lista[0].product_code || '').slice(0, 60);
      estado = { ...estado, enCurso: [...estado.enCurso, nombre] }; emitir();
      let encontrada = false; let compartida = false;
      try {
        if (conFotoDe.has(k)) { await poner(lista, conFotoDe.get(k)); encontrada = true; compartida = true; }
        else {
          const res = await conTiempo(buscarImagenArticulo(web(lista[0])), TIEMPO_MAX_ARTICULO);
          if (res?.motivo === 'sin_conexion' || res?.motivo === 'sin_motor') { estado = { ...estado, aviso: res.mensaje || 'No hay conexión para buscar fotos.' }; paso(estado.aviso, 'error'); cancelar = true; }
          else if (res?.ok) { await poner(lista, res.url); encontrada = true; conFotoDe.set(k, res.url); }
          else if (res?.motivo === 'tiempo') paso(`Tardó demasiado, la salto: ${nombre}`, 'aviso');
        }
      } catch { /* seguir con el siguiente */ }
      const n = lista.length;
      estado = {
        ...estado, hechos: estado.hechos + n,
        encontradas: estado.encontradas + (encontrada ? n : 0), sinFoto: estado.sinFoto + (encontrada ? 0 : n),
        enCurso: estado.enCurso.filter((x, i, a) => a.indexOf(x) !== i || x !== nombre),
      };
      if (encontrada || n > 1 || estado.hechos % 5 === 0) paso(encontrada ? `${compartida ? 'Misma foto principal' : 'Foto encontrada'}: ${nombre}${n > 1 ? ` (+${n - 1} medidas)` : ''}` : `Sin foto: ${nombre}`, encontrada ? 'ok' : 'aviso');
      emitir();
      await new Promise((r) => setTimeout(r, 30)); // deja respirar a la pantalla
    }
  };
  Promise.all(Array.from({ length: Math.min(PARALELO, pendientes.length) }, trabajador)).then(() => {
    estado = { ...estado, activa: false, enCurso: [], fin: Date.now() };
    paso(`${estado.detenido ? 'Detenido' : 'Terminado'}: ${estado.encontradas.toLocaleString('es-ES')} con foto, ${estado.sinFoto.toLocaleString('es-ES')} sin encontrar`, estado.detenido ? 'aviso' : 'info');
    emitir();
  });
  return true;
}
