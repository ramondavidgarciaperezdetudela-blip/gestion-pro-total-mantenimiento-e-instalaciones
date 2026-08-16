// Sanitizador de HTML mínimo, sin dependencias externas (usa el DOMParser del
// propio navegador). Se usa en los pocos sitios de la app que insertan HTML
// generado (informes de IA, documentos editables) con dangerouslySetInnerHTML:
// sin esto, cualquier <script>, atributo onerror/onclick o enlace javascript:
// que acabe en ese HTML se ejecutaría en el navegador de quien lo vea.
//
// Lista blanca de etiquetas de formato de documento/informe (tablas, texto,
// listas, imágenes, enlaces) — nada de <script>, <iframe>, <object>, <style>,
// ni atributos de evento (onXxx) o esquemas peligrosos (javascript:, data: en
// enlaces).

const ALLOWED_TAGS = new Set([
  'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'i', 'img', 'li', 'ol', 'p', 'span', 'strong', 'table', 'tbody', 'td',
  'th', 'thead', 'tr', 'u', 'ul',
]);

const ALLOWED_ATTRS = new Set(['style', 'class', 'href', 'src', 'alt', 'title', 'colspan', 'rowspan']);

function isSafeUrl(value) {
  const v = (value || '').trim().toLowerCase();
  return !v.startsWith('javascript:') && !v.startsWith('data:text/html') && !v.startsWith('vbscript:');
}

function cleanNode(node) {
  // Nodos de texto: siempre seguros.
  if (node.nodeType === Node.TEXT_NODE) return;

  if (node.nodeType !== Node.ELEMENT_NODE) {
    node.remove();
    return;
  }

  const tag = node.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) {
    // Sustituir el elemento no permitido por su texto (no perder contenido,
    // solo la etiqueta potencialmente peligrosa).
    const text = document.createTextNode(node.textContent || '');
    node.replaceWith(text);
    return;
  }

  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) {
      node.removeAttribute(attr.name);
      continue;
    }
    if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
      node.removeAttribute(attr.name);
    }
  }

  // Enlaces: abrir siempre en pestaña nueva sin dar acceso a window.opener.
  if (tag === 'a') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }

  Array.from(node.childNodes).forEach(cleanNode);
}

/**
 * Limpia una cadena HTML antes de insertarla con dangerouslySetInnerHTML.
 * @param {string} html
 * @returns {string} HTML seguro (solo etiquetas/atributos de la lista blanca)
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  Array.from(doc.body.childNodes).forEach(cleanNode);
  return doc.body.innerHTML;
}
