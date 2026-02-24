import React from 'react';

/**
 * SVG-based solar wiring diagram
 * Props: result (from calcSolar), form
 */
export default function SolarWiringDiagram({ result, form }) {
  if (!result) return null;
  const { numPanels, numStrings, inverterKw, numBatteries, totalKwp } = result;
  const panelW = form.panel_power_w || 400;
  const panelsPerString = Math.ceil(numPanels / numStrings);

  // Colors
  const C = {
    panel: '#f59e0b',
    panelBorder: '#d97706',
    dc: '#ef4444',
    ac: '#3b82f6',
    bat: '#10b981',
    inv: '#8b5cf6',
    grid: '#64748b',
    text: '#1e293b',
    bg: '#f8fafc',
    wire: '#334155',
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox="0 0 800 380" style={{ width: '100%', minWidth: 600, fontFamily: 'Arial, sans-serif' }} xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="800" height="380" fill={C.bg} rx="10" />
        <text x="400" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill={C.text}>
          Esquema de conexionado — {totalKwp.toFixed(2)} kWp · {numPanels} paneles · Inversor {inverterKw}kW
        </text>

        {/* === PANELS (left) === */}
        {Array.from({ length: Math.min(numStrings, 3) }).map((_, si) => {
          const y0 = 50 + si * 90;
          return (
            <g key={si}>
              {/* String label */}
              <text x="12" y={y0 + 30} fontSize="8" fill="#64748b">String {si + 1}</text>
              {/* Panel blocks */}
              {Array.from({ length: Math.min(panelsPerString, 4) }).map((_, pi) => (
                <g key={pi}>
                  <rect x={30 + pi * 38} y={y0 + 10} width="32" height="45" rx="3"
                    fill={C.panel} stroke={C.panelBorder} strokeWidth="1.5" />
                  <line x1={30 + pi * 38 + 16} y1={y0 + 10} x2={30 + pi * 38 + 16} y2={y0 + 55} stroke={C.panelBorder} strokeWidth="0.5" />
                  <line x1={30 + pi * 38} y1={y0 + 32} x2={30 + pi * 38 + 32} y2={y0 + 32} stroke={C.panelBorder} strokeWidth="0.5" />
                  <text x={30 + pi * 38 + 16} y={y0 + 64} textAnchor="middle" fontSize="7" fill={C.text}>
                    {panelW}W
                  </text>
                </g>
              ))}
              {panelsPerString > 4 && (
                <text x={30 + 4 * 38} y={y0 + 35} fontSize="9" fill={C.dc} fontWeight="bold">+{panelsPerString - 4}</text>
              )}
              {/* Wire from string to DC box */}
              <line x1={30 + Math.min(panelsPerString, 4) * 38} y1={y0 + 32} x2={220} y2={y0 + 32}
                stroke={C.dc} strokeWidth="2" strokeDasharray="4,2" />
              <circle cx={220} cy={y0 + 32} r="3" fill={C.dc} />
            </g>
          );
        })}
        {numStrings > 3 && (
          <text x="30" y={50 + 3 * 90 + 15} fontSize="9" fill={C.dc} fontWeight="bold">+ {numStrings - 3} strings más</text>
        )}

        {/* Panel label box */}
        <rect x="12" y="34" width="195" height="12" rx="2" fill="none" stroke={C.panel} strokeWidth="1" strokeDasharray="4,2" />
        <text x="105" y="44" textAnchor="middle" fontSize="8" fill={C.panel} fontWeight="bold">
          PANELES SOLARES ({numPanels}x {panelW}W = {totalKwp.toFixed(1)}kWp)
        </text>

        {/* === DC PROTECTION BOX === */}
        <rect x="228" y="60" width="80" height="180" rx="6" fill="#fef3c7" stroke={C.dc} strokeWidth="2" />
        <text x="268" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.dc}>CUADRO DC</text>
        <text x="268" y="93" textAnchor="middle" fontSize="7" fill={C.text}>Fusibles</text>
        <text x="268" y="104" textAnchor="middle" fontSize="7" fill={C.text}>Protec. DC</text>
        <text x="268" y="115" textAnchor="middle" fontSize="7" fill={C.text}>Sobretensión</text>
        <rect x="244" y="125" width="48" height="20" rx="3" fill={C.dc} opacity="0.2" stroke={C.dc} strokeWidth="1" />
        <text x="268" y="138" textAnchor="middle" fontSize="7" fill={C.dc}>Seccionador</text>
        {/* Connectors MC4 */}
        <rect x="244" y="155" width="48" height="16" rx="3" fill="white" stroke="#94a3b8" strokeWidth="1" />
        <text x="268" y="167" textAnchor="middle" fontSize="7" fill="#64748b">MC4</text>
        <text x="268" y="185" textAnchor="middle" fontSize="7" fill={C.text}>x{numPanels * 4} connectors</text>
        <text x="268" y="198" textAnchor="middle" fontSize="7" fill={C.text}>{numStrings} string(s)</text>
        <text x="268" y="210" textAnchor="middle" fontSize="7" fill={C.text}>{form.distance_panels_to_dc_box || 10}m DC cable</text>
        {/* Wire out */}
        <line x1="308" y1="150" x2="350" y2="150" stroke={C.dc} strokeWidth="3" />

        {/* === INVERTER === */}
        <rect x="355" y="100" width="100" height="120" rx="8" fill="#ede9fe" stroke={C.inv} strokeWidth="2.5" />
        <text x="405" y="120" textAnchor="middle" fontSize="9" fontWeight="bold" fill={C.inv}>INVERSOR</text>
        <text x="405" y="134" textAnchor="middle" fontSize="8" fill={C.inv}>{inverterKw}kW</text>
        <text x="405" y="148" textAnchor="middle" fontSize="7" fill={C.text}>DC → AC</text>
        <rect x="370" y="155" width="70" height="30" rx="4" fill={C.inv} opacity="0.15" stroke={C.inv} strokeWidth="1" />
        <text x="405" y="168" textAnchor="middle" fontSize="7" fill={C.inv}>Inversor/</text>
        <text x="405" y="178" textAnchor="middle" fontSize="7" fill={C.inv}>Cargador</text>
        <text x="405" y="195" textAnchor="middle" fontSize="7" fill={C.text}>{form.distance_to_ac_box || 8}m AC cable</text>
        <text x="405" y="208" textAnchor="middle" fontSize="7" fill={C.text}>3x6mm² cable</text>
        {/* Wire in from DC box */}
        <line x1="350" y1="150" x2="355" y2="150" stroke={C.dc} strokeWidth="3" />
        {/* Wire out AC */}
        <line x1="455" y1="160" x2="490" y2="160" stroke={C.ac} strokeWidth="3" />
        {/* Wire down to batteries */}
        <line x1="405" y1="220" x2="405" y2="270" stroke={C.bat} strokeWidth="2.5" />
        <line x1="405" y1="270" x2="460" y2="270" stroke={C.bat} strokeWidth="2.5" />

        {/* === AC PANEL === */}
        <rect x="495" y="120" width="90" height="100" rx="6" fill="#dbeafe" stroke={C.ac} strokeWidth="2" />
        <text x="540" y="140" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.ac}>CUADRO AC</text>
        <text x="540" y="153" textAnchor="middle" fontSize="7" fill={C.text}>IGA 40A</text>
        <text x="540" y="164" textAnchor="middle" fontSize="7" fill={C.text}>Diferencial</text>
        <text x="540" y="175" textAnchor="middle" fontSize="7" fill={C.text}>30mA</text>
        <text x="540" y="186" textAnchor="middle" fontSize="7" fill={C.text}>Protec. AC</text>
        <text x="540" y="197" textAnchor="middle" fontSize="7" fill={C.text}>Contador</text>
        <text x="540" y="208" textAnchor="middle" fontSize="7" fill={C.text}>bidireccional</text>
        {/* Wire to grid */}
        <line x1="585" y1="170" x2="620" y2="170" stroke={C.ac} strokeWidth="2.5" />

        {/* === GRID === */}
        <rect x="624" y="148" width="80" height="45" rx="6" fill="#f1f5f9" stroke={C.grid} strokeWidth="2" />
        <text x="664" y="168" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.grid}>RED</text>
        <text x="664" y="180" textAnchor="middle" fontSize="7" fill={C.grid}>ELÉCTRICA</text>
        <text x="664" y="191" textAnchor="middle" fontSize="7" fill={C.grid}>(o consumo)</text>

        {/* === BATTERIES === */}
        <rect x="460" y="250" width="130" height="90" rx="8" fill="#d1fae5" stroke={C.bat} strokeWidth="2.5" />
        <text x="525" y="268" textAnchor="middle" fontSize="9" fontWeight="bold" fill={C.bat}>BATERÍAS</text>
        <text x="525" y="281" textAnchor="middle" fontSize="8" fill={C.bat}>{numBatteries}x LiFePO4</text>
        <text x="525" y="293" textAnchor="middle" fontSize="7" fill={C.text}>2,4kWh / 51,2V</text>
        <text x="525" y="305" textAnchor="middle" fontSize="7" fill={C.text}>Total: {(numBatteries * 2.4).toFixed(1)} kWh</text>
        <rect x="478" y="313" width="94" height="16" rx="3" fill={C.bat} opacity="0.2" stroke={C.bat} strokeWidth="1" />
        <text x="525" y="325" textAnchor="middle" fontSize="7" fill={C.bat}>BMS incluido</text>
        {/* Wire label */}
        <text x="430" y="265" textAnchor="middle" fontSize="7" fill={C.bat}>{form.distance_inverter_to_batteries || 3}m</text>
        <text x="430" y="275" textAnchor="middle" fontSize="7" fill={C.bat}>35-70mm²</text>

        {/* Legend */}
        <g transform="translate(12, 310)">
          <rect width="220" height="58" rx="5" fill="white" stroke="#e2e8f0" strokeWidth="1" />
          <text x="8" y="14" fontSize="8" fontWeight="bold" fill={C.text}>LEYENDA</text>
          <line x1="8" y1="22" x2="35" y2="22" stroke={C.dc} strokeWidth="2" strokeDasharray="4,2" /><text x="40" y="26" fontSize="7" fill={C.text}>Cable DC (positivo/negativo)</text>
          <line x1="8" y1="34" x2="35" y2="34" stroke={C.ac} strokeWidth="2" /><text x="40" y="38" fontSize="7" fill={C.text}>Cable AC trifásico</text>
          <line x1="8" y1="46" x2="35" y2="46" stroke={C.bat} strokeWidth="2" /><text x="40" y="50" fontSize="7" fill={C.text}>Cable DC baterías</text>
        </g>

        {/* Nota */}
        <text x="400" y="370" textAnchor="middle" fontSize="7.5" fill="#94a3b8">
          Esquema orientativo. Verificar secciones de cable según normativa REBT e ITC-BT-40 según instalación real.
        </text>
      </svg>
    </div>
  );
}