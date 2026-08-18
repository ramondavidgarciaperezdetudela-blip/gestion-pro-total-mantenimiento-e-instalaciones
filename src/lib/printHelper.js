/**
 * printHelper.js — Helper universal de impresión
 *
 * En la app de Android: usa el sistema de impresión del propio Android
 *   (PrintManager) a través del complemento nativo. Muestra las impresoras
 *   configuradas en el móvil y la opción "Guardar como PDF".
 *
 * En navegador y escritorio: ventana nueva con window.print(), y un iframe
 *   oculto como respaldo si el navegador bloquea las ventanas emergentes.
 *
 * Por qué se reescribió: antes esperaba un puente llamado window.GPTPrint que
 * NUNCA llegó a existir en el proyecto. Al no encontrarlo, caía en
 * window.print(), que el WebView de Android no implementa. Resultado: en el
 * móvil no ocurría absolutamente nada al pulsar imprimir, sin ningún aviso,
 * así que parecía que no se detectaba la impresora.
 */

import { Capacitor } from '@capacitor/core';
import { Printer } from '@bcyesil/capacitor-plugin-printer';

/** ¿Estamos dentro de la app instalada (Android), no en un navegador? */
function esAppNativa() {
  try {
    return Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Imprime/exporta un HTML completo al sistema de impresión disponible.
 * @param {string} html   Documento HTML completo (incluye estilos y contenido)
 * @param {string} title  Nombre del trabajo de impresión
 * @returns {Promise<boolean>} true si se pudo lanzar la impresión
 */
export async function printDocument(html, title = 'Gestión Pro Total') {
  // App de Android: sistema de impresión nativo.
  if (esAppNativa()) {
    try {
      await Printer.print({ content: html, name: title });
      return true;
    } catch (err) {
      console.error('printHelper: falló la impresión nativa:', err);
      // No seguimos con window.print(): en el WebView de Android no existe y
      // dejaría al usuario esperando algo que no va a pasar.
      avisar('No se pudo abrir el menú de impresión de Android. Comprueba que tienes el servicio de impresión activado en los ajustes del móvil.');
      return false;
    }
  }

  // Navegador y escritorio: ventana emergente.
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
    return true;
  }

  // Respaldo: iframe oculto (cuando las ventanas emergentes están bloqueadas).
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error('printHelper: el navegador no permitió imprimir:', e);
        avisar('El navegador ha bloqueado la impresión. Permite las ventanas emergentes de esta página e inténtalo de nuevo.');
      }
      setTimeout(() => { try { iframe.remove(); } catch { /* ya retirado */ } }, 3000);
    }, 600);
    return true;
  } catch (err) {
    console.error('printHelper: error al imprimir:', err);
    avisar('No se pudo abrir la ventana de impresión.');
    return false;
  }
}

/** Muestra un aviso al usuario. Antes los fallos solo iban a la consola. */
function avisar(mensaje) {
  try { window.alert(mensaje); } catch { /* sin interfaz disponible */ }
}

/**
 * Detecta si hay impresión nativa disponible (app de Android instalada).
 */
export function hasNativePrint() {
  return esAppNativa();
}
