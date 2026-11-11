/**
 * copiasDocumentos.js — las copias de facturas, presupuestos y recibos que se
 * guardan en la Documentación del cliente (ClientDocument).
 *
 * Al guardar un documento se crea una copia en la ficha del cliente, pero hasta
 * ahora no llevaba el vínculo con el original y, al borrarlo, la copia se
 * quedaba para siempre en Documentación → Presupuestos. Aquí se sabe qué copias
 * son de un documento (para borrarlas con él) y cuáles han quedado huérfanas.
 */
const ETIQUETA = { factura: 'Factura', presupuesto: 'Presupuesto', recibo: 'Recibo' };
const TIPOS = Object.keys(ETIQUETA);
// Descripción exacta con la que se crean estas copias (Documents.jsx).
const DESCRIPCION_COPIA = /^Total:\s*[^|]*\|\s*Estado:/;

const sinFichero = (d) => !String(d?.file_url || '').trim();

/** ¿Es una copia generada automáticamente de un documento (y no un fichero subido)? */
export function esCopiaGenerada(d) {
  if (!d || !TIPOS.includes(d.doc_type) || !sinFichero(d)) return false;
  return !!d.reference_id || DESCRIPCION_COPIA.test(String(d.description || ''));
}

const tituloDe = (doc) => `${ETIQUETA[doc?.doc_type] || ''} ${doc?.doc_number || ''}`.trim();

/** Copias (ClientDocument) que pertenecen a este documento (Invoice). */
export function copiasDeDocumento(documentos = [], doc) {
  if (!doc) return [];
  return documentos.filter((d) => {
    if (!esCopiaGenerada(d) || d.doc_type !== doc.doc_type) return false;
    if (d.reference_id) return String(d.reference_id) === String(doc.id);
    return doc.doc_number && String(d.contact_id || '') === String(doc.contact_id || '')
      && String(d.title || '').trim() === tituloDe(doc);
  });
}

/** Copias cuyo documento original ya no existe. */
export function copiasHuerfanas(documentos = [], invoices = []) {
  const ids = new Set(invoices.map((i) => String(i.id)));
  return documentos.filter((d) => {
    if (!esCopiaGenerada(d)) return false;
    if (d.reference_id) return !ids.has(String(d.reference_id));
    return !invoices.some((i) => i.doc_type === d.doc_type && copiasDeDocumento([d], i).length > 0);
  });
}

/** Borra las copias de un documento. No falla si alguna ya no existe. */
export async function borrarCopias(base44, documentos, doc) {
  const copias = copiasDeDocumento(documentos, doc);
  await Promise.all(copias.map((c) => base44.entities.ClientDocument.delete(c.id).catch(() => {})));
  return copias.map((c) => c.id);
}
