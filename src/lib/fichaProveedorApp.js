// Completa la ficha de un proveedor leyendo SU web: logotipo y datos de contacto (dirección, teléfono, CIF…).
// Usa el puente del aparato (escritorio, móvil o servidor propio), igual que la búsqueda de fotos de artículos.
import { crearPuente } from '@/lib/imagenesProductoApp';
import { reducirImagen } from '@/lib/imagenesProducto';
import { urlWeb, hostDe, candidatasLogo, datosContacto, enlacesContacto, unirDatos } from '@/lib/fichaProveedor';

const tamano = (dataUrl) => new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res(null); i.src = dataUrl; });

/** Descarga una imagen y la guarda reducida; rechaza las diminutas (iconos de 16 px) o las muy alargadas (banners). */
async function logoDe(puente, url, { minimo = 48 } = {}) {
  try {
    const d = await puente.imagen(url);
    const r = (await reducirImagen(d, 320)) || d;
    const t = await tamano(r);
    if (!t || Math.min(t.w, t.h) < minimo || t.w / t.h > 6) return null;
    return r;
  } catch { return null; }
}

/**
 * @param {{web?:string, name?:string}} prov
 * @param {{alAvisar?:(txt:string)=>void}} [o]
 * @returns {Promise<{logo?:string, logoOrigen?:string, datos:object, motivo?:string}>}
 */
export async function completarDesdeWeb(prov, o = {}) {
  const aviso = (t) => { try { o.alAvisar?.(t); } catch { /* el aviso no rompe nada */ } };
  const base = urlWeb(prov.web); const host = hostDe(prov.web);
  if (!base) return { datos: {}, motivo: 'sin_web' };
  const puente = crearPuente();
  if (!puente) {
    // Navegador sin servidor propio: solo se puede enlazar el icono de la web (no se guarda dentro de la ficha)
    return { datos: {}, logo: `https://www.google.com/s2/favicons?domain=${host}&sz=128`, logoOrigen: 'icono', motivo: 'sin_puente' };
  }
  let portada = '';
  try { portada = await puente.texto(base); } catch (e) { aviso(`No pude abrir ${host}: ${e.message || e}`); }
  const salida = { datos: {} };
  // Logotipo: del más fiable al menos; el icono de la web como último recurso
  const cands = portada ? candidatasLogo(portada, base) : [];
  for (const c of cands.slice(0, 8)) {
    const l = await logoDe(puente, c.url, { minimo: c.tipo === 'icono' ? 32 : 48 });
    if (l) { salida.logo = l; salida.logoOrigen = c.tipo; break; }
  }
  if (!salida.logo) {
    for (const u of [`https://www.google.com/s2/favicons?domain=${host}&sz=128`, `https://icons.duckduckgo.com/ip3/${host}.ico`]) {
      const l = await logoDe(puente, u, { minimo: 32 });
      if (l) { salida.logo = l; salida.logoOrigen = 'icono'; break; }
    }
  }
  // Datos de contacto: portada y las páginas de contacto / aviso legal
  const partes = [portada ? datosContacto(portada, base) : {}];
  if (portada) {
    for (const u of enlacesContacto(portada, base, 3)) {
      const sofar = unirDatos(...partes);
      if (sofar.address && sofar.phone && sofar.email && sofar.tax_id) break;
      try { partes.push(datosContacto(await puente.texto(u), u)); } catch { /* esa página no abre */ }
    }
  }
  salida.datos = unirDatos(...partes);
  return salida;
}
