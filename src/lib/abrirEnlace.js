/**
 * abrirEnlace.js — abrir WhatsApp, el correo o cualquier enlace de fuera.
 *
 * ─── EL FALLO QUE ARREGLA, PARA QUE NO VUELVA ───────────────────────────────
 *
 * Todo el programa usaba window.open() para mandar por WhatsApp o por correo.
 * Eso vale en el navegador y en el programa de escritorio (Electron lo
 * reconduce al navegador del sistema), pero DENTRO DEL APK no hace nada: el
 * WebView de Android no abre ventanas nuevas ni entiende «mailto:».
 *
 * Resultado: pulsabas «enviar por WhatsApp» en el móvil y no pasaba
 * absolutamente nada. Ni se abría WhatsApp, ni salía un aviso, ni quedaba
 * rastro del fallo. Parecía que el botón estaba muerto.
 *
 * Aquí se prueba por orden lo que funciona en cada sitio, y si no funciona
 * NADA se avisa y se enseña el enlace para copiarlo a mano. Lo que no puede
 * volver a pasar es que no ocurra nada y nadie sepa por qué.
 */

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/** ¿Estamos dentro de la aplicación instalada en el móvil? */
function esMovil() {
  try { return Capacitor?.isNativePlatform?.() === true; } catch { return false; }
}

/**
 * Abre un enlace fuera del programa.
 *
 * @param {string} url
 * @param {object} [opciones]
 * @param {string} [opciones.texto]   texto a compartir si hay que usar el
 *                                    menú de compartir de Android
 * @param {string} [opciones.titulo]
 * @returns {Promise<{ok: boolean, via: string, url: string}>}
 */
export async function abrirEnlace(url, { texto = '', titulo = '' } = {}) {
  if (!url) return { ok: false, via: 'sin-enlace', url: '' };

  // ── Móvil ──
  if (esMovil()) {
    // 1) El navegador del sistema. Con '_system' Capacitor lo saca fuera.
    try {
      const v = window.open(url, '_system');
      if (v) return { ok: true, via: 'navegador del móvil', url };
    } catch { /* se prueba lo siguiente */ }

    // 2) El menú de compartir de Android, donde está WhatsApp.
    try {
      await Share.share({ title: titulo || undefined, text: texto || undefined, url });
      return { ok: true, via: 'menú de compartir', url };
    } catch (err) {
      // Cancelar el menú de compartir no es un fallo: lo ha cerrado el usuario.
      if (/cancel/i.test(String(err?.message || err))) {
        return { ok: true, via: 'cancelado por el usuario', url };
      }
    }

    // 3) Como último recurso, la misma ventana.
    try {
      window.location.href = url;
      return { ok: true, via: 'misma ventana', url };
    } catch { /* nada más que probar */ }

    return { ok: false, via: 'el móvil no ha podido abrirlo', url };
  }

  // ── Escritorio y navegador ──
  // En Electron, window.open con http lo reconduce al navegador del sistema
  // (setWindowOpenHandler en electron/main.cjs).
  try {
    const v = window.open(url, '_blank', 'noopener,noreferrer');
    if (v) return { ok: true, via: 'ventana nueva', url };
  } catch { /* se prueba lo siguiente */ }

  // Ventanas emergentes bloqueadas: se navega en la misma.
  try {
    window.location.href = url;
    return { ok: true, via: 'misma ventana', url };
  } catch { /* nada */ }

  return { ok: false, via: 'el navegador lo ha bloqueado', url };
}

/**
 * Igual que abrirEnlace, pero avisando si no se ha podido.
 * @param {Function} avisar  cómo enseñar el mensaje (toast, alert…)
 */
export async function abrirEnlaceAvisando(url, avisar, opciones = {}) {
  const r = await abrirEnlace(url, opciones);
  if (!r.ok) {
    const mensaje = url
      ? `No se ha podido abrir (${r.via}). Copia el enlace y pégalo a mano:\n\n${url}`
      : 'No hay enlace que abrir.';
    try { avisar?.(mensaje); } catch { /* sin forma de avisar */ }
    // Se intenta dejarlo en el portapapeles, para que al menos se pueda pegar.
    try { await navigator.clipboard?.writeText?.(url); } catch { /* sin permiso */ }
  }
  return r;
}

/** El enlace de WhatsApp para un teléfono español y un mensaje. */
export function enlaceWhatsApp(telefono, mensaje) {
  const limpio = String(telefono || '').replace(/[^0-9]/g, '');
  const texto = encodeURIComponent(mensaje || '');
  return limpio ? `https://wa.me/34${limpio}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
