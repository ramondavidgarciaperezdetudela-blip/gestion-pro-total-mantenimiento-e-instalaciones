/**
 * hojaSanitaria.js — La hoja que se le enseña al inspector de Sanidad.
 *
 * Se imprime desde la ficha de mantenimiento de una cámara frigorífica y
 * responde a una pregunta muy concreta: ¿en qué estado quedó esta cámara el
 * día que se intervino? Por eso lo primero de todo es el veredicto en grande,
 * después las deficiencias encontradas, y al final las fotos DEL DÍA, no las
 * del archivo del cliente.
 *
 * El contenido sale de inspeccionSanitaria.js, que es la misma lista que
 * rellena el técnico en pantalla. Si se escribiera aquí otra vez, tarde o
 * temprano dirían cosas distintas.
 */
import {
  SECCIONES, FOTOS, clave, veredicto, ETIQUETA_VEREDICTO, marcadosDe, todasLasFotos,
  elegidasDe,
} from '@/lib/inspeccionSanitaria';

/** Texto seguro dentro del HTML. Lo escribe una persona, así que se escapa. */
export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const guion = (v) => (String(v ?? '').trim() ? esc(v) : '—');

/** Junta con puntos los datos que existen, sin dejar guiones sueltos. */
function juntar(trozos) {
  return trozos.map((t) => String(t ?? '').trim()).filter(Boolean).map(esc).join(' · ');
}

/** Una fila de un punto con opciones: se marca la elegida y se tachan las demás. */
function filaPunto(ficha, seccion, punto) {
  const elegidas = elegidasDe(ficha, seccion.id, punto.id);
  const medida = ficha?.medidas?.[clave(seccion.id, punto.id)];
  const deficiente = elegidas.some((o) => o !== punto.opciones[0]);
  const conforme = elegidas.length > 0 && !deficiente;

  const opciones = punto.opciones.map((o) => {
    const puesta = elegidas.includes(o);
    const color = puesta ? (o === punto.opciones[0] ? '#15803d' : '#b91c1c') : '#9ca3af';
    const peso = puesta ? '700' : '400';
    return `<span style="color:${color};font-weight:${peso};margin-right:10px;white-space:nowrap">
      ${puesta ? '☑' : '☐'} ${esc(o)}</span>`;
  }).join('');

  const conMedida = punto.medida && String(medida ?? '').trim()
    ? `<span style="margin-left:6px;color:#111;font-weight:700">${esc(punto.medida.etiqueta)}: ${esc(medida)} ${esc(punto.medida.unidad)}</span>`
    : '';

  const fondo = deficiente ? '#fef2f2' : (conforme ? '#ffffff' : '#f8fafc');
  return `<tr style="background:${fondo}">
    <td style="padding:4px 6px;border:1px solid #e5e7eb;width:34%;font-weight:600">${esc(punto.etiqueta)}</td>
    <td style="padding:4px 6px;border:1px solid #e5e7eb">${opciones}${conMedida}</td>
  </tr>`;
}

/** Una sección donde se marcan varias casillas (causas, actuaciones…). */
function listaMarcada(ficha, seccion) {
  return seccion.puntos.map((p) => {
    const puesto = ficha?.respuestas?.[clave(seccion.id, p.id)] === true;
    return `<div style="padding:2px 0;color:${puesto ? '#111' : '#9ca3af'};font-weight:${puesto ? '600' : '400'}">
      ${puesto ? '☑' : '☐'} ${esc(p.etiqueta)}</div>`;
  }).join('');
}

function bloqueSeccion(ficha, seccion) {
  const cuerpo = seccion.tipo === 'una'
    ? `<table style="width:100%;border-collapse:collapse;font-size:9.5px">
         ${seccion.puntos.map((p) => filaPunto(ficha, seccion, p)).join('')}
       </table>`
    : listaMarcada(ficha, seccion);

  const obs = String(ficha?.observaciones?.[seccion.id] || '').trim();
  const observaciones = obs
    ? `<p style="margin:6px 0 0;padding:4px 6px;background:#f1f5f9;border-left:3px solid #64748b;font-size:9.5px">
         <b>Observaciones:</b> ${esc(obs)}</p>`
    : '';

  return `<div class="seccion">
    <div class="seccion-titulo">${esc(seccion.numero)}. ${esc(seccion.titulo)}</div>
    ${cuerpo}
    ${observaciones}
  </div>`;
}

/** Los seis bloques de fotos, cada uno con las suyas y su explicación. */
function anexoFotografico(ficha) {
  const bloques = FOTOS.map((b, i) => {
    const fotos = ficha?.fotos?.[b.id] || [];
    const imagenes = fotos.length
      ? `<div class="tira">${fotos.map((u) => `<img src="${esc(u)}" alt="${esc(b.titulo)}" />`).join('')}</div>`
      : '<p class="sin-foto">Sin fotografía en esta intervención.</p>';
    return `<div class="foto-bloque">
      <div class="foto-titulo">Foto ${i + 1} · ${esc(b.titulo)}</div>
      <div class="foto-desc">${esc(b.descripcion)}</div>
      ${imagenes}
    </div>`;
  }).join('');

  return `<div class="seccion"><div class="seccion-titulo">6. Anexo fotográfico de la intervención</div>
    ${bloques}</div>`;
}

