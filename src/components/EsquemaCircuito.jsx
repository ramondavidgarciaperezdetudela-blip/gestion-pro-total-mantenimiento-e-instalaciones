import React from 'react';

/**
 * EsquemaCircuito — el circuito frigorífico dibujado, con los datos medidos.
 *
 * Es el mismo esquema de siempre (compresor → condensador → filtro → válvula →
 * evaporador → vuelta al compresor), pero con las lecturas que se van metiendo
 * arriba puestas en el punto donde se toman, y cambiando de color según estén
 * bien o mal. Sirve para ver de un golpe de vista dónde está el problema en vez
 * de leer una lista de números sueltos.
 *
 * No calcula nada por su cuenta salvo lo evidente (recalentamiento,
 * subenfriamiento, salto del filtro y relación de compresión): recibe los
 * valores ya medidos y los coloca.
 */

// Rangos de referencia. Son orientativos y así se dice en pantalla: el valor
// bueno de verdad es el que da el fabricante del equipo.
const RANGOS = {
  recalentamiento: { min: 5, max: 8, bajo: 3, alto: 12 },
  subenfriamiento: { min: 4, max: 10, bajo: 2, alto: 12 },
  saltoFiltro: { alto: 3 },
};

const VERDE = '#16a34a';
const AMBAR = '#d97706';
const ROJO = '#dc2626';
const GRIS = '#94a3b8';

/** Color del valor según su rango: gris si no hay dato. */
function colorRango(valor, r) {
  if (valor == null || Number.isNaN(valor)) return GRIS;
  if (valor < r.bajo || valor > r.alto) return ROJO;
  if (valor < r.min || valor > r.max) return AMBAR;
  return VERDE;
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const txt = (v, sufijo = '') => (num(v) != null ? `${num(v)}${sufijo}` : '—');

/** Aguja de un manómetro: 270° de recorrido empezando abajo a la izquierda. */
function agujaManometro(cx, cy, r, valor, maximo) {
  const v = Math.max(0, Math.min(maximo, num(valor) ?? 0));
  const angulo = (135 + 270 * (v / maximo)) * (Math.PI / 180);
  return {
    x: cx + Math.cos(angulo) * (r - 8),
    y: cy + Math.sin(angulo) * (r - 8),
  };
}

function Manometro({ cx, cy, r, valor, maximo, color, etiqueta }) {
  const p = agujaManometro(cx, cy, r, valor, maximo);
  const hayDato = num(valor) != null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke={color} strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r - 5} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      <line x1={cx} y1={cy} x2={p.x} y2={p.y}
        stroke={hayDato ? color : GRIS} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill={hayDato ? color : GRIS} />
      <text x={cx} y={cy + r + 13} fontSize="10" textAnchor="middle" fill="#475569">{etiqueta}</text>
      <text x={cx} y={cy + r + 25} fontSize="11" fontWeight="bold" textAnchor="middle" fill={color}>
        {hayDato ? `${num(valor)} bar` : '—'}
      </text>
    </g>
  );
}

/** Rótulo con fondo, para que se lea encima de las tuberías. */
function Chip({ x, y, titulo, valor, color = '#0f172a', ancho = 108 }) {
  return (
    <g>
      <rect x={x} y={y} width={ancho} height="30" rx="5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <text x={x + ancho / 2} y={y + 12} fontSize="8.5" textAnchor="middle" fill="#64748b">{titulo}</text>
      <text x={x + ancho / 2} y={y + 24} fontSize="11.5" fontWeight="bold" textAnchor="middle" fill={color}>{valor}</text>
    </g>
  );
}

/** Serpentín dentro de un intercambiador. */
function Serpentin({ x, y, ancho, alto, vueltas, color }) {
  const paso = alto / (vueltas + 1);
  const lineas = [];
  for (let i = 1; i <= vueltas; i++) {
    const yy = y + paso * i;
    lineas.push(
      <line key={i} x1={x + 8} y1={yy} x2={x + ancho - 8} y2={yy}
        stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.75" />
    );
  }
  return <g>{lineas}</g>;
}

