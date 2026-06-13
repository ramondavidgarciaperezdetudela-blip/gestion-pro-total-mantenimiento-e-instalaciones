/**
 * printHelper.js — Helper universal de impresión
 * 
 * En APK Android: usa window.GPTPrint (PrintManager nativo de Android)
 *   → Muestra impresoras instaladas + opción "Guardar como PDF"
 * 
 * En navegador web: abre ventana nueva con window.print()
 *   → Funciona en Chrome, Firefox, Safari, Edge
 */

/**
 * Imprime/exporta un HTML completo al sistema de impresión disponible.
 * @param {string} html   Documento HTML completo (incluye estilos y contenido)
 * @param {string} title  Nombre del trabajo de impresión
 */
export function printDocument(html, title = 'Gestión Pro Total') {
  // APK Android — usar PrintManager nativo
  if (typeof window !== 'undefined' &&
      typeof window.GPTPrint !== 'undefined' &&
      typeof window.GPTPrint.isAvailable === 'function' &&
      window.GPTPrint.isAvailable()) {
    window.GPTPrint.print(html, title);
    return;
  }

  // Web — ventana emergente
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
    return;
  }

  // Fallback — iframe oculto (cuando popups bloqueados)
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
  document.body.appendChild(iframe);
  try {
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    setTimeout(() => {
      try { iframe.contentWindow.print(); } catch(e) {}
      setTimeout(() => { try { iframe.remove(); } catch(e) {} }, 3000);
    }, 600);
  } catch(e) {
    console.error('printHelper: error al imprimir:', e);
  }
}

/**
 * Detecta si la app está corriendo en APK Android (con PrintManager nativo)
 */
export function hasNativePrint() {
  return typeof window !== 'undefined' &&
    typeof window.GPTPrint !== 'undefined' &&
    typeof window.GPTPrint.isAvailable === 'function' &&
    window.GPTPrint.isAvailable();
}
