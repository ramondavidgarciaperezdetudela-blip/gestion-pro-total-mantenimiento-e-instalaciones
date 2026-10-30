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
/** ¿Estamos en el programa instalado en el ordenador? */
function hayPuenteImpresion() {
  try { return typeof window !== 'undefined' && window.gptImpresion?.disponible === true; }
  catch { return false; }
}

/** La impresora elegida en Configuración, si hay alguna. */
export function impresoraElegida() {
  try { return localStorage.getItem('gpt_impresora') || ''; }
  catch { return ''; }
}

export function guardarImpresoraElegida(nombre) {
  try {
    if (nombre) localStorage.setItem('gpt_impresora', nombre);
    else localStorage.removeItem('gpt_impresora');
  } catch { /* sin sitio */ }
}

/** Las impresoras que ve el ordenador. Solo en el programa instalado. */
export async function listarImpresoras() {
  if (!hayPuenteImpresion()) return { ok: false, motivo: 'sin_puente', impresoras: [] };
  const r = await window.gptImpresion.listar();
  return { ok: !!r?.ok, motivo: r?.error || '', impresoras: r?.impresoras || [] };
}

/*
 * La regla que hace que el papel salga como la pantalla.
 *
 * Los navegadores, al imprimir, QUITAN los fondos y los colores para ahorrar
 * tinta. Por eso las leyendas de colores y los recuadros salían en gris. Se
 * mete en TODO lo que pasa por aquí, venga de donde venga el HTML, para no
 * depender de que cada sitio se acuerde de ponerla.
 */
const REGLA_COLOR = `<style>
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>`;

