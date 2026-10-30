import React from 'react';
import { calculoClima, RANGOS_CLIMA, nivelRango } from '@/lib/diagnosticoClima';

/**
 * EsquemaSplit — el circuito de un split, con lo que SÍ se puede medir en él.
 *
 * Es el mismo esquema frigorífico del resto del diagnóstico, pero dibujado
 * como está la máquina de verdad: la evaporadora dentro de la casa y la
 * condensadora fuera, unidas por las dos tuberías, y con la toma de servicio
 * en la aspiración, que es la única que trae la mayoría de los splits.
 *
 * La diferencia importante está en el aire: en un split el aire es medio
 * diagnóstico. Por eso se dibujan las flechas de entrada y salida en las dos
 * unidades, con su temperatura y su salto, en el sitio donde se pone la sonda.
 *
 * Si no hay toma de alta, el manómetro de alta sale tachado y la temperatura
 * de condensación aparece marcada como ESTIMADA. Es preferible a dejar un
 * hueco vacío que parezca que falta por medir algo que la máquina no tiene.
 */

const AZUL = '#0284c7';     // baja / aspiración
const ROJOT = '#dc2626';    // descarga / gas caliente
const NARANJA = '#ea580c';  // línea de líquido
const VERDE = '#16a34a';
const AMBAR = '#d97706';
const ROJO = '#dc2626';
const GRIS = '#94a3b8';

const color = (nivel) => (
  nivel === 'ok' ? VERDE : nivel === 'aviso' ? AMBAR : nivel === 'mal' ? ROJO : GRIS
);
const txt = (v, u = '') => (v == null || v === '' || Number.isNaN(v) ? '—' : `${v}${u}`);

function Chip({ x, y, titulo, valor, col = '#0f172a', ancho = 108, aviso = false }) {
  return (
    <g>
      <rect x={x} y={y} width={ancho} height="30" rx="5" fill="#ffffff"
        stroke={aviso ? col : '#e2e8f0'} strokeWidth={aviso ? 1.6 : 1}
        strokeDasharray={aviso ? '4 2' : undefined} />
      <text x={x + ancho / 2} y={y + 12} fontSize="8.5" textAnchor="middle" fill="#64748b">{titulo}</text>
      <text x={x + ancho / 2} y={y + 24} fontSize="11.5" fontWeight="bold" textAnchor="middle" fill={col}>{valor}</text>
    </g>
  );
}

function Serpentin({ x, y, ancho, alto, vueltas, col }) {
  const paso = alto / (vueltas + 1);
  return (
    <g>
      {Array.from({ length: vueltas }, (_, i) => {
        const yy = y + paso * (i + 1);
        return <line key={i} x1={x + 8} y1={yy} x2={x + ancho - 8} y2={yy}
          stroke={col} strokeWidth="4" strokeLinecap="round" opacity="0.75" />;
      })}
    </g>
  );
}

