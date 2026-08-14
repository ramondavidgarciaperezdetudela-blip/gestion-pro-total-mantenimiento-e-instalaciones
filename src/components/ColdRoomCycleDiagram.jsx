import React from 'react';

/**
 * Esquema del ciclo frigorífico de una cámara: compresor → condensador →
 * válvula de expansión → evaporador, con los valores calculados marcados
 * sobre el dibujo (carga, presiones, carga de gas, temperaturas).
 *
 * Props (todas opcionales — muestra "—" si faltan):
 *  loadW, evapPressure, condPressure, refCharge, refrigerant,
 *  evapTemp, condTemp, equipPowerKW, extraGrams
 */
export default function ColdRoomCycleDiagram({
  loadW, evapPressure, condPressure, refCharge, refrigerant = '',
  evapTemp, condTemp, equipPowerKW, extraGrams = 0,
}) {
  const f = (v, u = '') => (v !== undefined && v !== null && v !== '' && !Number.isNaN(v) ? `${v}${u}` : '—');
  const HOT = '#ef4444', COLD = '#0ea5e9';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-700 mb-2"> Ciclo frigorífico de la cámara (valores calculados)</p>
      <svg viewBox="0 0 720 360" className="w-full h-auto" style={{ maxWidth: 720, maxHeight: 320 }}>
        {/* Lado ALTA (arriba): compresor → condensador → línea de líquido */}
        <path d="M120,140 L120,70 L520,70" fill="none" stroke={HOT} strokeWidth="4" />
        <path d="M620,70 L660,70 L660,180" fill="none" stroke={HOT} strokeWidth="4" />
        {/* Lado BAJA (abajo): válvula → evaporador → aspiración */}
        <path d="M660,210 L660,300 L240,300" fill="none" stroke={COLD} strokeWidth="4" />
        <path d="M160,300 L120,300 L120,174" fill="none" stroke={COLD} strokeWidth="4" />

        {/* Flechas */}
        <polygon points="300,64 312,70 300,76" fill={HOT} />
        <polygon points="654,150 660,162 666,150" fill={HOT} />
        <polygon points="440,306 428,300 440,294" fill={COLD} />
        <polygon points="120,236 114,248 126,248" fill={COLD} />

        {/* Compresor */}
        <circle cx="120" cy="170" r="30" fill="#0f2740" />
        <text x="120" y="166" fill="#fff" fontSize="9" textAnchor="middle">COMPRE-</text>
        <text x="120" y="178" fill="#fff" fontSize="9" textAnchor="middle">SOR</text>
        <text x="120" y="214" fontSize="9" textAnchor="middle" fill="#0f2740" fontWeight="bold">{f(equipPowerKW, ' kW')}</text>

        {/* Condensador */}
        <rect x="520" y="48" width="100" height="48" rx="6" fill="#fee2e2" stroke={HOT} strokeWidth="2" />
        {/* aspas del ventilador */}
        <circle cx="640" cy="72" r="14" fill="#fff" stroke={HOT} strokeWidth="1.5" />
        <line x1="640" y1="58" x2="640" y2="86" stroke={HOT} strokeWidth="2" />
        <line x1="626" y1="72" x2="654" y2="72" stroke={HOT} strokeWidth="2" />
        <text x="570" y="76" fontSize="10" textAnchor="middle" fill="#991b1b" fontWeight="bold">CONDENSADOR</text>
        <text x="570" y="112" fontSize="9" textAnchor="middle" fill="#991b1b">Pc {f(condPressure, ' bar')} · T.cond {f(condTemp, '°')}</text>

        {/* Válvula de expansión */}
        <polygon points="660,180 646,195 660,210 674,195" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
        <text x="700" y="190" fontSize="9" textAnchor="middle" fill="#92400e" fontWeight="bold">V. expansión</text>
        <text x="700" y="202" fontSize="8" textAnchor="middle" fill="#075985">sal. {f(evapTemp, '°')}</text>

        {/* Evaporador */}
        <rect x="160" y="278" width="100" height="48" rx="6" fill="#e0f2fe" stroke={COLD} strokeWidth="2" />
        <circle cx="140" cy="302" r="14" fill="#fff" stroke={COLD} strokeWidth="1.5" />
        <line x1="140" y1="288" x2="140" y2="316" stroke={COLD} strokeWidth="2" />
        <line x1="126" y1="302" x2="154" y2="302" stroke={COLD} strokeWidth="2" />
        <text x="210" y="306" fontSize="10" textAnchor="middle" fill="#075985" fontWeight="bold">EVAPORADOR</text>
        <text x="210" y="256" fontSize="9" textAnchor="middle" fill="#075985">Pe {f(evapPressure, ' bar')} · T.evap {f(evapTemp, '°')}</text>

        {/* Carga frigorífica sobre el evaporador */}
        <rect x="270" y="338" width="150" height="20" rx="4" fill="#eff6ff" stroke="#2563eb" />
        <text x="345" y="352" fontSize="10" textAnchor="middle" fill="#1d4ed8" fontWeight="bold">Carga: {f(loadW, ' W')}</text>

        {/* Carga de gas */}
        <rect x="430" y="118" width="160" height="20" rx="4" fill="#f0fdf4" stroke="#16a34a" />
        <text x="510" y="132" fontSize="10" textAnchor="middle" fill="#15803d" fontWeight="bold">
          {refrigerant} · {f(refCharge, ' kg')}{extraGrams > 0 ? ` (+${extraGrams}g)` : ''}
        </text>

        {/* Sentido del flujo */}
        <text x="300" y="52" fontSize="8" textAnchor="middle" fill="#991b1b">gas a alta presión →</text>
        <text x="440" y="318" fontSize="8" textAnchor="middle" fill="#075985">← gas a baja presión</text>
      </svg>
      <p className="text-[10px] text-gray-400 mt-1">Ciclo de compresión de vapor. Rojo = lado de alta (condensación). Azul = lado de baja (evaporación). Valores orientativos del cálculo.</p>
    </div>
  );
}