/**
 * informePlano.js — El informe del plano, listo para imprimir o guardar en PDF.
 *
 * Las tablas en pantalla están apretadas porque comparten sitio con el dibujo
 * y los paneles. En papel eso no vale: el informe se le entrega al cliente y
 * se archiva con el trabajo, así que aquí se genera aparte, con el ancho
 * completo de la hoja, tipografía legible y las tablas sin cortar.
 *
 * Se devuelve HTML en una cadena. Quien lo imprime es printHelper, que ya sabe
 * usar la impresión nativa en el móvil y la del navegador en el ordenador.
 */

const escapar = (t) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const euros = (n) => `${(Number(n) || 0).toFixed(2)} €`;

/**
 * @param {object} datos
 * @param {object} datos.empresa     ficha de CompanySettings
 * @param {string} datos.cliente
 * @param {Array}  datos.fichas      resumen técnico por estancia
 * @param {object} datos.resumen     totales del plano
 * @param {Array}  datos.lineas      líneas de material
 * @param {object} datos.totales     { coste, subtotal, ivaImporte, total, margen, iva }
 * @param {Array}  datos.recorridos  recorridos revisados
 * @param {string} datos.planoImg    dataURL del dibujo (opcional)
 * @param {Array}  datos.plantas
 */
export function informeHtml({
  empresa = {}, cliente = '', fichas = [], resumen = {}, lineas = [],
  totales = {}, recorridos = [], planoImg = '', plantas = [],
}) {
  const hoy = new Date().toLocaleDateString('es-ES');

  const cabecera = `
    <div class="cabecera">
      <div>
        ${empresa.logo_url ? `<img class="logo" src="${escapar(empresa.logo_url)}" alt="">` : ''}
        <div class="empresa">${escapar(empresa.company_name || 'Mi empresa')}</div>
        <div class="datos-empresa">
          ${[empresa.nif, empresa.address, empresa.city, empresa.phone, empresa.email]
            .filter(Boolean).map(escapar).join(' · ')}
        </div>
      </div>
      <div class="derecha">
        <div class="titulo">Informe técnico y presupuesto</div>
        <div class="datos-empresa">Fecha: ${hoy}</div>
        ${cliente ? `<div class="datos-empresa">Cliente: <b>${escapar(cliente)}</b></div>` : ''}
      </div>
    </div>`;

  const totalesPlano = `
    <h2>Resumen de la instalación</h2>
    <table class="datos">
      <tr>
        <th>Superficie total</th><td>${resumen.area_total ?? 0} m²</td>
        <th>Carga estimada</th><td>${resumen.frigorias_total ?? 0} frig/h</td>
      </tr>
      <tr>
        <th>Potencia</th><td>${resumen.kw_total ?? 0} kW</td>
        <th>${resumen.es_refrigeracion ? 'Condensadora' : 'Unidad exterior'}</th>
        <td>${resumen.kw_exterior_comercial ?? 0} kW</td>
      </tr>
      <tr>
        <th>Tubería total</th><td>${resumen.metros_tuberia_total ?? 0} m</td>
        <th>Plantas</th><td>${plantas.length}</td>
      </tr>
    </table>`;

  const tablaFichas = fichas.length ? `
    <h2>Detalle por estancia</h2>
    <table class="rejilla">
      <thead>
        <tr>
          <th>Estancia</th>
          <th class="num">Superficie</th>
          <th class="num">Carga</th>
          <th>Máquina</th>
          <th class="num">Cubre</th>
          <th>Tubería</th>
          <th class="num">Metros</th>
          <th class="num">Gas extra</th>
        </tr>
      </thead>
      <tbody>
        ${fichas.map(f => `
          <tr>
            <td><b>${escapar(f.estancia)}</b></td>
            <td class="num">${f.superficie} m²</td>
            <td class="num">${f.carga_frigorias} frig/h</td>
            <td>${escapar(f.maquina)}</td>
            <td class="num ${f.suficiente ? 'ok' : 'mal'}">${f.superficie_cubierta} m²</td>
            <td>${escapar(f.tuberia_liquido)} / ${escapar(f.tuberia_gas)}</td>
            <td class="num">${f.metros_tuberia} m</td>
            <td class="num">${f.gas_extra_g > 0 ? `${f.gas_extra_g} g` : '—'}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6"><b>Totales</b></td>
          <td class="num"><b>${fichas.reduce((s, f) => s + f.metros_tuberia, 0).toFixed(1)} m</b></td>
          <td class="num"><b>${fichas.reduce((s, f) => s + f.gas_extra_g, 0)} g</b></td>
        </tr>
      </tfoot>
    </table>
    ${fichas.some(f => !f.suficiente)
      ? '<p class="aviso">Hay máquinas que no cubren la superficie de su estancia. Revisa la potencia antes de cerrar el presupuesto.</p>'
      : ''}` : '';

  const tablaRecorridos = recorridos.length ? `
    <h2>Recorridos de la instalación</h2>
    <table class="rejilla">
      <thead>
        <tr>
          <th>Recorrido</th><th>Planta</th>
          <th class="num">Metros</th><th class="num">Codos</th>
          <th class="num">Equivalentes</th><th>Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${recorridos.map((r, i) => `
          <tr>
            <td>${r.esConducto ? 'Conducto' : 'Tubería'} ${i + 1}</td>
            <td>${escapar(r.planta || '')}</td>
            <td class="num">${r.revision.metros} m</td>
            <td class="num">${r.revision.codos}</td>
            <td class="num">${r.revision.metros_equivalentes ?? '—'}</td>
            <td class="obs">${(r.revision.avisos || []).map(a => escapar(a.texto)).join('<br>') || 'Correcto'}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

  const tablaPresupuesto = lineas.length ? `
    <h2>Presupuesto</h2>
    <table class="rejilla">
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="num">Cantidad</th>
          <th class="num">Precio</th>
          <th class="num">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${lineas.map(l => `
          <tr>
            <td>${escapar(l.descripcion)}</td>
            <td class="num">${l.cantidad} ${escapar(l.unidad)}</td>
            <td class="num">${euros(l.precio_ud)}</td>
            <td class="num">${euros(l.total)}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <table class="totales">
      <tr><td>Coste de material y mano de obra</td><td class="num">${euros(totales.coste)}</td></tr>
      ${totales.margen ? `<tr><td>Base imponible (margen ${totales.margen} %)</td><td class="num">${euros(totales.subtotal)}</td></tr>` : ''}
      <tr><td>IVA ${totales.iva ?? 21} %</td><td class="num">${euros(totales.ivaImporte)}</td></tr>
      <tr class="final"><td>TOTAL</td><td class="num">${euros(totales.total)}</td></tr>
    </table>` : '';

  const dibujo = planoImg
    ? `<h2>Plano</h2><div class="plano"><img src="${planoImg}" alt="Plano de la instalación"></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Informe técnico y presupuesto</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1e293b; font-size: 11pt; line-height: 1.45; margin: 0;
  }
  .cabecera {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 20px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 16px;
  }
  .logo { max-height: 54px; max-width: 190px; object-fit: contain; display: block; margin-bottom: 6px; }
  .empresa { font-size: 15pt; font-weight: 700; }
  .datos-empresa { font-size: 9pt; color: #64748b; }
  .derecha { text-align: right; }
  .titulo { font-size: 13pt; font-weight: 700; color: #1d4ed8; }

  h2 {
    font-size: 11.5pt; margin: 18px 0 7px; padding-bottom: 4px;
    border-bottom: 1px solid #cbd5e1; color: #0f172a;
    page-break-after: avoid;
  }

  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }

  /* Tablas de datos con rejilla: lo que se tiene que leer bien en papel. */
  .rejilla th, .rejilla td {
    border: 1px solid #cbd5e1; padding: 5px 7px; font-size: 9.5pt;
    vertical-align: top;
  }
  .rejilla thead th {
    background: #f1f5f9; font-weight: 700; text-align: left;
    font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.02em;
  }
  .rejilla tbody tr:nth-child(even) { background: #f8fafc; }
  .rejilla tfoot td { background: #f1f5f9; border-top: 2px solid #94a3b8; }
  .num { text-align: right; white-space: nowrap; }
  .obs { font-size: 8.5pt; color: #475569; }
  .ok { color: #15803d; }
  .mal { color: #b91c1c; font-weight: 700; }

  .datos th, .datos td { padding: 4px 8px; font-size: 10pt; border-bottom: 1px solid #e2e8f0; }
  .datos th { text-align: left; color: #64748b; font-weight: 600; width: 18%; }

  .totales { width: 58%; margin-left: auto; margin-top: 10px; }
  .totales td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  .totales .final td {
    font-size: 12.5pt; font-weight: 700; border-top: 2px solid #1e293b;
    border-bottom: none; padding-top: 8px;
  }

  .aviso {
    background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
    padding: 7px 10px; font-size: 9.5pt; border-radius: 4px;
  }

  .plano { text-align: center; page-break-inside: avoid; }
  .plano img { max-width: 100%; border: 1px solid #cbd5e1; }

  .pie {
    margin-top: 22px; padding-top: 8px; border-top: 1px solid #cbd5e1;
    font-size: 8pt; color: #94a3b8; text-align: center;
  }

  /* Que una fila no se parta entre dos hojas. */
  tr, .plano { page-break-inside: avoid; }
  thead { display: table-header-group; }
</style></head>
<body>
  ${cabecera}
  ${totalesPlano}
  ${tablaFichas}
  ${tablaRecorridos}
  ${tablaPresupuesto}
  ${dibujo}
  <div class="pie">
    Cálculos orientativos para presupuesto. Los valores definitivos dependen de la
    ficha técnica de cada equipo y de las condiciones reales de la instalación.
    ${escapar(empresa.company_name || '')} · ${hoy}
  </div>
</body></html>`;
}