function conColores(html) {
  if (typeof html !== 'string') return html;
  if (/print-color-adjust/.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${REGLA_COLOR}`);
  return REGLA_COLOR + html;
}

export async function printDocument(htmlOriginal, title = 'Gestión Pro Total') {
  const html = conColores(htmlOriginal);
  // Programa instalado en el ordenador: se manda a la impresora elegida. Si no
  // hay ninguna elegida, sale el diálogo del sistema como siempre.
  if (hayPuenteImpresion()) {
    const elegida = impresoraElegida();
    const r = await window.gptImpresion.imprimir({
      html, impresora: elegida || null, silencioso: !!elegida,
    });
    if (r?.ok) return true;
    // Si la elegida ha fallado (apagada, sin papel, ya no existe), se vuelve a
    // intentar con el diálogo del sistema en vez de dejarlo en nada.
    if (elegida) {
      const r2 = await window.gptImpresion.imprimir({ html, impresora: null, silencioso: false });
      if (r2?.ok) return true;
      avisar(`No se ha podido imprimir en «${elegida}»: ${r?.motivo || 'no responde'}. `
        + 'Comprueba que está encendida, o elige otra en Configuración → Impresión.');
      return false;
    }
    // Sin impresora elegida y con el diálogo cancelado no hay nada que avisar.
    return false;
  }

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

/*
 * ─── Que lo impreso se parezca a la pantalla ────────────────────────────────
 *
 * Hasta ahora cada sitio armaba su HTML de impresión con cuatro estilos a
 * mano, así que el papel salía en blanco y negro y sin recuadros: se perdían
 * las hojas de estilo del programa por el camino.
 *
 * Estas dos funciones se encargan de eso: copian los estilos que la página
 * está usando de verdad y preparan el contenido para el papel.
 */

/** Los estilos que tiene puestos la página, listos para meter en otra ventana. */
export function estilosDeLaPagina() {
  const trozos = [];
  // Primero, intentar copiar las reglas tal cual. Así no hay que esperar a que
  // se descargue nada y la impresión no sale sin estilos por llegar tarde.
  for (const hoja of Array.from(document.styleSheets || [])) {
    try {
      const reglas = hoja.cssRules;
      if (!reglas) continue;
      trozos.push(Array.from(reglas).map((r) => r.cssText).join('\n'));
    } catch {
      // Hoja de otro origen: no se pueden leer sus reglas, se enlaza.
      if (hoja.href) trozos.push(`@import url("${hoja.href}");`);
    }
  }
  return trozos.join('\n');
}

/**
 * Prepara un trozo de pantalla para imprimirlo tal y como se ve.
 *
 * @param {HTMLElement} nodo        lo que hay que imprimir
 * @param {object} opciones
 * @param {string} [opciones.titulo]
 * @param {string} [opciones.corte]  selector donde cortar: eso y lo que venga
 *                                   detrás no se imprime
 * @returns {string} documento HTML completo
 */
export function htmlDeLaPantalla(nodo, { titulo = 'Gestión Pro Total', corte = '[data-fin-impresion]' } = {}) {
  const copia = nodo.cloneNode(true);

  /*
   * Los lienzos, por su dibujo.
   *
   * Un <canvas> copiado sale EN BLANCO: lo pintado no está en el HTML, está
   * dentro del lienzo. Al imprimir un plano salía el recuadro y nada dentro.
   * Se cambia por una imagen con lo que hay pintado en ese momento. Va lo
   * primero, antes de recortar nada, porque el emparejamiento entre los
   * lienzos de la pantalla y los de la copia se hace por orden.
   */
  const lienzos = nodo.querySelectorAll('canvas');
  copia.querySelectorAll('canvas').forEach((c, i) => {
    const original = lienzos[i];
    let url = '';
    try { url = original?.toDataURL('image/png') || ''; } catch { url = ''; }
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.style.width = '100%';
    img.style.maxWidth = `${original.width}px`;
    img.style.border = '1px solid #cbd5e1';
    img.style.borderRadius = '6px';
    c.replaceWith(img);
  });

  // Lo que solo tiene sentido en el papel (listados, leyendas, totales) va
  // escondido en pantalla y se enseña aquí.
  copia.querySelectorAll('[data-solo-impresion]').forEach((e) => {
    e.classList.remove('hidden');
    e.style.display = 'block';
  });

  // Cortar donde se haya dicho, y quitar lo marcado como "esto no se imprime".
  if (corte) {
    const fin = copia.querySelector(corte);
    if (fin) {
      let n = fin;
      while (n && n !== copia) {
        let sig = n.nextSibling;
        while (sig) { const s2 = sig.nextSibling; sig.remove(); sig = s2; }
        n = n.parentNode;
      }
      fin.remove();
    }
  }
  copia.querySelectorAll('[data-no-imprimir]').forEach((e) => e.remove());

  /*
   * Los campos, por su valor.
   *
   * Un <select> no guarda en el HTML la opción elegida —la guarda en una
   * propiedad del elemento—, así que al copiar el HTML se perdía y salía
   * impresa la PRIMERA opción de la lista. Ese era el fallo de "pongo R-32 y
   * me imprime R-410A". Con los <input> pasaba lo mismo: salían vacíos.
   */
  const vivos = nodo.querySelectorAll('input, select, textarea');
  const copias = copia.querySelectorAll('input, select, textarea');
  copias.forEach((campo, i) => {
    const vivo = vivos[i];
    let texto = '';
    if (vivo) {
      if (vivo.tagName === 'SELECT') texto = vivo.options[vivo.selectedIndex]?.text || vivo.value || '';
      else if (vivo.type === 'checkbox' || vivo.type === 'radio') texto = vivo.checked ? '☑' : '☐';
      else texto = vivo.value || '';
    }
    const span = document.createElement('span');
    span.textContent = texto || '—';
    span.setAttribute('style',
      'display:inline-block;min-width:60px;padding:2px 6px;border:1px solid #cbd5e1;'
      + 'border-radius:4px;background:#f8fafc;font-weight:600');
    campo.replaceWith(span);
  });

  // Los botones en papel no sirven de nada.
  copia.querySelectorAll('button').forEach((b) => b.remove());

  const esc = (t) => String(t).replace(/</g, '&lt;');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>${estilosDeLaPagina()}</style>
<style>
  /* Sin esto el navegador quita los fondos y los colores al imprimir, y la
     leyenda de colores sale en gris. */
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body { background: #fff !important; }
  body { padding: 10px; font-size: 12px; }
  svg { max-width: 100%; height: auto; }
  @media print { @page { size: A4; margin: 10mm } }
</style>
</head><body>${copia.outerHTML}</body></html>`;
}

/** Atajo: coge un trozo de pantalla y lo manda a imprimir tal cual se ve. */
export function imprimirPantalla(nodo, opciones = {}) {
  if (!nodo) return Promise.resolve(false);
  return printDocument(htmlDeLaPantalla(nodo, opciones), opciones.titulo || 'Gestión Pro Total');
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
