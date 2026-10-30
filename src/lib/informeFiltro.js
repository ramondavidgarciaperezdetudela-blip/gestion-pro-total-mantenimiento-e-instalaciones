/**
 * INFORME DE SELECCIÓN DE FILTRO DESHIDRATADOR — Gestión Pro Total
 *
 * Documento A4 (HTML listo para imprimir o convertir en PDF) a partir de los resultados de `filtro.js`:
 *
 *   1  Datos del trabajo, condiciones del ciclo y resultado (caudal, velocidad, capacidad de catálogo mínima).
 *   2  Esquema del circuito con el filtro señalado, tubos de la línea de líquido y avisos.
 *   3  Comprobación con el filtro elegido, montaje, hipótesis del cálculo y firma.
 *
 * Todo lo que viene de fuera (nombres, notas, modelo del filtro) se escapa antes de entrar en el HTML.
 * Autor: David García (Gestión Pro Total).
 */
import { esc, fmt } from './esquemasFrigorificos.js';
import { CSS, dato } from './informeCapilar.js';
import { avisosFiltro, CASOS_FILTRO, MONTAJE_FILTRO, REFERENCIA_CATALOGO, VELOCIDAD_LIQUIDO, UMBRAL_MARGEN } from './filtro.js';
import { textoPotencia } from './potencia.js';

const P_ATM = 1.01325;
const bar = (p, d = 2) => `${fmt(p, d)} bar`;

const COLOR_VEL = { optima: '#15803d', alta: '#b45309', muyalta: '#b91c1c', sin: '#475569' };

const CSS_EXTRA = `
tr.sug td { background: #ecfeff; font-weight: 600; }
.gran { font-size: 26px; font-weight: 700; color: #0e7490; }
`;

export function referenciaInformeFiltro(fecha = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `FIL-${fecha.getFullYear()}${p(fecha.getMonth() + 1)}${p(fecha.getDate())}-${p(fecha.getHours())}${p(fecha.getMinutes())}`;
}

function cabecera(d, primera) {
  const e = d.empresa;
  const lineas = e
    ? [
        e.nif && `NIF: ${esc(e.nif)}`,
        [e.address, e.postal_code, e.city, e.province].filter(Boolean).map(esc).join(', '),
        [e.phone && `Tel.: ${esc(e.phone)}`, e.email && esc(e.email)].filter(Boolean).join(' · '),
      ].filter(Boolean)
    : [];
  return `<div class="cab">
    <div class="emp">
      ${e?.logo_url ? `<img src="${esc(e.logo_url)}" alt="">` : ''}
      <div><b>${esc(e?.company_name || 'Gestión Pro Total')}</b>${primera ? lineas.map((l) => `<small>${l}</small>`).join('') : ''}</div>
    </div>
    <div class="doc"><b>Informe de cálculo · Filtro deshidratador</b><small>Ref. ${esc(d.referencia)}</small><small>${esc(d.fechaTexto)}</small></div>
  </div>`;
}

const pie = (d, n, total) =>
  `<div class="pie"><span>${esc(d.referencia)}</span><span>Gestión Pro Total · Filtro deshidratador · ${esc(d.gasNombre)}</span><span>Página ${n} de ${total}</span></div>`;

const listaAvisos = (avisos) =>
  avisos.length
    ? avisos.map((a) => `<div class="av ${esc(a.nivel)}">${esc(a.texto)}</div>`).join('')
    : '<div class="av info">Sin avisos para estas condiciones.</div>';

/* ───────────────────────────── Página 1 ───────────────────────────── */

