/**
 * copiaFirmada.js — Mandarle al cliente su copia firmada SIN gastar créditos.
 *
 * EL PROBLEMA
 *
 * Al firmar un documento, el programa le pedía al servidor de Base44 que
 * mandara un correo con la copia. Ese correo lo manda una función del
 * servidor, y eso consume créditos de la cuenta. Cuando se acaban —o caduca la
 * suscripción— el servidor contesta 402 y salta el cartel rojo de "no se ha
 * podido enviar la copia firmada", con el cliente delante y el documento ya
 * firmado.
 *
 * Y lo peor: no había alternativa. Si el servidor no podía, el cliente se
 * quedaba sin su copia.
 *
 * CÓMO SE HACE AHORA
 *
 * Sin servidor y sin créditos. El documento ya está guardado y tiene una
 * página pública propia —la misma que abre el QR de verificación—, donde se
 * ve entero y hay botones de imprimir y de guardar en PDF. Así que la copia
 * es ese enlace, y se manda por donde se manda todo lo demás en este oficio:
 * WhatsApp o el correo del propio móvil.
 *
 * No cuesta nada, funciona con la cuenta caducada, y de paso el cliente
 * recibe algo que puede imprimir en vez de un correo que a lo mejor ni mira.
 */

/** ¿Desde dónde se abre la página pública del documento? */
export function direccionPublica(empresa) {
  const puesta = String(empresa?.public_app_url || '').trim().replace(/\/$/, '');
  if (puesta) return puesta;
  // Sin dirección configurada solo vale la del navegador, y únicamente si no
  // es la del propio aparato: en el móvil es "localhost" y en el programa
  // instalado es un fichero del disco, que no le sirven a nadie de fuera.
  try {
    const o = window.location.origin;
    if (/^https?:/.test(o) && !/localhost|127\.0\.0\.1|^file:/.test(o)) return o;
  } catch { /* sin ventana */ }
  return '';
}

/** El enlace donde el cliente ve, imprime o guarda su documento. */
export function enlaceDelDocumento(doc, empresa, tipo = 'documento') {
  const base = direccionPublica(empresa);
  if (!base || !doc?.id) return '';
  const pagina = tipo === 'sat' ? 'sat-publico' : 'presupuesto-publico';
  return `${base}/${pagina}?id=${doc.id}`;
}

const NOMBRES = {
  factura: 'Factura', presupuesto: 'Presupuesto', recibo: 'Recibo',
  orden_sat: 'Parte de trabajo', documento: 'Documento',
};

/** Qué se le dice al cliente, para el correo y para WhatsApp. */
export function mensajeCopiaFirmada({ doc, empresa, tipo = 'documento', enlace }) {
  const nombre = NOMBRES[doc?.doc_type] || NOMBRES[tipo] || 'Documento';
  const numero = doc?.doc_number || doc?.order_number || '';
  const asunto = `${nombre}${numero ? ` Nº ${numero}` : ''} firmado — ${empresa?.company_name || ''}`.trim();

  const lineas = [
    `Estimado/a ${doc?.contact_name || 'cliente'},`,
    '',
    `Le adjuntamos su ${nombre.toLowerCase()}${numero ? ` Nº ${numero}` : ''}, firmado${doc?.sign_datetime || doc?.sign_datetime_client ? ` el ${doc.sign_datetime || doc.sign_datetime_client}` : ''}.`,
  ];
  if (doc?.total != null && doc?.total !== '') lineas.push(`Importe: ${Number(doc.total).toFixed(2)} €`);
  if (enlace) {
    lineas.push('', 'Puede verlo, imprimirlo o guardarlo en PDF desde aquí:', enlace);
  }
  lineas.push('', 'Quedamos a su disposición.', empresa?.company_name || '');
  return { asunto, cuerpo: lineas.join('\n') };
}

/** Abre el correo del aparato con todo escrito. No manda nada por su cuenta. */
export function abrirCorreo({ email, asunto, cuerpo }) {
  const destino = String(email || '').trim();
  const url = `mailto:${encodeURIComponent(destino)}`
    + `?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  window.open(url, '_blank');
}

/** Lo mismo por WhatsApp, que es por donde va la mitad de esto. */
export function abrirWhatsApp({ telefono, texto }) {
  const numero = String(telefono || '').replace(/\D/g, '');
  const url = numero
    ? `https://wa.me/34${numero}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}

/**
 * Prepara la copia firmada para mandarla.
 *
 * @returns {{listo: boolean, motivo?: string, enlace: string, asunto: string, cuerpo: string}}
 */
export function prepararCopiaFirmada({ doc, empresa, tipo = 'documento' }) {
  const enlace = enlaceDelDocumento(doc, empresa, tipo);
  const { asunto, cuerpo } = mensajeCopiaFirmada({ doc, empresa, tipo, enlace });
  if (!enlace) {
    return {
      listo: false,
      enlace: '',
      asunto,
      cuerpo,
      motivo: 'Falta la dirección pública del programa (Configuración → Impresión → '
        + 'Verificación de documentos). Sin ella no se puede armar un enlace que le sirva al cliente; '
        + 'el correo se prepara igual, pero sin enlace.',
    };
  }
  return { listo: true, enlace, asunto, cuerpo };
}