/**
 * La hoja entera, lista para imprimir o guardar en PDF.
 *
 * @param {{sheet: object, ficha: object, company: object, contact: object}} datos
 */
export function htmlHojaSanitaria({ sheet = {}, ficha = {}, company = {}, contact = {} }) {
  const v = veredicto(ficha);
  const marca = ETIQUETA_VEREDICTO[v.estado];
  const causas = marcadosDe(ficha, SECCIONES.find((s) => s.id === 'causa'));
  const acciones = marcadosDe(ficha, SECCIONES.find((s) => s.id === 'accion'));
  const nFotos = todasLasFotos(ficha).length;

  const deficiencias = v.deficiencias.length
    ? `<ul style="margin:4px 0 0 16px;padding:0">
        ${v.deficiencias.map((d) => `<li style="margin:1px 0"><b>${esc(d.punto)}</b>: ${esc(d.estado)}</li>`).join('')}
       </ul>`
    : '<p style="margin:4px 0 0">No se ha detectado ninguna deficiencia en los puntos revisados.</p>';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Inspección técnico-sanitaria — Cámara — ${esc(sheet.sheet_number || '')}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;padding:18px;max-width:840px;margin:0 auto;font-size:10px;color:#111}
    .cabecera{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0f172a;padding-bottom:10px}
    .cabecera img{height:56px;object-fit:contain}
    .empresa{font-size:16px;font-weight:700;color:#0f172a}
    .titulo{text-align:center;font-size:15px;font-weight:700;margin:12px 0 4px;letter-spacing:.3px}
    .subtitulo{text-align:center;font-size:10px;color:#64748b;margin-bottom:10px}
    .veredicto{border-radius:6px;padding:10px 12px;margin:10px 0;border:2px solid ${marca.color}}
    .veredicto .grande{font-size:17px;font-weight:800;color:${marca.color};letter-spacing:.4px}
    .seccion{margin-top:12px;page-break-inside:avoid}
    .seccion-titulo{font-weight:700;font-size:11px;color:#0f172a;background:#e2e8f0;padding:4px 8px;border-radius:3px;margin-bottom:5px}
    .datos{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}
    .datos div span{color:#64748b}
    .foto-bloque{margin-top:8px;page-break-inside:avoid}
    .foto-titulo{font-weight:700;font-size:10px;color:#0369a1}
    .foto-desc{font-size:9px;color:#64748b;margin-bottom:4px}
    .tira{display:flex;flex-wrap:wrap;gap:5px}
    .tira img{width:170px;height:128px;object-fit:cover;border:1px solid #cbd5e1;border-radius:4px}
    .sin-foto{font-size:9px;color:#94a3b8;font-style:italic;margin:2px 0}
    .firmas{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;page-break-inside:avoid}
    .firma{border:1px solid #cbd5e1;border-radius:4px;padding:8px;text-align:center;min-height:74px}
    .firma img{height:56px;max-width:100%;object-fit:contain}
    .pie{margin-top:16px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:8px;color:#94a3b8;text-align:center}
    @media print{@page{margin:12mm}}
  </style></head><body>

  <div class="cabecera">
    ${company.logo_url ? `<img src="${esc(company.logo_url)}" alt="logo" />` : ''}
    <div>
      <div class="empresa">${guion(company.company_name)}</div>
      <div style="font-size:9px;color:#64748b">${juntar([
        [company.address, company.city].filter(Boolean).join(' '), company.phone, company.email,
      ])}</div>
      <div style="font-size:9px;color:#64748b">${juntar([
        company.nif ? `NIF: ${company.nif}` : '',
        ficha.carne_instalador ? `Nº instalador / carné: ${ficha.carne_instalador}` : '',
      ])}</div>
    </div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:9px;color:#64748b">Ficha nº</div>
      <div style="font-size:18px;font-weight:700">${guion(sheet.sheet_number)}</div>
      <div style="font-size:9px;color:#64748b">${guion(sheet.date)}</div>
    </div>
  </div>

  <div class="titulo">INFORME TÉCNICO DE ASISTENCIA Y CONTROL SANITARIO</div>
  <div class="subtitulo">Cámara frigorífica · Estado de la instalación en la fecha de la intervención</div>

  <div class="veredicto" style="background:${marca.fondo}">
    <div class="grande">${esc(marca.texto)}</div>
    <div style="margin-top:4px;font-size:9.5px">
      ${v.correctos} punto(s) conformes · ${v.deficiencias.length} deficiencia(s)
      ${v.sinContestar ? ` · ${v.sinContestar} punto(s) sin revisar` : ''} · ${nFotos} fotografía(s) del día
    </div>
    <div style="margin-top:6px;font-size:9.5px"><b>Deficiencias detectadas:</b>${deficiencias}</div>
  </div>

  <div class="seccion">
    <div class="seccion-titulo">1. Datos de identificación y registro</div>
    <div class="datos">
      <div><span>Establecimiento: </span><b>${guion(ficha.establecimiento || sheet.contact_name)}</b></div>
      <div><span>Actividad: </span>${guion(ficha.actividad)}</div>
      <div><span>Titular / cliente: </span><b>${guion(sheet.contact_name || contact.name)}</b></div>
      <div><span>NIF del titular: </span>${guion(contact.nif)}</div>
      <div><span>Dirección: </span>${guion(contact.address)} ${esc(contact.city || '')}</div>
      <div><span>Nº registro sanitario: </span>${guion(ficha.registro_sanitario)}</div>
      <div><span>Ubicación de la cámara: </span>${guion(sheet.location)}</div>
      <div><span>Fecha de la intervención: </span><b>${guion(sheet.date)}</b></div>
      <div><span>Técnico: </span><b>${guion(sheet.technician_name)}</b></div>
      <div><span>Motivo de la visita: </span><b>${guion(ficha.motivo)}</b></div>
    </div>
  </div>

  <div class="seccion">
    <div class="seccion-titulo">2. Datos del equipo frigorífico</div>
    <div class="datos">
      <div><span>Marca: </span>${guion(sheet.equipment_brand)}</div>
      <div><span>Modelo: </span>${guion(sheet.equipment_model)}</div>
      <div><span>Nº de serie: </span>${guion(sheet.serial_number)}</div>
      <div><span>Gas refrigerante: </span><b>${guion(sheet.readings_climate?.refrigerant_type)}</b></div>
      <div><span>Compresor: </span>${guion([sheet.compressor_brand, sheet.compressor_ref].filter(Boolean).join(' '))}</div>
      <div><span>Carga de gas: </span>${sheet.readings_climate?.refrigerant_charge != null && sheet.readings_climate?.refrigerant_charge !== '' ? `${esc(sheet.readings_climate.refrigerant_charge)} kg` : '—'}</div>
    </div>
  </div>

  ${bloqueSeccion(ficha, SECCIONES.find((s) => s.id === 'condensadora'))}
  ${bloqueSeccion(ficha, SECCIONES.find((s) => s.id === 'evaporadora'))}

  <div class="seccion">
    <div class="seccion-titulo">3. Diagnóstico y reparación efectuada</div>
    <div style="font-size:9.5px;font-weight:700;margin:2px 0">3.1 Causa principal de la falta de frío</div>
    ${listaMarcada(ficha, SECCIONES.find((s) => s.id === 'causa'))}
    ${ficha.observaciones?.causa ? `<p style="margin:4px 0 0;font-size:9.5px"><b>Observaciones:</b> ${esc(ficha.observaciones.causa)}</p>` : ''}
    <div style="font-size:9.5px;font-weight:700;margin:8px 0 2px">3.2 Acción correctiva efectuada</div>
    ${listaMarcada(ficha, SECCIONES.find((s) => s.id === 'accion'))}
    ${ficha.observaciones?.accion ? `<p style="margin:4px 0 0;font-size:9.5px"><b>Observaciones:</b> ${esc(ficha.observaciones.accion)}</p>` : ''}
  </div>

  ${bloqueSeccion(ficha, SECCIONES.find((s) => s.id === 'temperatura'))}
  ${bloqueSeccion(ficha, SECCIONES.find((s) => s.id === 'estructura'))}
  ${bloqueSeccion(ficha, SECCIONES.find((s) => s.id === 'higiene'))}
  ${bloqueSeccion(ficha, SECCIONES.find((s) => s.id === 'recomendaciones'))}

  ${sheet.observations ? `<div class="seccion"><div class="seccion-titulo">Observaciones generales de la intervención</div><p>${esc(sheet.observations)}</p></div>` : ''}

  ${anexoFotografico(ficha)}

  <div class="firmas">
    <div class="firma">
      ${sheet.signature_technician ? `<img src="${esc(sheet.signature_technician)}" alt="firma del técnico" />` : '<div style="height:56px"></div>'}
      <div style="font-size:9px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:3px">
        Firma y sello del técnico habilitado<br><b>${guion(sheet.technician_name)}</b>
        ${sheet.sign_datetime_technician ? `<br>${esc(sheet.sign_datetime_technician)}` : ''}
      </div>
    </div>
    <div class="firma">
      ${sheet.signature_client ? `<img src="${esc(sheet.signature_client)}" alt="firma del titular" />` : '<div style="height:56px"></div>'}
      <div style="font-size:9px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:3px">
        Recibí — titular del establecimiento<br><b>${guion(sheet.contact_name)}</b>
        ${sheet.sign_datetime_client ? `<br>${esc(sheet.sign_datetime_client)}` : ''}
      </div>
    </div>
  </div>

  <div class="pie">
    Informe emitido el ${new Date().toLocaleDateString('es-ES')} por ${guion(company.company_name)}.
    Refleja el estado comprobado de la instalación en la fecha de la intervención
    (${guion(sheet.date)}) y las fotografías corresponden a ese mismo día.
    ${causas.length ? `Causa: ${esc(causas.join('; '))}.` : ''}
    ${acciones.length ? `Actuación: ${esc(acciones.join('; '))}.` : ''}
  </div>
  </body></html>`;
}
