/**
 * trabajoFotosPdf.js — «Fotos desde PDF» en segundo plano.
 *
 * Vive fuera de las pantallas: si cambias de página sigue leyendo el PDF y el panel fijo
 * (FotosEnSegundoPlano) enseña cada paso desde cualquier pantalla. Nada bloquea el programa.
 */
import { base44 } from '@/api/base44Client';
import { recuperarImagenesDePdf } from '@/lib/imagenesPdf';
import { recuperarFotosPorCodigo } from '@/lib/catalogoRevistaPdf';
import { MOTIVO_SIN_FOTO } from '@/lib/informeFotos';
import { avisarFotoNueva } from '@/lib/trabajoFotos';

const MAX_PASOS = 40;
const vacio = { fase: 'ninguna', archivo: '', nArchivo: 0, totalArchivos: 0, pagina: 0, totalPaginas: 0, avance: 0, inicio: 0, fin: 0, encontradas: 0, fallos: 0, filasInforme: [], cancelado: false, pasos: [] };
let estado = { ...vacio };
let control = null;
const oyentes = new Set();
const emitir = () => oyentes.forEach((f) => f());

export const leerTrabajoFotosPdf = () => estado;
export const suscribirTrabajoFotosPdf = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const detenerTrabajoFotosPdf = () => { control?.abort(); };
export const cerrarTrabajoFotosPdf = () => { if (estado.fase !== 'leyendo') { estado = { ...vacio }; emitir(); } };
const poner = (cambios) => { estado = { ...estado, ...cambios }; emitir(); };
const paso = (txt, tipo = 'info') => { estado = { ...estado, pasos: [{ txt, tipo, t: Date.now() }, ...estado.pasos].slice(0, MAX_PASOS) }; };

/**
 * Lee los PDF y pone a cada artículo sin foto la que lleva su referencia dentro del PDF.
 * `precios`: lista de artículos de la pantalla. Devuelve false si no hay nada que hacer o ya hay uno en marcha.
 */
export function iniciarTrabajoFotosPdf({ archivos, precios, idProveedor = 'all' }) {
  if (estado.fase === 'leyendo' || !archivos?.length) return false;
  const lista = precios.filter((p) => !p.image_url && p.product_code && (idProveedor === 'all' || p.supplier_id === idProveedor));
  if (!lista.length) return false;
  const porId = new Map(lista.map((p) => [p.id, p]));
  const filaDe = (id, motivo, pagina, archivo) => { const p = porId.get(id) || {}; return { proveedor: p.supplier_name, codigo: p.product_code, nombre: p.product_name, motivo, pagina, archivo }; };
  control = new AbortController();
  const senal = control.signal;
  const inicio = Date.now();
  const bytesTotal = archivos.reduce((t, f) => t + f.size, 0) || 1;
  let bytesHechos = 0; let encontradas = 0; let nFallos = 0; let cancelado = false;
  const informe = []; const guardados = new Set();
  let pendientes = lista.map((p) => ({ id: p.id, codigo: p.product_code, nombre: p.product_name }));
  estado = { ...vacio, fase: 'leyendo', inicio, totalArchivos: archivos.length };
  paso(`Empiezo: ${lista.length.toLocaleString('es-ES')} artículos sin foto, ${archivos.length} PDF`);
  emitir();

  (async () => {
    // fotos nuevas hacia la lista, agrupadas cada medio segundo
    let cola = []; let t = null;
    const volcar = () => { t = null; const l = cola; cola = []; for (const x of l) avisarFotoNueva({ ids: [x.id], url: x.url }); };
    try {
      for (let n = 0; n < archivos.length; n++) {
        const f = archivos[n];
        if (!pendientes.length || senal.aborted) break;
        let ultimaMarca = 0;
        const actualizar = (extra = {}) => poner({ archivo: f.name, nArchivo: n + 1, avance: bytesHechos / bytesTotal, encontradas, fallos: nFallos, ...extra });
        actualizar(); paso(`Leyendo ${f.name} (${n + 1} de ${archivos.length})`);
        const enCurso = new Set();
        const guardar = async ({ id, dataUrl }) => {
          while (enCurso.size >= 4) await Promise.race(enCurso);
          const tt = (async () => {
            try {
              await base44.entities.SupplierPrice.update(id, { image_url: dataUrl });
              cola.push({ id, url: dataUrl }); if (!t) t = setTimeout(volcar, 500);
              guardados.add(id); encontradas++;
            } catch (e) { nFallos++; informe.push(filaDe(id, 'La foto se recuperó pero no se pudo guardar: ' + (e.message || e), null, f.name)); }
          })();
          enCurso.add(tt); tt.finally(() => enCurso.delete(tt));
        };
        const opciones = {
          senal, onFoto: guardar,
          onProgreso: ({ pagina, total }) => {
            actualizar({ pagina, totalPaginas: total, avance: (bytesHechos + f.size * (pagina / Math.max(total, 1))) / bytesTotal });
            if (pagina - ultimaMarca >= 25) { ultimaMarca = pagina; estado = { ...estado }; paso(`Página ${pagina} de ${total}: ${encontradas.toLocaleString('es-ES')} fotos guardadas`, 'ok'); emitir(); }
          },
        };
        let r = await recuperarFotosPorCodigo(f, pendientes, opciones);
        if (!r.encontradas.length && !r.cancelado && !senal.aborted) {
          paso('Pruebo el método clásico de lectura', 'aviso');
          const r2 = await recuperarImagenesDePdf(f, pendientes, opciones);
          r = { ...r2, fallos: [...r.fallos, ...r2.fallos] };
        }
        await Promise.all([...enCurso]);
        for (const x of r.fallos) { nFallos++; informe.push(x.id ? filaDe(x.id, x.motivo, x.pagina, f.name) : { proveedor: '', codigo: '', nombre: '', motivo: x.motivo, pagina: x.pagina, archivo: f.name }); }
        const fallidos = new Set(r.fallos.map((x) => x.id));
        pendientes = pendientes.filter((p) => !guardados.has(p.id) && !fallidos.has(p.id));
        bytesHechos += f.size;
        if (r.cancelado) cancelado = true;
        paso(`Terminado ${f.name}: ${encontradas.toLocaleString('es-ES')} fotos en total`, 'ok'); emitir();
      }
    } catch (e) {
      informe.push({ proveedor: '', codigo: '', nombre: '', motivo: 'Error al leer el PDF: ' + (e.message || e), archivo: '' });
      paso('No se pudo leer el PDF: ' + (e.message || e), 'error');
    }
    if (t) { clearTimeout(t); volcar(); }
    if (senal.aborted) cancelado = true;
    const yaEnInforme = new Set(informe.map((i) => i.codigo));
    if (!cancelado) for (const p of pendientes) { const pr = porId.get(p.id); if (pr && !yaEnInforme.has(pr.product_code)) informe.push(filaDe(p.id, MOTIVO_SIN_FOTO, null, '')); }
    paso(`${cancelado ? 'Detenido' : 'Terminado'}: ${encontradas.toLocaleString('es-ES')} fotos recuperadas, ${informe.length.toLocaleString('es-ES')} sin recuperar`, cancelado ? 'aviso' : 'ok');
    poner({ fase: 'terminado', cancelado, archivo: '', nArchivo: archivos.length, pagina: 0, totalPaginas: 0, avance: cancelado ? bytesHechos / bytesTotal : 1, fin: Date.now(), encontradas, fallos: nFallos, filasInforme: informe });
  })();
  return true;
}
