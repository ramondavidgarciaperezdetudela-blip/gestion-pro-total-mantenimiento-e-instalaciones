/**
 * INFORME DE CÁLCULO DE TUBO CAPILAR — Gestión Pro Total
 *
 * Genera el documento completo (HTML listo para imprimir o convertir en PDF) a partir de los
 * resultados de `capilar.js`. Son cuatro páginas A4 de tamaño fijo:
 *
 *   1  Datos del trabajo, condiciones, estado del refrigerante y resultado.
 *   2  Esquemas: circuito con el capilar señalado y el capilar con sus cotas.
 *   3  Perfil de presión/temperatura, alternativas de diámetro y avisos.
 *   4  Hoja de ajuste en banco, hipótesis del modelo y firma.
 *
 * Las páginas miden exactamente un A4 (800 × 1131 px en pantalla, 210 × 296 mm al imprimir) para
 * que el PDF —que se hace troceando la captura en folios— corte siempre entre página y página.
 *
 * Todo lo que viene de fuera (nombres, notas) se escapa antes de entrar en el HTML.
 *
 * Autor: David García (Gestión Pro Total).
 */
import { esc, fmt, esquemaCircuito, esquemaCapilarCotas, graficoPerfilSVG } from './esquemasFrigorificos.js';
import { SUPUESTOS_CAPILAR, avisosResultado, LONGITUD } from './capilar.js';
import { textoPotencia } from './potencia.js';

const P_ATM = 1.01325;
const bar = (p) => `${fmt(p, 2)} bar`;
const barRel = (p) => `${fmt(p - P_ATM, 2)} bar rel.`;

