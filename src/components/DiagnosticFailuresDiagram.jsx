import React from 'react';

/**
 * Esquema de la "situación de averías" del diagnóstico frigorífico.
 * Dibuja los componentes clave del circuito y los colorea según el estado
 * derivado de las posibles averías detectadas (diag1):
 *   rojo  = avería / fallo confirmado
 *   amarillo = advertencia / revisar
 *   verde = correcto
 *
 * Props: items = [{ e, c, t }, ...]  (c = color: #dc2626 rojo, #d97706 amarillo, #16a34a verde)
 */
const NODES = [
  { key: 'compresor', label: 'Compresor', x: 90, y: 80, kw: ['COMPRESOR', 'FALTA DE REFRIGERANTE'] },
  { key: 'condensador', label: 'Condensador', x: 250, y: 80, kw: ['CONDENSACIÓN'] },
  { key: 'filtro', label: 'Filtro deshidratador', x: 410, y: 80, kw: ['FILTRO', 'SOLENOIDE'] },
  { key: 'valvula', label: 'Válvula expansión', x: 570, y: 80, kw: ['VÁLVULA DE EXPANSIÓN', 'EXCESO DE CARGA'] },
  { key: 'evaporador', label: 'Evaporador', x: 330, y: 220, kw: ['POCO CAUDAL', 'EVAPORADOR'] },
];

const RED = '#dc2626', YEL = '#d97706', GRN = '#16a34a';

function nodeColor(items, node) {
  if (!items || !items.length) return GRN;
  const matches = items.filter(it => node.kw.some(k => (it.e || '').toUpperCase().includes(k)));
  if (!matches.length) return GRN;
  if (matches.some(it => (it.c || '').toLowerCase() === RED.toLowerCase())) return RED;
  return YEL;
}

export default function DiagnosticFailuresDiagram({ items = [] }) {
  const states = NODES.map(n => ({ ...n, color: nodeColor(items, n) }));
  const hasAny = items && items.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <span>🛠️ Situación de las posibles averías</span>
        <span className="text-[10px] font-normal text-gray-500">({hasAny ? 'según el diagnóstico' : 'sin datos suficientes'})</span>
      </p>
      <svg viewBox="0 0 660 300" className="w-full h-auto" style={{ maxWidth: 660, maxHeight: 280 }}>
        {/* Tuberías de unión */}
        <path d="M120,80 L220,80" stroke="#ef4444" strokeWidth="3" />
        <path d="M280,80 L380,80" stroke="#ef4444" strokeWidth="3" />
        <path d="M440,80 L540,80" stroke="#ef4444" strokeWidth="3" />
        <path d="M570,110 Q570,180 360,220" fill="none" stroke="#0ea5e9" strokeWidth="3" />
        <path d="M300,220 Q90,180 90,110" fill="none" stroke="#0ea5e9" strokeWidth="3" />

        {/* Nodos */}
        {states.map(n => (
          <g key={n.key}>
            <circle cx={n.x} cy={n.y} r="30" fill={n.color} opacity="0.18" />
            <circle cx={n.x} cy={n.y} r="22" fill="#fff" stroke={n.color} strokeWidth="3" />
            <circle cx={n.x} cy={n.y} r="9" fill={n.color} />
            <text x={n.x} y={n.y + 46} fontSize="10" textAnchor="middle" fill="#334155" fontWeight="600">{n.label}</text>
          </g>
        ))}
      </svg>

      {/* Leyenda + lista */}
      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: RED }} /> avería</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: YEL }} /> advertencia / revisar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: GRN }} /> correcto</span>
      </div>
      {hasAny && (
        <div className="mt-2 space-y-1">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: it.c || GRN }} />
              <div><b className="text-gray-800">{it.e}</b><span className="text-gray-500"> — {it.t}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}