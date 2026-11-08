// Conecta la búsqueda de imágenes (imagenesProducto.js) con el aparato real:
// escritorio (Electron), móvil (Capacitor) o navegador.
import { buscarImagenProducto, motoresPorDefecto, reducirImagen, ajustesGoogle } from '@/lib/imagenesProducto';
import { base44 } from '@/api/base44Client';
import { esAppMovil, ajustesIA, consultarIA } from '@/lib/proveedorIA';

async function textoNativo(url) {
  const { CapacitorHttp } = await import('@capacitor/core');
  const r = await CapacitorHttp.get({ url, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36', 'Accept-Language': 'es-ES,es;q=0.9' }, connectTimeout: 15000, readTimeout: 15000 });
  if (r.status < 200 || r.status >= 300) throw new Error(`El buscador respondió ${r.status}.`);
  return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
}
async function imagenNativa(url) {
  const { CapacitorHttp } = await import('@capacitor/core');
  const r = await CapacitorHttp.get({ url, responseType: 'blob', connectTimeout: 15000, readTimeout: 20000 });
  const tipo = String(r.headers?.['Content-Type'] || r.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (r.status < 200 || r.status >= 300 || !/^image\//.test(tipo) || typeof r.data !== 'string') throw new Error('No es una imagen.');
  return `data:${tipo};base64,${r.data}`;
}

function crearPuente() {
  if (typeof window !== 'undefined' && window.gptImg?.disponible) {
    return {
      texto: async (u) => { const r = await window.gptImg.texto(u); if (!r?.ok) throw new Error(r?.error || 'Sin respuesta'); return r.texto; },
      imagen: async (u) => { const r = await window.gptImg.imagen(u); if (!r?.ok) throw new Error(r?.error || 'Sin imagen'); return r.dataUrl; }
    };
  }
  if (esAppMovil()) return { texto: textoNativo, imagen: imagenNativa };
  return null;
}

const carga = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth > 40); i.onerror = () => res(false); i.src = url; setTimeout(() => res(false), 8000); });

/** La IA elige entre las candidatas dudosas (por nombre). Usa la IA configurada; si falla, se sigue por puntos. */
async function elegirConIA(cands, datos) {
  const cfg = ajustesIA();
  if (cfg.proveedor === 'base44') return null; // no gastar créditos de Base44 en esto
  const lista = cands.map((c, i) => `${i}: ${c.titulo} (${c.pagina})`).join('\n');
  const r = await consultarIA({
    prompt: `Elige la imagen que mejor corresponde al producto «${datos.nombre}»${datos.marca ? ` de ${datos.marca}` : ''}${datos.codigo ? `, referencia ${datos.codigo}` : ''}. Candidatas:\n${lista}\nDevuelve el número de la mejor, o -1 si ninguna sirve.`,
    response_json_schema: { type: 'object', properties: { indice: { type: 'number' } } }
  }, cfg);
  const i = Number(r?.indice);
  return Number.isInteger(i) && i >= 0 ? i : null;
}

/** Busca la foto de un artículo de tarifa: por código del proveedor y, si no, por nombre. */
export async function buscarImagenArticulo(item) {
  const r = await buscarSinBase44(item);
  // Navegador con la IA de Base44 (que sí busca en internet): como hasta ahora.
  if (!r.ok && r.motivo === 'sin_motor' && ajustesIA().proveedor === 'base44') {
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca en internet la imagen oficial del producto: "${item.product_name}"${item.brand ? ` de la marca ${item.brand}` : ''}${item.product_code ? `, referencia ${item.product_code}` : ''}. Devuelve solo la URL directa de la imagen (JPG, PNG o WebP). Si no encuentras una fiable, devuelve null.`,
        add_context_from_internet: true,
        response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
      });
      if (res?.image_url) return { ok: true, url: res.image_url, por: 'nombre' };
    } catch { /* sin resultado */ }
  }
  return r;
}

function buscarSinBase44(item) {
  const puente = crearPuente();
  return buscarImagenProducto(
    { codigo: item.product_code, nombre: item.product_name, marca: item.brand, proveedor: item.supplier_name },
    {
      motores: motoresPorDefecto({ puente, google: ajustesGoogle() }),
      enLinea: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
      elegirConIA,
      descargar: async (url) => {
        if (puente) { const d = await puente.imagen(url); return (await reducirImagen(d)) || d; }
        return (await carga(url)) ? url : null; // navegador: la foto se enlaza
      }
    }
  );
}
