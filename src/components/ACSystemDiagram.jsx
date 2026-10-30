import React from 'react';

/**
 * Esquema de una instalación de climatización (split / conductos / cassette):
 * unidad interior (aire frío) + unidad exterior (condensadora con ventilador)
 * + líneas de refrigerante (gas y líquido). Marca la potencia, frigorías,
 * refrigerante y superficie calculadas.
 *
 * Props: power_kw, frigorias, gas, superficie, uso, tipo
 */
export default function ACSystemDiagram({ power_kw, frigorias, gas, superficie, uso = '', tipo = 'split' }) {
  const f = (v, u = '') => (v !== undefined && v !== null && v !== '' && !Number.isNaN(v) ? `${v}${u}` : '—');
  const LIQ = '#0ea5e9', GAS = '#ef4444';
  const conductos = /conductos|cassette|vrf/i.test(tipo);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-700 mb-2">❄️ Esquema de la instalación de climatización (valores calculados)</p>
      <svg viewBox="0 0 720 340" className="w-full h-auto" style={{ maxWidth: 720, maxHeight: 320 }}>
        {/* Muro / separación interior-exterior */}
        <line x1="300" y1="20" x2="300" y2="320" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />
        <text x="150" y="32" fontSize="9" textAnchor="middle" fill="#64748b">INTERIOR</text>
        <text x="560" y="32" fontSize="9" textAnchor="middle" fill="#64748b">EXTERIOR</text>

        {/* Unidad interior (split mural o conductos) */}
        <rect x="60" y="70" width="200" height="60" rx="10" fill="#e0f2fe" stroke={LIQ} strokeWidth="2" />
        <text x="160" y="96" fontSize="11" textAnchor="middle" fill="#075985" fontWeight="bold">UNIDAD INTERIOR</text>
        <text x="160" y="112" fontSize="9" textAnchor="middle" fill="#075985">{conductos ? 'conductos + rejillas' : 'split mural / cassette'}</text>
        {/* aire frío saliendo */}
        <line x1="80" y1="138" x2="80" y2="160" stroke={LIQ} strokeWidth="2" />
        <polygon points="74,160 86,160 80,170" fill={LIQ} />
        <line x1="240" y1="138" x2="240" y2="160" stroke={LIQ} strokeWidth="2" />
        <polygon points="234,160 246,160 240,170" fill={LIQ} />
        <text x="160" y="178" fontSize="8" textAnchor="middle" fill="#0ea5e9">aire frío</text>

        {/* Conductos (si aplica) */}
        {conductos && (
          <g>
            <rect x="60" y="195" width="200" height="26" rx="6" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
            <text x="160" y="212" fontSize="9" textAnchor="middle" fill="#475569">conducto principal</text>
            <rect x="70" y="235" width="60" height="20" rx="3" fill="#fff" stroke="#64748b" />
            <rect x="190" y="235" width="60" height="20" rx="3" fill="#fff" stroke="#64748b" />
            <text x="100" y="248" fontSize="7" textAnchor="middle" fill="#475569">rejilla</text>
            <text x="220" y="248" fontSize="7" textAnchor="middle" fill="#475569">rejilla</text>
          </g>
        )}

        {/* Líneas de refrigerante: líquido (azul) y gas (rojo) entre interior y exterior */}
        <path d="M260,90 C330,90 330,120 420,120" fill="none" stroke={LIQ} strokeWidth="4" />
        <path d="M420,140 C330,140 330,110 260,110" fill="none" stroke={GAS} strokeWidth="4" />
        <text x="340" y="84" fontSize="8" textAnchor="middle" fill="#0ea5e9">líquido →</text>
        <text x="340" y="158" fontSize="8" textAnchor="middle" fill="#ef4444">← gas</text>

        {/* Unidad exterior (condensadora) */}
        <rect x="420" y="80" width="220" height="120" rx="10" fill="#fee2e2" stroke={GAS} strokeWidth="2" />
        <text x="530" y="104" fontSize="11" textAnchor="middle" fill="#991b1b" fontWeight="bold">UNIDAD EXTERIOR</text>
        <text x="530" y="120" fontSize="9" textAnchor="middle" fill="#991b1b">condensadora + ventilador</text>
        {/* ventilador */}
        <circle cx="530" cy="160" r="26" fill="#fff" stroke={GAS} strokeWidth="2" />
        <g stroke={GAS} strokeWidth="2">
          <line x1="530" y1="134" x2="530" y2="186" />
          <line x1="504" y1="160" x2="556" y2="160" />
          <line x1="512" y1="142" x2="548" y2="178" />
          <line x1="548" y1="142" x2="512" y2="178" />
        </g>
        {/* aire caliente saliendo */}
        <polygon points="640,134 636,128 644,128" fill={GAS} />
        <polygon points="640,186 636,192 644,192" fill={GAS} />
        <text x="660" y="162" fontSize="8" fill="#ef4444">calor</text>

        {/* Valores calculados marcados */}
        <rect x="430" y="225" width="200" height="22" rx="4" fill="#fef2f2" stroke="#dc2626" />
        <text x="530" y="240" fontSize="11" textAnchor="middle" fill="#991b1b" fontWeight="bold">
          Potencia: {f(power_kw, ' kW')} · {f(frigorias, ' frig/h')}
        </text>
        <rect x="60" y="266" width="300" height="22" rx="4" fill="#eff6ff" stroke="#2563eb" />
        <text x="210" y="281" fontSize="11" textAnchor="middle" fill="#1d4ed8" fontWeight="bold">
          {f(superficie, ' m²')} {uso ? `· ${uso}` : ''} · gas {gas || '—'}
        </text>
      </svg>
      <p className="text-[10px] text-gray-400 mt-1">Azul = línea de líquido. Rojo = línea de gas / unidad exterior. La potencia muestra el valor recomendado con coeficiente de seguridad.</p>
    </div>
  );
}