const COLOR_VALORACION = {
  optimo: '#15803d',
  justo: '#b45309',
  corto: '#b45309',
  largo: '#b45309',
  muylargo: '#b91c1c',
  imposible: '#b91c1c',
};

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; font-family: 'Segoe UI', Inter, Arial, Helvetica, sans-serif; font-size: 11.5px; line-height: 1.4; }
.pagina { position: relative; width: 800px; height: 1131px; padding: 22px 30px 20px; overflow: hidden; page-break-after: always; break-after: page; background: #fff; }
.pagina:last-child { page-break-after: auto; break-after: auto; }
@media print { .pagina { width: 210mm; height: 296mm; } }
.cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 2px solid #0e7490; padding-bottom: 8px; margin-bottom: 12px; }
.cab .emp { display: flex; gap: 10px; align-items: flex-start; min-width: 0; }
.cab img { max-width: 110px; max-height: 52px; object-fit: contain; }
.cab .emp b { font-size: 13px; display: block; }
.cab .emp small { display: block; color: #475569; font-size: 9.5px; }
.cab .doc { text-align: right; flex-shrink: 0; }
.cab .doc b { font-size: 11.5px; color: #0e7490; letter-spacing: .05em; text-transform: uppercase; display: block; }
.cab .doc small { display: block; color: #475569; font-size: 9.5px; }
.pie { position: absolute; left: 30px; right: 30px; bottom: 14px; display: flex; justify-content: space-between; color: #64748b; font-size: 9px; border-top: 1px solid #e2e8f0; padding-top: 5px; }
h1 { font-size: 19px; margin: 0 0 2px; letter-spacing: -.01em; }
.sub { color: #475569; margin: 0 0 8px; }
h2 { font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: #0e7490; border-left: 4px solid #0e7490; padding-left: 7px; margin: 13px 0 6px; }
.caja { border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; }
.caja h3 { margin: 0 0 3px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
.caja p { margin: 1px 0; }
.dos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dos2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 22px; }
.dato { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px dotted #cbd5e1; }
.dato span { color: #475569; }
.dato b { text-align: right; font-weight: 600; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #cbd5e1; padding: 3px 6px; text-align: left; }
th { background: #f1f5f9; font-size: 9.5px; text-transform: uppercase; letter-spacing: .03em; color: #334155; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
tr.sel td { background: #ecfeff; font-weight: 600; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.kpi { border: 1px solid #67e8f9; background: #ecfeff; border-radius: 6px; padding: 6px 9px; }
.kpi small { color: #155e75; display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
.kpi b { font-size: 17px; color: #0f172a; }
.kpi i { font-style: normal; font-size: 10px; color: #475569; display: block; }
.av { border-left: 4px solid; padding: 5px 8px; margin: 4px 0; border-radius: 3px; font-size: 10.5px; }
.av.error { border-color: #dc2626; background: #fef2f2; }
.av.aviso { border-color: #d97706; background: #fffbeb; }
.av.info { border-color: #0284c7; background: #f0f9ff; }
.fig { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; background: #fbfdff; margin-bottom: 9px; }
.fig svg { display: block; width: 100%; height: auto; }
.fig.med svg { width: 88%; margin: 0 auto; }
.banco td { height: 25px; }
.firma { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; margin-top: 30px; }
.firma div { border-top: 1px solid #334155; padding-top: 4px; text-align: center; color: #475569; font-size: 10px; }
ul.sup { margin: 4px 0 0; padding-left: 16px; }
ul.sup li { margin: 2px 0; }
.nota { color: #475569; font-size: 10px; margin-top: 6px; }
.rec { max-height: 38px; overflow: hidden; }
.lineas div { height: 24px; border-bottom: 1px solid #cbd5e1; }
`;

/** Línea «etiqueta … valor». */
const dato = (etiqueta, valor) => `<div class="dato"><span>${esc(etiqueta)}</span><b>${valor === undefined || valor === null || valor === '' ? '—' : valor}</b></div>`;

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
    <div class="doc"><b>Informe de cálculo · Tubo capilar</b><small>Ref. ${esc(d.referencia)}</small><small>${esc(d.fechaTexto)}</small></div>
  </div>`;
}

const pie = (d, n, total) =>
  `<div class="pie"><span>${esc(d.referencia)}</span><span>Gestión Pro Total · Cálculo de tubo capilar · ${esc(d.gasNombre)}</span><span>Página ${n} de ${total}</span></div>`;

const listaAvisos = (avisos) =>
  avisos.length
    ? avisos.map((a) => `<div class="av ${esc(a.nivel)}">${esc(a.texto)}</div>`).join('')
    : '<div class="av info">Sin avisos para estas condiciones.</div>';

/* ───────────────────────────── Página 1 ───────────────────────────── */

function pagina1(d) {
  const { ctx, sel } = d;
  const modoDiseno = d.modo === 'diseno';
  const c = d.cliente;
  const eq = d.equipo || {};

  const cliente = c
    ? `<p><b>${esc(c.nombre)}</b></p>${c.nif ? `<p>NIF: ${esc(c.nif)}</p>` : ''}${c.direccion ? `<p>${esc(c.direccion)}</p>` : ''}${c.telefono ? `<p>Tel.: ${esc(c.telefono)}</p>` : ''}${c.email ? `<p>${esc(c.email)}</p>` : ''}`
    : '<p style="color:#64748b">Sin cliente asignado.</p>';
  const equipo = [eq.descripcion && `<p><b>${esc(eq.descripcion)}</b></p>`, eq.ubicacion && `<p>${esc(eq.ubicacion)}</p>`, eq.notas && `<p class="rec">${esc(eq.notas)}</p>`]
    .filter(Boolean)
    .join('') || '<p style="color:#64748b">Sin datos del equipo.</p>';

  const condiciones = [
    dato('Refrigerante', `${esc(d.gasNombre)}${ctx.clase ? ` (${esc(ctx.clase)})` : ''}`),
    ctx.mezcla ? dato('Composición (en masa)', esc(ctx.composicion)) : dato('Tipo', 'Sustancia pura / pseudopuro'),
    dato('Aplicación', esc(d.aplicacionNombre || 'Personalizada')),
    modoDiseno
      ? dato('Potencia frigorífica pedida', `${fmt(d.potenciaW, 0)} W${d.potenciaUnidad && d.potenciaUnidad !== 'W' ? ` (${fmt(d.potenciaValor, 2)} ${esc(d.potenciaUnidad)})` : ''}`)
      : dato('Capilar existente', `Ø int. ${fmt(sel.D * 1000, 2)} mm × ${fmt(d.L, 2)} m`),
    dato('Temperatura de evaporación (rocío)', `${fmt(ctx.Te, 1)} °C`),
    dato('Temperatura de condensación (rocío)', `${fmt(ctx.Tc, 1)} °C`),
    dato('Subenfriamiento', `${fmt(ctx.subenf, 1)} K`),
    dato('Recalentamiento útil', `${fmt(ctx.recal, 1)} K`),
  ].join('');

  const estados = `<table>
    <tr><th>Punto</th><th class="n">Presión</th><th class="n">Temperatura</th><th class="n">Entalpía</th><th class="n">Título de vapor</th></tr>
    <tr><td>1 · Salida del evaporador (aspiración)</td><td class="n">${bar(ctx.Pe)} · ${barRel(ctx.Pe)}</td><td class="n">${fmt(ctx.Te + ctx.recal, 1)} °C</td><td class="n">${fmt(ctx.hOut, 1)} kJ/kg</td><td class="n">1 (vapor)</td></tr>
    <tr><td>3 · Salida del condensador (entrada al capilar)</td><td class="n">${bar(ctx.Pc)} · ${barRel(ctx.Pc)}</td><td class="n">${fmt(ctx.Tin, 1)} °C</td><td class="n">${fmt(ctx.hIn, 1)} kJ/kg</td><td class="n">0 (líquido)</td></tr>
    <tr><td>4 · Entrada al evaporador (salida del capilar)</td><td class="n">${bar(ctx.Pe)} · ${barRel(ctx.Pe)}</td><td class="n">${fmt(ctx.TevEntrada, 1)} °C</td><td class="n">${fmt(ctx.hIn, 1)} kJ/kg</td><td class="n">${fmt(ctx.xEv * 100, 0)} %</td></tr>
  </table>
  <p class="nota">La descarga del compresor (punto 2) depende de cada compresor y no interviene en el cálculo del capilar. Presiones absolutas y manométricas (referidas a 1,01325 bar). Efecto frigorífico q₀ = ${fmt(ctx.q0, 1)} kJ/kg.</p>`;

  let resultado;
  if (modoDiseno) {
    resultado = `<div class="kpis">
      <div class="kpi"><small>Ø interior</small><b>${fmt(sel.D * 1000, 2)} mm</b><i>Ø exterior orientativo ${fmt(d.odmm, 2)} mm</i></div>
      <div class="kpi"><small>Longitud calculada</small><b>${fmt(sel.L, 2)} m</b><i>${esc(d.valoracion?.texto || '')}</i></div>
      <div class="kpi"><small>Caudal másico</small><b>${fmt(sel.mdot * 1000, 3)} g/s</b><i>${fmt(sel.mdot * 3600, 2)} kg/h</i></div>
      <div class="kpi"><small>Corte inicial para el banco</small><b>${fmt(sel.L * 1.2, 2)} m</b><i>calculada + 20 %</i></div>
    </div>`;
  } else {
    const dif = d.potenciaW > 0 ? (sel.Q / d.potenciaW - 1) * 100 : null;
    resultado = `<div class="kpis">
      <div class="kpi"><small>Capacidad del capilar</small><b>${esc(textoPotencia(sel.Q))}</b><i>${fmt(sel.Q * 0.8598, 0)} kcal/h · ${fmt(sel.Q * 3.41214, 0)} BTU/h</i></div>
      <div class="kpi"><small>Caudal másico</small><b>${fmt(sel.mdot * 1000, 3)} g/s</b><i>${fmt(sel.mdot * 3600, 2)} kg/h</i></div>
      <div class="kpi"><small>Capilar</small><b>Ø ${fmt(sel.D * 1000, 2)} × ${fmt(d.L, 2)}</b><i>mm × m</i></div>
      <div class="kpi"><small>${dif === null ? 'Potencia a cubrir' : dif >= 0 ? 'Cubre la potencia' : 'No llega a la potencia'}</small><b>${dif === null ? '—' : `${dif >= 0 ? '+' : ''}${fmt(dif, 0)} %`}</b><i>${dif === null ? 'sin potencia de comparación' : `frente a ${fmt(d.potenciaW, 0)} W`}</i></div>
    </div>`;
  }

  const detalle = `<div class="dos2">
    ${dato('Longitud total', `${fmt(sel.L, 3)} m`)}
    ${dato('Velocidad a la entrada', `${fmt(sel.velEntrada, 2)} m/s`)}
    ${dato('Tramo de líquido', `${fmt(sel.Lliq, 3)} m (${fmt(sel.ratioLiq * 100, 0)} %)`)}
    ${dato('Velocidad a la salida', `${fmt(sel.velSalida, 1)} m/s`)}
    ${dato('Tramo bifásico', `${fmt(sel.L2f, 3)} m`)}
    ${dato('Reynolds (líquido)', fmt(sel.ReLiq, 0))}
    ${dato('Presión al empezar a vaporizar', bar(sel.Pflash))}
    ${dato('Presión a la salida', bar(sel.Psalida))}
    ${dato('Temperatura a la salida', `${fmt(sel.TSalida, 1)} °C`)}
    ${dato('Título de vapor a la salida', `${fmt(sel.xSalida * 100, 0)} %`)}
    ${dato('Flujo en la salida', sel.estrangulado ? 'Estrangulado (crítico)' : 'Subcrítico')}
    ${dato('Pérdida de entrada', `${fmt(ctx.Pc - sel.P1, 3)} bar`)}
  </div>`;

  return `<h1>${modoDiseno ? 'Dimensionado de tubo capilar' : 'Comprobación de tubo capilar existente'}</h1>
  <p class="sub">${modoDiseno ? 'Diámetro y longitud necesarios para la potencia frigorífica pedida.' : 'Potencia frigorífica que pasa el capilar instalado en las condiciones indicadas.'}</p>
  <div class="dos"><div class="caja"><h3>Cliente</h3>${cliente}</div><div class="caja"><h3>Equipo / instalación</h3>${equipo}</div></div>
  <h2>Condiciones de cálculo</h2><div class="dos2">${condiciones}</div>
  <h2>Estado del refrigerante</h2>${estados}
  <h2>Resultado${modoDiseno ? '' : ' de la comprobación'}</h2>${resultado}
  <h2>Detalle del capilar</h2>${detalle}
  <h2>Observaciones del técnico</h2>
  <div class="lineas"><div></div><div></div><div></div><div></div></div>`;
}

/* ───────────────────────────── Página 2 ───────────────────────────── */

function pagina2(d) {
  const { ctx, sel } = d;
  const etiquetas = {
    gas: d.gasNombre,
    Pc: bar(ctx.Pc),
    Tc: `${fmt(ctx.Tc, 1)} °C`,
    Pe: bar(ctx.Pe),
    Te: `${fmt(ctx.Te, 1)} °C`,
    capilar: `Ø ${fmt(sel.D * 1000, 2)} mm × ${fmt(sel.L, 2)} m`,
    carga: `${textoPotencia(d.modo === 'diseno' ? d.potenciaW : sel.Q)} · ${fmt(sel.mdot * 1000, 2)} g/s`,
  };
  const circuito = esquemaCircuito({
    expansion: 'capilar',
    filtro: d.filtro !== false,
    visor: d.visor === true,
    solenoide: d.solenoide === true,
    resaltar: 'capilar',
    titulo: 'Circuito frigorífico con tubo capilar',
    etiquetas,
  });
  const cotas = esquemaCapilarCotas({
    L: sel.L,
    Lliq: sel.Lliq,
    L2f: sel.L2f,
    dInt: sel.D * 1000,
    dExt: d.odmm,
    Pc: ctx.Pc,
    Pflash: sel.Pflash,
    Psalida: sel.Psalida,
    Pe: ctx.Pe,
    Tin: ctx.Tin,
    TSalida: sel.TSalida,
    xSalida: sel.xSalida,
    estrangulado: sel.estrangulado,
    gas: d.gasNombre,
  });
  return `<h2>Esquema del circuito</h2><div class="fig">${circuito}</div>
  <h2>Dimensiones del capilar</h2><div class="fig">${cotas}</div>
  <p class="nota">Los esquemas son orientativos y no están a escala. El filtro deshidratador se instala siempre justo antes del capilar; su tamaño se calcula en la pantalla «Filtros deshidratadores».</p>`;
}

/* ───────────────────────────── Página 3 ───────────────────────────── */

function pagina3(d) {
  const { ctx, sel } = d;
  const perfil = sel.perfil ? graficoPerfilSVG(sel.perfil, { Pe: ctx.Pe }) : '';
  let alternativas = '';
  if (d.modo === 'diseno' && Array.isArray(d.tabla)) {
    const filas = d.tabla
      .map((r) => {
        const v = r.valoracion;
        return `<tr class="${r.dmm === d.dmm ? 'sel' : ''}">
          <td class="n">${fmt(r.dmm, 2)}</td><td class="n">${fmt(r.odmm, 2)}</td>
          <td class="n">${r.imposible ? '—' : fmt(r.L, 2)}</td>
          <td class="n">${r.imposible ? '—' : fmt(r.Lliq, 2)}</td>
          <td class="n">${r.imposible ? '—' : fmt(r.Psalida, 2)}</td>
          <td style="color:${COLOR_VALORACION[v.clave] || '#0f172a'};font-weight:600">${esc(v.texto)}</td></tr>`;
      })
      .join('');
    alternativas = `<h2>Alternativas de diámetro (misma potencia)</h2>
    <table><tr><th class="n">Ø int. (mm)</th><th class="n">Ø ext. (mm)</th><th class="n">Longitud (m)</th><th class="n">Tramo líquido (m)</th><th class="n">P salida (bar)</th><th>Valoración</th></tr>${filas}</table>
    <p class="nota">Se recomiendan longitudes entre ${fmt(LONGITUD.minima, 0)} y ${fmt(LONGITUD.maxima, 0)} m: más cortas son difíciles de ajustar; más largas, de alojar. El Ø exterior es el menor normalizado con pared de al menos 0,5 mm.</p>`;
  } else if (Array.isArray(d.carta)) {
    const filas = d.carta
      .map(
        (c) =>
          `<tr class="${Math.abs(c.f - 1) < 1e-9 ? 'sel' : ''}"><td class="n">${fmt(c.L, 2)} m</td><td class="n">${c.f === 1 ? 'instalado' : `${c.f > 1 ? '+' : ''}${fmt((c.f - 1) * 100, 0)} %`}</td><td class="n">${esc(textoPotencia(c.Q))}</td><td class="n">${fmt(c.Q * 0.8598, 0)}</td><td class="n">${fmt(c.Q * 3.41214, 0)}</td></tr>`,
      )
      .join('');
    alternativas = `<h2>Capacidad según la longitud (mismo diámetro)</h2>
    <table><tr><th class="n">Longitud</th><th class="n">Respecto al instalado</th><th class="n">Capacidad</th><th class="n">kcal/h</th><th class="n">BTU/h</th></tr>${filas}</table>`;
  }
  let sens = '';
  if (d.sens) {
    sens = `<h2>Sensibilidad al corte</h2>
    <p>Un capilar un ${fmt(d.sens.frac * 100, 0)} % más largo cambia el caudal un <b>${fmt(d.sens.masLargo, 1)} %</b>; uno un ${fmt(d.sens.frac * 100, 0)} % más corto lo cambia un <b>+${fmt(d.sens.masCorto, 1)} %</b>. Por eso el capilar definitivo se corta siempre en el banco, partiendo de una longitud mayor.</p>`;
  }
  const avisos = [...ctx.avisos, ...avisosResultado(ctx, sel)];
  return `<h2>Perfil a lo largo del capilar</h2><div class="fig">${perfil}</div>
  ${alternativas}${sens}
  <h2>Avisos</h2>${listaAvisos(avisos)}`;
}

/* ───────────────────────────── Página 4 ───────────────────────────── */

function pagina4(d) {
  const filasBanco = Array.from({ length: 5 }, () => '<tr class="banco"><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
  return `<h2>Ajuste en banco de pruebas</h2>
  <p>El cálculo da la longitud teórica. Parta de un capilar algo más largo (aquí <b>${fmt(d.sel.L * 1.2, 2)} m</b>), conéctelo como en la instalación definitiva y recórtelo poco a poco hasta lograr la presión de evaporación y el recalentamiento previstos. Anote cada ensayo:</p>
  <table class="banco" style="margin-top:6px"><tr><th>Fecha</th><th>Longitud ensayada (m)</th><th>Presión de evap. (bar)</th><th>Recalent. (K)</th><th>Subenfr. (K)</th><th>Resultado</th></tr>${filasBanco}</table>
  <div class="dos2" style="margin-top:8px">${dato('Longitud definitiva', '________ m')}${dato('Verificado por', '______________')}</div>
  <h2>Hipótesis y límites del modelo</h2>
  <ul class="sup">${SUPUESTOS_CAPILAR.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
  <p class="nota">Presiones, temperaturas y entalpías del refrigerante calculadas con CoolProp (ecuaciones de estado de referencia). El resultado es una ayuda al técnico: no sustituye al ensayo ni a los datos del fabricante del compresor.</p>
  <div class="firma"><div>El técnico</div><div>Conforme el cliente</div></div>`;
}

/* ───────────────────────────── Documento ───────────────────────────── */

/**
 * @param {object} d
 * @param {'diseno'|'comprobar'} d.modo
 * @param {string} d.referencia            p. ej. CAP-20261029-1432
 * @param {Date}   d.fecha
 * @param {object|null} d.empresa          fila de CompanySettings
 * @param {object|null} d.cliente          { nombre, nif, direccion, telefono, email }
 * @param {object} d.equipo                { descripcion, ubicacion, notas }
 * @param {object} d.ctx                   resultado de crearContexto (ok:true)
 * @param {string} d.gasNombre
 * @param {string} d.aplicacionNombre
 * @param {number} [d.potenciaW]           potencia pedida (diseño) o de comparación (comprobación)
 * @param {number} [d.potenciaValor]       tal como la escribió el usuario
 * @param {string} [d.potenciaUnidad]
 * @param {object} d.sel                   resultado del tubo elegido (con perfil)
 * @param {number} [d.dmm]                 diámetro elegido (mm)
 * @param {number} d.odmm                  Ø exterior orientativo
 * @param {object} [d.valoracion]
 * @param {Array}  [d.tabla]               tablaDiametros (diseño)
 * @param {Array}  [d.carta]               [{L, f, Q}] (comprobación)
 * @param {number} [d.L]                   longitud instalada (comprobación)
 * @param {object} [d.sens]                sensibilidadLongitud
 * @param {boolean} [d.filtro]             dibujar el filtro en el esquema (por defecto sí)
 * @param {boolean} [d.visor]              dibujar el visor de líquido
 * @param {boolean} [d.solenoide]          dibujar la electroválvula de líquido
 */
export function htmlInformeCapilar(d) {
  const f = d.fecha instanceof Date ? d.fecha : new Date();
  const datos = {
    ...d,
    fechaTexto: `${f.toLocaleDateString('es-ES')} ${f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
  };
  const cuerpos = [pagina1(datos), pagina2(datos), pagina3(datos), pagina4(datos)];
  const total = cuerpos.length;
  const paginas = cuerpos
    .map((c, i) => `<section class="pagina">${cabecera(datos, i === 0)}${c}${pie(datos, i + 1, total)}</section>`)
    .join('');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cálculo de tubo capilar ${esc(d.referencia)}</title><style>${CSS}</style></head><body>${paginas}</body></html>`;
}

/** Referencia del informe: CAP-AAAAMMDD-HHMM. */
export function referenciaInforme(fecha = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `CAP-${fecha.getFullYear()}${p(fecha.getMonth() + 1)}${p(fecha.getDate())}-${p(fecha.getHours())}${p(fecha.getMinutes())}`;
}
