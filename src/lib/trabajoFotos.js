/**
 * trabajoFotos.js — Búsqueda de fotos en internet que sigue en segundo plano.
 *
 * Vive fuera de las pantallas: si cambias de página o cierras la tarifa, la búsqueda sigue y el panel
 * fijo (FotosEnSegundoPlano) enseña cada paso. Va en paralelo (6 a la vez) y cada artículo tiene un
 * tiempo máximo, así ninguna búsqueda lenta puede dejar el proceso parado.
 */
import { base44 } from '@/api/base44Client';
import { nombreBase } from '@/lib/imagenesProducto';
import { buscarImagenArticulo, datosDeCandidata } from '@/lib/imagenesProductoApp';

const PARALELO = 12;
const TIEMPO_MAX_ARTICULO = 20000; // ms
const MAX_PASOS = 40;

const vacio = { activa: false, total: 0, hechos: 0, encontradas: 0, sinFoto: 0, conPrecio: 0, porElegir: [], enCurso: [], pasos: [], inicio: 0, fin: 0, detenido: false, aviso: '' };
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
export const cerrarEleccionFotos = () => { estado = { ...estado, porElegir: [] }; emitir(); };
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
  const vacioNum = (v) => !(Number(v) > 0);
  const poner = async (lista, url, extra = {}) => {
    // Todas las fotos del grupo se guardan en UNA escritura (los servidores limitan las peticiones por minuto)
    try { await base44.entities.SupplierPrice.bulkUpdate(lista.map((it) => ({ id: it.id, image_url: url }))); } catch { /* se reintenta una a una */
      for (const it of lista) await base44.entities.SupplierPrice.update(it.id, { image_url: url }).catch(() => null);
    }
    // El precio y la descripción de la web son del artículo buscado (el primero del grupo); solo se rellenan si estaban vacíos
    const it0 = lista[0]; const campos = {};
    if (extra.precio && vacioNum(it0.cost_price)) campos.cost_price = extra.precio;
    if (extra.titulo && !String(it0.notes || '').trim()) campos.notes = String(extra.titulo).slice(0, 200);
    if (Object.keys(campos).length) { await base44.entities.SupplierPrice.update(it0.id, campos).catch(() => null); if (campos.cost_price) estado = { ...estado, conPrecio: estado.conPrecio + 1 }; }
    oyentesFoto.forEach((f) => f({ ids: lista.map((x) => x.id), url, extra: Object.keys(campos).length ? { [it0.id]: campos } : undefined }));
    return campos;
  };
  const trabajador = async () => {
    while (idx < pendientes.length && !cancelar) {
      const { k, lista } = pendientes[idx++];
      const nombre = String(lista[0].product_name || lista[0].product_code || '').slice(0, 60);
      estado = { ...estado, enCurso: [...estado.enCurso, nombre] }; emitir();
      let encontrada = false; let compartida = false; let porElegirAhora = false;
      try {
        if (conFotoDe.has(k)) { await poner(lista, conFotoDe.get(k)); encontrada = true; compartida = true; }
        else {
          const res = await conTiempo(buscarImagenArticulo(web(lista[0]), { revisar: true }), TIEMPO_MAX_ARTICULO);
          if (res?.motivo === 'sin_conexion' || res?.motivo === 'sin_motor') { estado = { ...estado, aviso: res.mensaje || 'No hay conexión para buscar fotos.' }; paso(estado.aviso, 'error'); cancelar = true; }
          else if (res?.motivo === 'varias') { estado = { ...estado, porElegir: [...estado.porElegir, { k, lista, nombre, candidatas: res.candidatas }] }; porElegirAhora = true; paso(`Varios resultados, lo decides al final: ${nombre}`, 'aviso'); }
          else if (res?.ok) { await poner(lista, res.url, { precio: res.precio, titulo: res.por === 'web' ? res.titulo : '' }); encontrada = true; conFotoDe.set(k, res.url); }
          else if (res?.motivo === 'tiempo') paso(`Tardó demasiado, la salto: ${nombre}`, 'aviso');
        }
      } catch { /* seguir con el siguiente */ }
      const n = lista.length;
      estado = {
        ...estado, hechos: estado.hechos + n,
        encontradas: estado.encontradas + (encontrada ? n : 0), sinFoto: estado.sinFoto + (encontrada || porElegirAhora ? 0 : n),
        enCurso: estado.enCurso.filter((x, i, a) => a.indexOf(x) !== i || x !== nombre),
      };
      if (encontrada || n > 1 || estado.hechos % 5 === 0) paso(encontrada ? `${compartida ? 'Misma foto principal' : 'Foto encontrada'}: ${nombre}${n > 1 ? ` (+${n - 1} medidas)` : ''}` : `Sin foto: ${nombre}`, encontrada ? 'ok' : 'aviso');
      emitir();
      await new Promise((r) => setTimeout(r, 30)); // deja respirar a la pantalla
    }
  };
  Promise.all(Array.from({ length: Math.min(PARALELO, pendientes.length) }, trabajador)).then(() => {
    estado = { ...estado, activa: false, enCurso: [], fin: Date.now() };
    paso(`${estado.detenido ? 'Detenido' : 'Terminado'}: ${estado.encontradas.toLocaleString('es-ES')} con foto, ${estado.conPrecio.toLocaleString('es-ES')} con precio, ${estado.sinFoto.toLocaleString('es-ES')} sin encontrar${estado.porElegir.length ? `, ${estado.porElegir.length} por elegir` : ''}`, estado.detenido ? 'aviso' : 'info');
    emitir();
  });
  return true;
}

/**
 * Aplica lo que la persona eligió entre varios resultados: [{ k, cand|null }].
 * Rellena foto, precio (si estaba vacío) y descripción (si estaba vacía) de cada artículo.
 */
export async function aplicarElecciones(elecciones) {
  let hechas = 0; let fallos = 0; let precios = 0;
  const lista = new Map(estado.porElegir.map((x) => [x.k, x]));
  for (const { k, cand } of elecciones) {
    const x = lista.get(k); if (!x || !cand) continue;
    try {
      const dat = await datosDeCandidata(cand);
      const it0 = x.lista[0];
      try { await base44.entities.SupplierPrice.bulkUpdate(x.lista.map((it) => ({ id: it.id, image_url: dat.url }))); } catch { for (const it of x.lista) await base44.entities.SupplierPrice.update(it.id, { image_url: dat.url }).catch(() => null); }
      const campos = {};
      if (dat.precio && !(Number(it0.cost_price) > 0)) { campos.cost_price = dat.precio; precios++; }
      if (dat.titulo && !String(it0.notes || '').trim()) campos.notes = String(dat.titulo).slice(0, 200);
      if (Object.keys(campos).length) await base44.entities.SupplierPrice.update(it0.id, campos).catch(() => null);
      oyentesFoto.forEach((f) => f({ ids: x.lista.map((i) => i.id), url: dat.url, extra: Object.keys(campos).length ? { [it0.id]: campos } : undefined }));
      hechas += x.lista.length;
    } catch { fallos++; }
  }
  estado = { ...estado, porElegir: [], encontradas: estado.encontradas + hechas, conPrecio: estado.conPrecio + precios };
  emitir();
  return { hechas, fallos, precios };
}