/** Ventilador con su aspa, el de la interior o el de la exterior. */
function Ventilador({ cx, cy, r = 22 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" stroke="#475569" strokeWidth="1.8" />
      {[0, 60, 120, 180, 240, 300].map(a => (
        <line key={a} x1={cx} y1={cy}
          x2={cx + Math.cos((a * Math.PI) / 180) * (r - 4)}
          y2={cy + Math.sin((a * Math.PI) / 180) * (r - 4)}
          stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Flecha de aire con su etiqueta: por donde entra y por donde sale. */
function FlechaAire({ x, y, largo = 52, hacia = 1, etiqueta, valor, col = '#334155' }) {
  const x2 = x + largo * hacia;
  return (
    <g>
      <line x1={x} y1={y} x2={x2} y2={y} stroke={col} strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="0,-5 9,0 0,5" fill={col}
        transform={`translate(${x2},${y}) rotate(${hacia > 0 ? 0 : 180})`} />
      <text x={(x + x2) / 2} y={y - 8} fontSize="8.5" textAnchor="middle" fill="#64748b">{etiqueta}</text>
      <text x={(x + x2) / 2} y={y + 17} fontSize="10.5" fontWeight="bold" textAnchor="middle" fill={col}>{valor}</text>
    </g>
  );
}

export default function EsquemaSplit(props) {
  const c = calculoClima(props);
  const modoFrio = c.modo === 'frio';

  const rangoRC = RANGOS_CLIMA.recalentamiento[props.expansion === 'valvula' ? 'valvula' : 'capilar'];
  const colRC = color(nivelRango(c.recalentamiento, rangoRC));
  const colInt = color(nivelRango(c.dtAireInterior, RANGOS_CLIMA.dtAireInterior[c.modo]));
  const colExt = color(nivelRango(c.dtAireExterior, RANGOS_CLIMA.dtAireExterior[c.modo]));
  const colSub = color(nivelRango(c.subenfriamiento, RANGOS_CLIMA.subenfriamiento));
  const colDesc = c.tDescarga == null ? GRIS
    : c.tDescarga >= RANGOS_CLIMA.descarga.muyAlto ? ROJO
      : c.tDescarga >= RANGOS_CLIMA.descarga.alto ? AMBAR : VERDE;

  // En frío la interior evapora y la exterior condensa. En calor va al revés
  // (la válvula de 4 vías invierte el ciclo) y hay que dibujarlo así, que si
  // no el esquema dice una cosa y la máquina está haciendo otra.
  const colorInterior = modoFrio ? AZUL : ROJOT;
  const colorExterior = modoFrio ? ROJOT : AZUL;

  return (
    <div className="bg-white rounded-xl shadow p-3">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-1">
        <p className="text-xs font-bold text-slate-700">❄️ Circuito del split con tus medidas</p>
        <p className="text-[10px] text-slate-400">
          {c.gas} · {modoFrio ? 'modo frío' : 'modo calor'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 900 560" style={{ minWidth: 620 }} className="w-full h-auto">
          <rect x="0" y="0" width="900" height="560" fill="#fbfdff" />

          {/* Pared: separa lo que está dentro de la casa de lo que está fuera */}
          <line x1="430" y1="8" x2="430" y2="462" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="10 6" />
          <text x="215" y="22" fontSize="10.5" fontWeight="bold" textAnchor="middle" fill="#94a3b8">DENTRO · unidad interior</text>
          <text x="665" y="22" fontSize="10.5" fontWeight="bold" textAnchor="middle" fill="#94a3b8">FUERA · unidad exterior</text>

          {/* ── Unidad interior (evaporadora en frío) ────────────────────── */}
          <rect x="70" y="55" width="270" height="105" rx="10"
            fill={modoFrio ? '#eff6ff' : '#fff1f2'} stroke={colorInterior} strokeWidth="2.5" />
          <Serpentin x={70} y={55} ancho={270} alto={105} vueltas={4} col={colorInterior} />
          <text x="205" y="47" fontSize="11" fontWeight="bold" textAnchor="middle" fill={colorInterior}>
            {modoFrio ? 'EVAPORADORA (interior)' : 'INTERIOR (condensa en calor)'}
          </text>
          <Ventilador cx={205} cy={205} r={20} />
          <text x="205" y="243" fontSize="9" textAnchor="middle" fill="#64748b">ventilador interior</text>

          {/* Aire de la interior: entra por arriba (retorno) y sale por abajo */}
          <FlechaAire x={8} y={80} hacia={1} largo={54} col="#334155"
            etiqueta="aire aspiración" valor={txt(props.aireIntEntra, ' °C')} />
          <FlechaAire x={62} y={138} hacia={-1} largo={54} col={colInt}
            etiqueta="aire impulsión" valor={txt(props.aireIntSale, ' °C')} />
          <Chip x={120} y={265} ancho={170} col={colInt}
            titulo={`Salto del aire interior (${modoFrio ? 'enfría' : 'calienta'})`}
            valor={c.dtAireInterior != null ? `${c.dtAireInterior} K` : '—'} />

          {/* ── Tuberías entre las dos unidades ──────────────────────────── */}
          {/* Línea fina (líquido): de la exterior a la interior */}
          <polyline points="340,80 560,80" fill="none" stroke={NARANJA} strokeWidth="4" />
          <polygon points="0,-4 8,0 0,4" fill={NARANJA} transform="translate(452,80) rotate(180)" />
          <text x="452" y="70" fontSize="9" textAnchor="middle" fill={NARANJA}>línea fina (líquido)</text>

          {/* Línea gorda (aspiración): de la interior al compresor */}
          <polyline points="340,132 490,132 490,375 560,375" fill="none"
            stroke={AZUL} strokeWidth="6" strokeLinejoin="round" />
          <polygon points="0,-5 10,0 0,5" fill={AZUL} transform="translate(410,132) rotate(0)" />
          <text x="400" y="122" fontSize="9" textAnchor="middle" fill={AZUL}>línea gorda (aspiración)</text>

          {/* Toma de servicio de baja: la única que trae la mayoría */}
          <circle cx="490" cy="215" r="8" fill="#fff" stroke={AZUL} strokeWidth="2.5" />
          <text x="505" y="212" fontSize="8.5" fill={AZUL}>toma de baja</text>
          <text x="505" y="223" fontSize="8.5" fill="#94a3b8">(la que siempre hay)</text>
          <Chip x={325} y={200} ancho={110} col={AZUL} titulo="Presión de baja"
            valor={props.pBaja !== '' && props.pBaja != null ? `${props.pBaja} bar` : '—'} />

          {/* ── Unidad exterior ──────────────────────────────────────────── */}
          <rect x="560" y="55" width="230" height="105" rx="10"
            fill={modoFrio ? '#fff1f2' : '#eff6ff'} stroke={colorExterior} strokeWidth="2.5" />
          <Serpentin x={560} y={55} ancho={230} alto={105} vueltas={4} col={colorExterior} />
          <text x="675" y="47" fontSize="11" fontWeight="bold" textAnchor="middle" fill={colorExterior}>
            {modoFrio ? 'CONDENSADORA (exterior)' : 'EXTERIOR (evapora en calor)'}
          </text>
          <Ventilador cx={675} cy={205} r={22} />
          <text x="675" y="245" fontSize="9" textAnchor="middle" fill="#64748b">ventilador exterior</text>

          {/* El aire entra por la batería y lo escupe el ventilador */}
          <FlechaAire x={890} y={88} hacia={-1} largo={86} col="#334155"
            etiqueta="aire entrada" valor={txt(props.aireExtEntra, ' °C')} />
          <FlechaAire x={703} y={205} hacia={1} largo={80} col={colExt}
            etiqueta="aire salida" valor={txt(props.aireExtSale, ' °C')} />
          <Chip x={560} y={265} ancho={170} col={colExt} titulo="Salto del aire exterior"
            valor={c.dtAireExterior != null ? `${c.dtAireExterior} K` : '—'} />

          {/* ── Compresor y descarga ─────────────────────────────────────── */}
          <rect x="560" y="330" width="110" height="90" rx="12" fill="#e2e8f0" stroke="#475569" strokeWidth="2.5" />
          <circle cx="615" cy="375" r="25" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
          <path d="M615 354 A21 21 0 0 1 636 375" fill="none" stroke="#475569" strokeWidth="3" />
          <text x="615" y="437" fontSize="10.5" fontWeight="bold" textAnchor="middle" fill="#334155">COMPRESOR</text>

          <polyline points="670,375 870,375 870,180 770,180 770,160" fill="none"
            stroke={ROJOT} strokeWidth="5" strokeLinejoin="round" />
          <polygon points="0,-5 10,0 0,5" fill={ROJOT} transform="translate(870,280) rotate(-90)" />
          <text x="884" y="290" fontSize="9" textAnchor="middle" fill={ROJOT} transform="rotate(-90 884 290)">descarga</text>

          {/* Sin toma de alta: se dice, no se deja el hueco vacío */}
          {!c.hayAlta && (
            <g>
              <rect x="700" y="300" width="160" height="46" rx="6" fill="#fffbeb" stroke="#fcd34d" strokeWidth="1.5" />
              <text x="780" y="317" fontSize="8.5" fontWeight="bold" textAnchor="middle" fill="#92400e">Sin toma de alta presión</text>
              <text x="780" y="329" fontSize="8" textAnchor="middle" fill="#a16207">no hay subenfriamiento</text>
              <text x="780" y="340" fontSize="8" textAnchor="middle" fill="#a16207">ni relación de compresión</text>
            </g>
          )}

          {/* ── Lo medido, en una fila abajo para que no pise el dibujo ──── */}
          <Chip x={15} y={478} ancho={135} col={AZUL} titulo="T. evaporación" valor={txt(c.tEvap, ' °C')} />
          <Chip x={158} y={478} ancho={135} col={AZUL} titulo="T. aspiración (tubo)" valor={txt(c.tAspiracion, ' °C')} />
          <Chip x={301} y={478} ancho={135} col={colRC} titulo="Recalentamiento"
            valor={c.recalentamiento != null ? `${c.recalentamiento} K` : '—'} />
          <text x="368" y="522" fontSize="8.5" textAnchor="middle" fill="#94a3b8">
            referencia {rangoRC.min}–{rangoRC.max} K ({props.expansion === 'valvula' ? 'válvula' : 'capilar'})
          </text>
          <Chip x={444} y={478} ancho={135} col={colDesc} titulo="T. descarga" valor={txt(c.tDescarga, ' °C')} />
          {c.hayAlta ? (
            <>
              <Chip x={587} y={478} ancho={135} col={ROJOT} titulo="T. condensación" valor={txt(c.tCond, ' °C')} />
              <Chip x={730} y={478} ancho={135} col={colSub} titulo="Subenfriamiento"
                valor={c.subenfriamiento != null ? `${c.subenfriamiento} K` : '—'} />
              <text x="797" y="522" fontSize="8.5" textAnchor="middle" fill="#94a3b8">
                relación de compresión {c.relacionCompresion != null ? `${c.relacionCompresion} : 1` : '—'}
              </text>
            </>
          ) : (
            <>
              <Chip x={587} y={478} ancho={135} col="#94a3b8" aviso
                titulo="T. condensación ESTIMADA" valor={txt(c.condensacionEstimada, ' °C')} />
              <Chip x={730} y={478} ancho={135} col="#94a3b8" aviso
                titulo="Subenfriamiento" valor="sin alta" />
              <text x="797" y="522" fontSize="8.5" textAnchor="middle" fill="#94a3b8">
                esta máquina no tiene toma de alta
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 mt-2">
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{ background: ROJOT }} />descarga (gas caliente)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{ background: NARANJA }} />línea fina (líquido)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{ background: AZUL }} />línea gorda (aspiración)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: VERDE }} />en rango</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: AMBAR }} />justo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: ROJO }} />fuera de rango</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">
        Los rangos son orientativos. El valor bueno de verdad es el de la ficha técnica del equipo.
        La temperatura de condensación estimada sale de sumar unos 13 K al aire que entra a la
        exterior: sirve para ver si condensa alta, no para cargar gas con ella.
      </p>
    </div>
  );
}
