/**
 * compartirDocumentoWhatsApp.js — enviar un presupuesto o una factura a un
 * cliente por WhatsApp con el PDF adjunto cuando se pueda.
 *
 * ─── Por qué existe esto ────────────────────────────────────────────────
 *
 * Antes, "enviar por WhatsApp" abría wa.me con un enlace a la versión pública
 * del documento. El cliente lo veía bien, pero dependía de tener la dirección
 * pública configurada y, sobre todo, no recibía el archivo: recibía un texto.
 *
 * Aquí se intenta entregar el PDF de verdad:
 *
 *   1. En el APK (móvil nativo): se guarda el PDF en caché y se abre el menú
 *      de compartir de Android con el archivo adjunto, donde está WhatsApp.
 *   2. En el navegador del móvil (Chrome/Safari): se usa navigator.share con
 *      files, que enseña la misma hoja de compartir y adjunta el PDF.
 *   3. En el ordenador (sin compartir archivos): se vuelve al enlace wa.me
 *      con el texto y el enlace público, que es lo único que funciona ahí.
 *
 * Si algo falla (la generación del PDF, los permisos…), nunca se queda en
 * blanco: cae en el enlace. Así en todos los sitios el cliente recibe algo
 * que puede abrir.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { enlaceWhatsApp } from './whatsapp';

// Capacitor solo está disponible en el móvil nativo. En el navegador los
// paquetes existen igual (están en package.json) pero sus llamadas a puertos
// nativos no hacen nada; por eso se comprueba isNativePlatform antes de usarlos.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** ¿Estamos dentro del APK instalado en el móvil? */
function esNativo() {
  try {
    return Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Convierte un Blob en base64 (sin el prefijo data:). Lo necesita
 * @capacitor/filesystem, que en nativo solo acepta base64 para binarios.
 */
function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/**
 * Genera un PDF (A4) a partir del HTML del documento.
 *
 * El HTML se pinta en un iframe oculto a su tamaño real de folio; luego se
 * captura con html2canvas y se monta en jsPDF. Si el documento es más alto
 * que un A4 se reparte en varias páginas.
 *
 * @param {string} html  documento maquetado (DOCTYPE…</html>)
 * @returns {Promise<Blob>}  el PDF como Blob
 */
export async function generarPdfBlobDesdeHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-99999px;top:0;width:800px;height:1130px;border:0;';
  document.body.appendChild(iframe);
  try {
    const win = iframe.contentWindow;
    const doc = win.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Esperar a que carguen las imágenes (logo, QR, firma).
    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete ? null : new Promise((res) => { img.onload = res; img.onerror = res; }),
      ),
    );
    await new Promise((r) => setTimeout(r, 250));

    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 800,
    });

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const imgW = pw;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= ph) {
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, imgH);
    } else {
      // Más alto que una página: se va colocando desplazado y cortando en A4.
      let y = 0;
      while (y < imgH) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, -y, imgW, imgH);
        y += ph;
        if (y < imgH) pdf.addPage();
      }
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * Comparte un documento por WhatsApp. Si el dispositivo permite adjuntar
 * archivos, manda el PDF; si no, manda un enlace wa.me con el texto y el
 * enlace público.
 *
 * @param {object} opts
 * @param {object} opts.doc          el documento (Invoice) con doc_type, doc_number…
 * @param {string} opts.html         HTML maquetado del documento
 * @param {string} [opts.telefono]   teléfono del cliente (sin normalizar)
 * @param {string} [opts.enlacePublico] URL pública del documento para el respaldo
 * @param {Function} [opts.onMensaje] callback para avisos de estado (toast)
 * @returns {Promise<{ok: boolean, via: string}>}
 */
export async function compartirDocumentoWhatsApp({
  doc,
  html,
  telefono,
  enlacePublico,
  onMensaje,
}) {
  const tipo = (doc.doc_type || 'documento').toUpperCase();
  const resumen =
    `*${tipo} Nº${doc.doc_number || ''}*\n` +
    `Cliente: ${doc.contact_name || ''}\n` +
    `Fecha: ${doc.date || ''}\n` +
    `Total: ${(doc.total || 0).toFixed(2)} €`;

  const nombrePdf = `${doc.doc_type || 'documento'}-${doc.doc_number || ''}.pdf`;

  // 1) Intentar adjuntar el PDF de verdad.
  try {
    const blob = await generarPdfBlobDesdeHtml(html);

    // 1a) APK nativo: guardar en caché y compartir por el menú de Android.
    if (esNativo()) {
      try {
        const base64 = await blobABase64(blob);
        const path = `${nombrePdf}`;
        const f = await Filesystem.writeFile({
          path,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
        await Share.share({
          title: `${tipo} ${doc.doc_number || ''}`,
          text: resumen,
          files: [uri || f.uri],
        });
        return { ok: true, via: 'archivo (móvil)' };
      } catch (err) {
        if (/cancel/i.test(String(err?.message || err))) return { ok: true, via: 'cancelado' };
        // Si falla el nativo, se prueba el navegador antes de rendirse.
      }
    }

    // 1b) Navegador móvil con Web Share API de archivos.
    const file = new File([blob], nombrePdf, { type: 'application/pdf' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${tipo} ${doc.doc_number || ''}`,
          text: resumen,
        });
        return { ok: true, via: 'archivo (navegador)' };
      } catch (err) {
        if (/cancel/i.test(String(err?.message || err))) return { ok: true, via: 'cancelado' };
      }
    }
  } catch (err) {
    // La generación del PDF o el share han fallado: nada se ha enviado todavía.
    // Se cae al enlace, que no necesita PDF.
  }

  // 2) Respaldo: enlace wa.me con el texto y, si hay, el enlace público.
  const texto =
    resumen +
    (enlacePublico
      ? `\n\nPuede verlo, imprimirlo o guardarlo en PDF aquí:\n${enlacePublico}`
      : '');
  const enlace = enlaceWhatsApp(telefono, texto);
  if (!enlace) {
    onMensaje?.('No hay un teléfono válido para este cliente.');
    return { ok: false, via: 'sin-teléfono' };
  }
  window.open(enlace, '_blank', 'noopener,noreferrer');
  onMensaje?.('No se pudo adjuntar el PDF: se ha abierto WhatsApp con el enlace del documento.');
  return { ok: true, via: 'enlace' };
}