export default function EsquemaCircuito({
  gas, pBaja, pAlta, tEvap, tAsp, tCond, tLiq,
  tFiltroIn, tFiltroOut, tValvOut, tBulbo, tAmb,
  variante = 'estandar',
}) {
  const recal = (num(tAsp) != null && num(tEvap) != null) ? num(tAsp) - num(tEvap) : null;
  const subenf = (num(tCond) != null && num(tLiq) != null) ? num(tCond) - num(tLiq) : null;
  const saltoFiltro = (num(tFiltroIn) != null && num(tFiltroOut) != null)
    ? num(tFiltroIn) - num(tFiltroOut) : null;
  // Relación de compresión en presiones ABSOLUTAS: los manómetros marcan
  // presión relativa, así que hay que sumar la atmosférica (≈1 bar).
  const relacion = (num(pAlta) != null && num(pBaja) != null && num(pBaja) > -1)
    ? (num(pAlta) + 1) / (num(pBaja) + 1) : null;

  const colRecal = colorRango(recal, RANGOS.recalentamiento);
  const colSubenf = colorRango(subenf, RANGOS.subenfriamiento);
  const colFiltro = saltoFiltro == null ? GRIS : (saltoFiltro >= RANGOS.saltoFiltro.alto ? ROJO : VERDE);

  const AZUL = '#0284c7';   // baja / aspiración
  const ROJOT = '#dc2626';  // descarga / gas caliente
  const NARANJA = '#ea580c'; // línea de líquido

  return (
    <div className="bg-white rounded-xl shadow p-3">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-1">
        <p className="text-xs font-bold text-slate-700">🧊 Circuito con tus medidas</p>
        <p className="text-[10px] text-slate-400">
          {gas ? `Refrigerante ${gas} · ` : ''}se actualiza según vas midiendo
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 860 500" style={{ minWidth: 560 }} className="w-full h-auto">
          <rect x="0" y="0" width="860" height="500" fill="#fbfdff" />

          {/* ── Tuberías ─────────────────────────────────────────────────── */}
          {/* Descarga: compresor → condensador (gas caliente, alta) */}
          <polyline points="200,315 235,315 235,90 300,90" fill="none" stroke={ROJOT} strokeWidth="5" strokeLinejoin="round" />
          {/* Línea de líquido: condensador → filtro → válvula */}
          <polyline points="500,90 640,90 640,150" fill="none" stroke={NARANJA} strokeWidth="5" strokeLinejoin="round" />
          <polyline points="640,205 640,258" fill="none" stroke={NARANJA} strokeWidth="5" />
          {/* Salida de la válvula al evaporador (ya en baja) */}
          <polyline points="640,292 640,330" fill="none" stroke={AZUL} strokeWidth="5" />
          {/* Aspiración: evaporador → compresor */}
          <polyline points="430,375 200,375" fill="none" stroke={AZUL} strokeWidth="5" strokeLinejoin="round" />

          {/* Sentido del gas */}
          {[[265, 84, 0], [570, 84, 0], [640, 232, 90], [315, 369, 180]].map(([fx, fy, rot], i) => (
            <polygon key={i} points="0,-5 10,0 0,5" fill="#64748b"
              transform={`translate(${fx},${fy}) rotate(${rot})`} />
          ))}

          {/* ── Compresor ────────────────────────────────────────────────── */}
          <rect x="90" y="290" width="110" height="110" rx="12" fill="#e2e8f0" stroke="#475569" strokeWidth="2.5" />
          <circle cx="145" cy="345" r="30" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
          <path d="M145 320 A25 25 0 0 1 170 345" fill="none" stroke="#475569" strokeWidth="3" />
          <text x="145" y="415" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#334155">COMPRESOR</text>

          {/* ── Condensador ──────────────────────────────────────────────── */}
          <rect x="300" y="45" width="200" height="90" rx="8" fill="#fff1f2" stroke={ROJOT} strokeWidth="2.5" />
          <Serpentin x={300} y={45} ancho={200} alto={90} vueltas={4} color={ROJOT} />
          <text x="400" y="38" fontSize="11" fontWeight="bold" textAnchor="middle" fill={ROJOT}>CONDENSADOR</text>

          {/* Ventilador del condensador */}
          <circle cx="400" cy="195" r="30" fill="#f1f5f9" stroke="#475569" strokeWidth="2" />
          {[0, 60, 120, 180, 240, 300].map(a => (
            <line key={a} x1="400" y1="195"
              x2={400 + Math.cos(a * Math.PI / 180) * 24}
              y2={195 + Math.sin(a * Math.PI / 180) * 24}
              stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          ))}
          <polygon points="394,160 406,160 400,144" fill="#64748b" />
          <text x="400" y="240" fontSize="9.5" textAnchor="middle" fill="#64748b">ventilador</text>

          {/* ── Filtro deshidratador ─────────────────────────────────────── */}
          <rect x="620" y="150" width="40" height="55" rx="8" fill="#fef3c7" stroke="#b45309" strokeWidth="2.5" />
          <line x1="628" y1="165" x2="652" y2="165" stroke="#b45309" strokeWidth="2" />
          <line x1="628" y1="178" x2="652" y2="178" stroke="#b45309" strokeWidth="2" />
          <line x1="628" y1="191" x2="652" y2="191" stroke="#b45309" strokeWidth="2" />
          <text x="678" y="172" fontSize="9.5" fill="#b45309">filtro</text>
          <text x="678" y="184" fontSize="9.5" fill="#b45309">deshidr.</text>

          {/* ── Válvula de expansión ─────────────────────────────────────── */}
          <polygon points="622,258 658,258 640,275" fill="#fde68a" stroke="#a16207" strokeWidth="2.5" />
          <polygon points="622,292 658,292 640,275" fill="#fde68a" stroke="#a16207" strokeWidth="2.5" />
          <text x="678" y="279" fontSize="9.5" fill="#a16207">
            {variante === 'compensacion' ? 'válvula (comp. ext.)' : 'válvula expansión'}
          </text>

          {/* ── Evaporador ───────────────────────────────────────────────── */}
          <rect x="430" y="330" width="190" height="85" rx="8" fill="#eff6ff" stroke={AZUL} strokeWidth="2.5" />
          <Serpentin x={430} y={330} ancho={190} alto={85} vueltas={4} color={AZUL} />
          <text x="525" y="432" fontSize="11" fontWeight="bold" textAnchor="middle" fill={AZUL}>EVAPORADOR</text>

          {/* Bulbo de la válvula, en la aspiración a la salida del evaporador */}
          <ellipse cx="410" cy="375" rx="9" ry="6" fill="#a16207" />
          <path d="M410 369 C 480 300, 600 300, 640 268" fill="none"
            stroke="#a16207" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="392" y="398" fontSize="9" fill="#a16207">bulbo</text>

          {/* ── Manómetros ───────────────────────────────────────────────── */}
          <line x1="235" y1="180" x2="185" y2="180" stroke={ROJOT} strokeWidth="2" />
          <Manometro cx={150} cy={180} r={32} valor={pAlta} maximo={40} color={ROJOT} etiqueta="alta" />
          <line x1="300" y1="375" x2="300" y2="418" stroke={AZUL} strokeWidth="2" />
          <Manometro cx={300} cy={450} r={32} valor={pBaja} maximo={20} color={AZUL} etiqueta="baja" />

          {/* ── Lecturas ─────────────────────────────────────────────────── */}
          <Chip x={300} y={140} titulo="T. condensación" valor={txt(tCond, ' °C')} color={ROJOT} />
          <Chip x={508} y={100} titulo="T. línea líquido" valor={txt(tLiq, ' °C')} color={NARANJA} />
          <Chip x={508} y={136} titulo="Subenfriamiento" valor={subenf != null ? `${subenf.toFixed(1)} °C` : '—'} color={colSubenf} />

          <Chip x={700} y={140} titulo="Entrada filtro" valor={txt(tFiltroIn, ' °C')} color="#b45309" ancho={96} />
          <Chip x={700} y={174} titulo="Salida filtro" valor={txt(tFiltroOut, ' °C')} color="#b45309" ancho={96} />
          <Chip x={700} y={208} titulo="Salto filtro" valor={saltoFiltro != null ? `${saltoFiltro.toFixed(1)} °C` : '—'} color={colFiltro} ancho={96} />

          <Chip x={700} y={296} titulo="T. salida válvula" valor={txt(tValvOut, ' °C')} color={AZUL} ancho={96} />

          <Chip x={430} y={440} titulo="T. evaporación" valor={txt(tEvap, ' °C')} color={AZUL} />
          <Chip x={548} y={440} titulo="T. bulbo" valor={txt(tBulbo, ' °C')} color="#a16207" />

          <Chip x={90} y={228} titulo="T. aspiración" valor={txt(tAsp, ' °C')} color={AZUL} />
          <Chip x={90} y={40} titulo="Recalentamiento" valor={recal != null ? `${recal.toFixed(1)} °C` : '—'} color={colRecal} />
          <Chip x={90} y={4} titulo="T. ambiente" valor={txt(tAmb, ' °C')} color="#334155" />

          <Chip x={700} y={40} titulo="Relación compresión" valor={relacion != null ? `${relacion.toFixed(1)} : 1` : '—'}
            color={relacion != null && relacion > 10 ? ROJO : '#334155'} ancho={140} />
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 mt-2">
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{ background: ROJOT }} />descarga (gas caliente)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{ background: NARANJA }} />línea de líquido</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{ background: AZUL }} />baja / aspiración</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: VERDE }} />en rango</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: AMBAR }} />justo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: ROJO }} />fuera de rango</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">
        Los rangos en verde son orientativos (recalentamiento 5-8 °C, subenfriamiento 4-10 °C).
        El valor bueno de verdad es el que indique el fabricante del equipo.
      </p>
    </div>
  );
}