function pagina1(d) {
  const r = d.resultado;
  const c = r.ctx;
  const cl = d.cliente;
  const eq = d.equipo || {};
  return `
  <h1>Selección de filtro deshidratador</h1>
  <p class="sub">${esc(d.aplicacionNombre || 'Condiciones personalizadas')} · ${esc(d.gasNombre)} · ${esc(textoPotencia(d.potenciaW))}</p>

  <h2>Datos del trabajo</h2>
  <div class="dos">
    <div class="caja"><h3>Cliente</h3>
      ${cl ? `<p><b>${esc(cl.nombre)}</b></p>${cl.nif ? `<p>NIF: ${esc(cl.nif)}</p>` : ''}${cl.direccion ? `<p>${esc(cl.direccion)}</p>` : ''}${[cl.telefono && `Tel.: ${esc(cl.telefono)}`, cl.email && esc(cl.email)].filter(Boolean).join(' · ') ? `<p>${[cl.telefono && `Tel.: ${esc(cl.telefono)}`, cl.email && esc(cl.email)].filter(Boolean).join(' · ')}</p>` : ''}` : '<p>Sin cliente asociado.</p>'}
    </div>
    <div class="caja"><h3>Equipo o instalación</h3>
      <p><b>${esc(eq.descripcion || '—')}</b></p>
      ${eq.ubicacion ? `<p>Ubicación: ${esc(eq.ubicacion)}</p>` : ''}
      ${eq.notas ? `<p>${esc(eq.notas)}</p>` : ''}
      <p>Caso: ${esc(d.casoNombre || '—')}</p>
    </div>
  </div>

  <h2>Condiciones del ciclo</h2>
  <div class="dos2">
    ${dato('Refrigerante', esc(d.gasNombre))}
    ${dato('Potencia frigorífica', esc(textoPotencia(d.potenciaW)))}
    ${dato('Evaporación (rocío)', `${fmt(c.Te, 1)} °C · ${bar(c.Pe)}`)}
    ${dato('Condensación (rocío)', `${fmt(c.Tc, 1)} °C · ${bar(c.Pc)}`)}
    ${dato('Subenfriamiento', `${fmt(c.subenf, 1)} K`)}
    ${dato('Recalentamiento', `${fmt(c.recal, 1)} K`)}
    ${dato('Líquido a la válvula', `${fmt(c.Tin, 1)} °C`)}
    ${dato('Densidad del líquido', `${fmt(r.rho, 0)} kg/m³`)}
  </div>

  <h2>Resultado</h2>
  <div class="kpis">
    <div class="kpi"><small>Caudal de refrigerante</small><b>${fmt(r.mdot * 1000, 2)} g/s</b><i>${fmt(r.mdot * 3600, 1)} kg/h</i></div>
    <div class="kpi"><small>Caudal de líquido</small><b>${fmt(r.caudalLmin, 2)} L/min</b><i>efecto frigorífico ${fmt(r.qEfecto, 1)} kJ/kg</i></div>
    <div class="kpi"><small>Margen de subenfriamiento</small><b>${fmt(r.margenBar, 2)} bar</b><i>antes de formar vapor</i></div>
    <div class="kpi"><small>Capacidad de catálogo mínima</small><b>${r.capacidadMinimaW ? esc(textoPotencia(r.capacidadMinimaW, r.capacidadMinimaW < 10000 ? 0 : 1)) : '—'}</b><i>para ≤ ${fmt(r.dpObjetivo, 3)} bar</i></div>
  </div>
  <p class="nota">
    <b>Cómo usar la capacidad mínima:</b> es la capacidad que debe tener el filtro, MEDIDA COMO EN EL CATÁLOGO
    (caída de presión de ${fmt(r.referencia.dp, 3)} bar, evaporación ${fmt(r.referencia.TeRef, 0)} °C y líquido a ${fmt(r.referencia.TliqRef, 0)} °C), para que en este
    trabajo no pase de ${fmt(r.dpObjetivo, 3)} bar. Elige en el catálogo del fabricante, para este gas, un filtro con capacidad igual o mayor.
  </p>`;
}

/* ───────────────────────────── Página 2 ───────────────────────────── */

function pagina2(d) {
  const r = d.resultado;
  const filas = (d.tubos || [])
    .map(
      (t) => `<tr class="${d.idMm && Math.abs(t.id - d.idMm) < 0.005 ? 'sel' : t === d.tuboSugerido ? 'sug' : ''}">
        <td>${esc(t.od)}</td><td class="n">${fmt(t.id, 2)}</td><td class="n">${fmt(t.v, 2)}</td>
        <td style="color:${COLOR_VEL[t.valoracion.clave]}"><b>${esc(t.valoracion.texto)}</b></td></tr>`,
    )
    .join('');
  const avisos = d.avisos || avisosFiltro(r);
  return `
  <h2>Esquema del circuito</h2>
  <div class="fig">${d.svgCircuito || ''}</div>

  <h2>Línea de líquido: velocidad por tubo</h2>
  <table>
    <thead><tr><th>Tubo (Ø ext.)</th><th class="n">Ø int. típico (mm)</th><th class="n">Velocidad (m/s)</th><th>Valoración</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <p class="nota">Adecuada hasta ${fmt(VELOCIDAD_LIQUIDO.optima, 1)} m/s; alta hasta ${fmt(VELOCIDAD_LIQUIDO.maxima, 1)} m/s; por encima, ruido, golpe de ariete y mucha pérdida de presión. Ø interior típico: mide el de tu tubo.
  ${d.tuboSugerido ? `Tubo mínimo adecuado: <b>${esc(d.tuboSugerido.od)}</b>.` : ''}</p>

  <h2>Avisos</h2>
  ${listaAvisos(avisos)}`;
}

/* ───────────────────────────── Página 3 ───────────────────────────── */

