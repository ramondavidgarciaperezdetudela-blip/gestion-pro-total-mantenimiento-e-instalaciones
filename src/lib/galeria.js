// Galería por carpetas: cada documento con fotos es una carpeta con su nombre.

const lista = (v) => (Array.isArray(v) ? v : []).filter((u) => typeof u === 'string' && u);
const esImagen = (u) => typeof u === 'string' && (u.startsWith('data:image') || /\.(jpe?g|png|webp|gif|bmp|avif)(\?|#|$)/i.test(u));

export const ORIGENES = [
  { id: 'sat', etiqueta: 'Órdenes SAT', campos: [['photos_before', 'Antes'], ['photos_after', 'Después']],
    nombre: (d) => `Orden SAT ${d.order_number || ''}`.trim(), ruta: 'SAT' },
  { id: 'mantenimiento', etiqueta: 'Fichas de mantenimiento', campos: [['photos_before', 'Antes'], ['photos_after', 'Después'], ['photos_evaporator_plate', 'Placa evaporador'], ['photos_condenser_plate', 'Placa condensador']],
    nombre: (d) => `Mantenimiento ${d.sheet_number || ''}`.trim(), ruta: 'Maintenance' },
  { id: 'aseguradora', etiqueta: 'Informes de aseguradora', campos: [['photos_before', 'Antes'], ['photos_after', 'Después'], ['photos_damage', 'Daños']],
    nombre: (d) => `Informe ${d.report_number || ''}`.trim(), ruta: 'InformesTecnicos' },
  { id: 'averias', etiqueta: 'Averías', campos: [['photos', 'Fotos']],
    nombre: (d) => `Avería ${[d.equipment_brand, d.equipment_model].filter(Boolean).join(' ') || d.failure_date || ''}`.trim(), ruta: 'EquipmentFailureHistory' },
  { id: 'notas', etiqueta: 'Notas', campos: [['photos', 'Fotos']], nombre: (d) => d.title || 'Nota', ruta: 'Notes' },
  { id: 'documentos', etiqueta: 'Documentos de clientes', campos: [['file_url', 'Archivo']], soloImagen: true,
    nombre: (d) => d.title || 'Documento', ruta: 'Documents' },
];

/** Devuelve carpetas [{ id, nombre, cliente, origen, fotos:[{url, etiqueta}] }] solo con las que tienen fotos. */
export function construirCarpetas(datos) {
  const carpetas = [];
  for (const o of ORIGENES) {
    for (const d of datos?.[o.id] || []) {
      const fotos = [];
      for (const [campo, etiqueta] of o.campos) {
        const urls = campo === 'file_url' ? [d[campo]] : lista(d[campo]);
        urls.forEach((url) => { if (url && (!o.soloImagen || esImagen(url))) fotos.push({ url, etiqueta }); });
      }
      if (!fotos.length) continue;
      carpetas.push({
        id: `${o.id}:${d.id}`, nombre: o.nombre(d), cliente: d.contact_name || '',
        origen: o.id, origenEtiqueta: o.etiqueta, ruta: o.ruta, fecha: d.date || d.created_date || '', fotos,
      });
    }
  }
  return carpetas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

export function filtrarCarpetas(carpetas, { texto = '', origen = '' } = {}) {
  const t = texto.trim().toLowerCase();
  return carpetas.filter((c) => (!origen || c.origen === origen)
    && (!t || `${c.nombre} ${c.cliente}`.toLowerCase().includes(t)));
}