function pagina3(d) {
  const r = d.resultado;
  const hayFiltro = r.dpFiltro != null;
  const comprobacion = hayFiltro
    ? `<div class="dos2">
        ${dato('Filtro elegido', esc(d.filtroModelo || '—'))}
        ${dato('Capacidad de catálogo', esc(textoPotencia(d.catalogo.Q)))}
        ${dato('Condiciones del catálogo', `ΔP ${fmt(d.catalogo.dp, 3)} bar · ${fmt(d.catalogo.TeRef, 0)} °C / ${fmt(d.catalogo.TliqRef, 0)} °C`)}
        ${dato('Carga del filtro', `${fmt(r.cargaFiltro * 100, 0)} % de su caudal nominal`)}
        ${dato('Caída de presión del filtro nuevo', `<span style="color:${r.dpFiltroOk ? '#15803d' : '#b91c1c'}">${bar(r.dpFiltro, 3)}</span>`)}
        ${dato('Subida de la línea', `${fmt(d.desnivel || 0, 1)} m → ${bar(r.dpEstatica, 3)}`)}
        ${dato('Otras pérdidas de la línea', bar(r.dpOtros, 3))}
        ${dato('Pérdida total', bar(r.dpTotal, 3))}
        ${dato('Margen que da el subenfriamiento', bar(r.margenBar, 3))}
        ${dato('Margen consumido', `${fmt(r.usoMargen * 100, 0)} %`)}
        ${dato('Presión al final de la línea', `${bar(r.pFinal)} (${bar(r.pFinal - P_ATM)} rel.)`)}
        ${dato('Vapor antes de la válvula', r.hayVapor ? '<b style="color:#b91c1c">Sí: hierve</b>' : 'No')}
      </div>`
    : '<p class="nota">No se ha indicado la capacidad de catálogo de un filtro concreto: solo se ha calculado la capacidad mínima necesaria.</p>';
  const caso = CASOS_FILTRO.find((c) => c.id === d.casoId);
  return `
  <h2>Comprobación con el filtro elegido</h2>
  ${comprobacion}

  ${caso ? `<h2>Tipo de filtro según el caso</h2><div class="caja"><h3>${esc(caso.nombre)}</h3><p>${esc(caso.texto)}</p></div>` : ''}

  <h2>Montaje</h2>
  <ul class="sup">${MONTAJE_FILTRO.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>

  <h2>Cómo se ha calculado</h2>
  <ul class="sup">
    <li>El caudal de refrigerante es la potencia dividida por el efecto frigorífico, calculado con las propiedades del gas (CoolProp) entre el vapor a la salida del evaporador y el líquido subenfriado a la entrada de la válvula. Se desprecia la compresión del líquido (≈ 1 %), del lado seguro.</li>
    <li>La caída de presión se obtiene de la capacidad que da el catálogo del filtro, escalada con el caudal y con la densidad del líquido: ΔP = ΔP<sub>catálogo</sub> · (ṁ / ṁ<sub>catálogo</sub>)² · (ρ<sub>catálogo</sub> / ρ). Las capacidades de los catálogos suelen darse a ${fmt(REFERENCIA_CATALOGO.dp, 2)} bar.</li>
    <li>El subenfriamiento equivale a un margen de presión: si las pérdidas de la línea (filtro, subida y otros elementos) lo agotan, el líquido hierve antes de la válvula. Se avisa a partir del ${fmt(UMBRAL_MARGEN.aviso * 100, 0)} % del margen.</li>
    <li>La capacidad de agua del filtro y la compatibilidad con el gas y el aceite no se calculan: se miran en el catálogo del fabricante.</li>
    <li>Este informe es una ayuda de selección. La última palabra la tiene la ficha técnica del fabricante del filtro.</li>
  </ul>

  <div class="firma"><div>Técnico responsable</div><div>Conforme el cliente</div></div>`;
}

/**
 * @param {object} d
 * @param {string} d.referencia       p. ej. FIL-20261029-1432
 * @param {Date}   d.fecha
 * @param {object|null} d.empresa     fila de CompanySettings
 * @param {object|null} d.cliente     { nombre, nif, direccion, telefono, email }
 * @param {object} d.equipo           { descripcion, ubicacion, notas }
 * @param {object} d.resultado        resultado de calcularFiltro (ok:true)
 * @param {string} d.gasNombre
 * @param {string} [d.aplicacionNombre]
 * @param {number} d.potenciaW
 * @param {Array}  [d.tubos]          tablaTubos
 * @param {object} [d.tuboSugerido]
 * @param {number} [d.idMm]           tubo elegido
 * @param {object} [d.catalogo]       { Q, dp, TeRef, TliqRef }
 * @param {string} [d.filtroModelo]
 * @param {number} [d.desnivel]
 * @param {string} [d.casoId]
 * @param {string} [d.svgCircuito]
 */
export function htmlInformeFiltro(d) {
  const f = d.fecha instanceof Date ? d.fecha : new Date();
  const datos = {
    ...d,
    fechaTexto: `${f.toLocaleDateString('es-ES')} ${f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
    casoNombre: CASOS_FILTRO.find((c) => c.id === d.casoId)?.nombre,
  };
  const cuerpos = [pagina1(datos), pagina2(datos), pagina3(datos)];
  const total = cuerpos.length;
  const paginas = cuerpos
    .map((c, i) => `<section class="pagina">${cabecera(datos, i === 0)}${c}${pie(datos, i + 1, total)}</section>`)
    .join('');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Filtro deshidratador ${esc(d.referencia)}</title><style>${CSS}${CSS_EXTRA}</style></head><body>${paginas}</body></html>`;
}

