import React from 'react';

/**
 * SVG-based battery/storage system wiring diagram
 */
export default function BatteryWiringDiagram({ result, form }) {
  if (!result) return null;

  const C = {
    bat: '#10b981',
    inv: '#8b5cf6',
    solar: '#f59e0b',
    ac: '#3b82f6',
    gen: '#ef4444',
    grid: '#64748b',
    text: '#1e293b',
    bg: '#f8fafc',
    mppt: '#06b6d4',
  };

  const hasSolar = result.mpptKw > 0;
  const hasGrid = result.tipoRed !== 'aislada';
  const hasGen = result.tipoRed === 'aislada' || result.tipoRed === 'backup';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox="0 0 820 360" style={{ width: '100%', minWidth: 600, fontFamily: 'Arial, sans-serif' }} xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="820" height="360" fill={C.bg} rx="10" />
        <text x="410" y="22" textAnchor="middle" fontSize="12" fontWeight="bold" fill={C.text}>
          Esquema sistema almacenamiento — {result.energiaTotalKwh} kWh · {result.voltajeSistema}V · Tipo: {result.tipoRed}
        </text>

        {/* === SOLAR PANELS (top-left) === */}
        {hasSolar && (
          <g>
            <rect x="12" y="38" width="130" height="80" rx="6" fill="#fef3c7" stroke={C.solar} strokeWidth="2" />
            <text x="77" y="56" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.solar}>PANELES SOLARES</text>
            <text x="77" y="68" textAnchor="middle" fontSize="7" fill={C.text}>{result.numPaneles}x {form.panel_power_w || 400}W</text>
            <text x="77" y="80" textAnchor="middle" fontSize="7" fill={C.text}>Total: {result.totalPanelW}W</text>
            <rect x="30" y="86" width="95" height="24" rx="3" fill={C.solar} opacity="0.2" stroke={C.solar} strokeWidth="1" />
            <text x="77" y="102" textAnchor="middle" fontSize="7" fill={C.solar}>Cable solar 6mm²</text>
            {/* Wire to MPPT */}
            <line x1="142" y1="78" x2="180" y2="78" stroke={C.solar} strokeWidth="2.5" strokeDasharray="4,2" />
          </g>
        )}

        {/* === MPPT CONTROLLER === */}
        {hasSolar && (
          <g>
            <rect x="185" y="45" width="90" height="70" rx="6" fill="#ecfeff" stroke={C.mppt} strokeWidth="2" />
            <text x="230" y="63" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.mppt}>REGULADOR</text>
            <text x="230" y="75" textAnchor="middle" fontSize="8" fill={C.mppt}>MPPT</text>
            <text x="230" y="87" textAnchor="middle" fontSize="7" fill={C.text}>{result.mpptA}A</text>
            <text x="230" y="98" textAnchor="middle" fontSize="7" fill={C.text}>{result.mpptKw}kW</text>
            <text x="230" y="109" textAnchor="middle" fontSize="7" fill={C.text}>{result.voltajeSistema}V</text>
            {/* Wire from MPPT to bus */}
            <line x1="275" y1="80" x2="340" y2="160" stroke={C.mppt} strokeWidth="2" />
          </g>
        )}

        {/* === GENERATOR (top-right when aislada) === */}
        {hasGen && (
          <g>
            <rect x="660" y="38" width="110" height="65" rx="6" fill="#fee2e2" stroke={C.gen} strokeWidth="2" />
            <text x="715" y="56" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.gen}>GENERADOR</text>
            <text x="715" y="68" textAnchor="middle" fontSize="8" fill={C.gen}>APOYO</text>
            <text x="715" y="80" textAnchor="middle" fontSize="7" fill={C.text}>{result.potenciaGeneradorKva} kVA</text>
            <text x="715" y="91" textAnchor="middle" fontSize="7" fill="#94a3b8">Gasolina / Gas</text>
            {/* Wire to inverter */}
            <line x1="660" y1="70" x2="560" y2="160" stroke={C.gen} strokeWidth="1.5" strokeDasharray="6,3" />
          </g>
        )}

        {/* === MAIN DC BUS (center) === */}
        <rect x="330" y="145" width="16" height="130" rx="4" fill={C.bat} opacity="0.3" stroke={C.bat} strokeWidth="1.5" />
        <text x="338" y="142" textAnchor="middle" fontSize="7" fill={C.bat} fontWeight="bold">BUS DC</text>
        <text x="338" y="282" textAnchor="middle" fontSize="7" fill={C.bat}>{result.voltajeSistema}V</text>

        {/* === INVERTER/CHARGER (center) === */}
        <rect x="380" y="120" width="120" height="140" rx="8" fill="#ede9fe" stroke={C.inv} strokeWidth="2.5" />
        <text x="440" y="142" textAnchor="middle" fontSize="10" fontWeight="bold" fill={C.inv}>INVERSOR</text>
        <text x="440" y="156" textAnchor="middle" fontSize="9" fill={C.inv}>CARGADOR</text>
        <text x="440" y="170" textAnchor="middle" fontSize="11" fontWeight="bold" fill={C.inv}>{result.potenciaInversorKw} kW</text>
        <text x="440" y="184" textAnchor="middle" fontSize="7" fill={C.text}>{result.voltajeSistema}V DC</text>
        <rect x="398" y="193" width="85" height="28" rx="4" fill={C.inv} opacity="0.15" stroke={C.inv} strokeWidth="1" />
        <text x="440" y="206" textAnchor="middle" fontSize="7" fill={C.inv}>Cargador: {result.corrienteCargaA}A</text>
        <text x="440" y="218" textAnchor="middle" fontSize="7" fill={C.inv}>{result.potenciaCargadorKw} kW</text>
        <text x="440" y="232" textAnchor="middle" fontSize="7" fill={C.text}>Efic. ≥90%</text>
        <text x="440" y="248" textAnchor="middle" fontSize="7" fill={C.text}>BMS comm: CAN/RS485</text>
        {/* Wire to bus */}
        <line x1="346" y1="195" x2="380" y2="195" stroke={C.bat} strokeWidth="3" />
        {/* Wire to AC panel */}
        <line x1="500" y1="190" x2="540" y2="190" stroke={C.ac} strokeWidth="3" />

        {/* === BATTERIES (bottom-center) === */}
        <rect x="355" y="290" width="175" height="55" rx="8" fill="#d1fae5" stroke={C.bat} strokeWidth="2.5" />
        <text x="442" y="308" textAnchor="middle" fontSize="9" fontWeight="bold" fill={C.bat}>BATERÍAS LiFePO4</text>
        <text x="442" y="321" textAnchor="middle" fontSize="8" fill={C.bat}>{result.numBaterias}x {result.capBateria}Ah {result.voltajeSistema}V</text>
        <text x="442" y="333" textAnchor="middle" fontSize="7" fill={C.text}>= {result.energiaTotalKwh} kWh total · BMS integrado</text>
        <text x="442" y="344" textAnchor="middle" fontSize="7" fill={C.text}>Pylontech / BYD / Huawei LUNA</text>
        {/* Wire up to bus */}
        <line x1="400" y1="290" x2="346" y2="260" stroke={C.bat} strokeWidth="3" />
        <line x1="346" y1="260" x2="346" y2="220" stroke={C.bat} strokeWidth="3" />
        {/* BMS label */}
        <text x="290" y="255" fontSize="7" fill={C.bat}>35-70mm²</text>
        <text x="290" y="265" fontSize="7" fill={C.bat}>{result.corrienteBmsA}A BMS</text>

        {/* === AC PANEL === */}
        <rect x="544" y="155" width="100" height="110" rx="6" fill="#dbeafe" stroke={C.ac} strokeWidth="2" />
        <text x="594" y="174" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.ac}>CUADRO AC</text>
        <text x="594" y="186" textAnchor="middle" fontSize="7" fill={C.text}>IGA 40A</text>
        <text x="594" y="197" textAnchor="middle" fontSize="7" fill={C.text}>Diferencial 30mA</text>
        <text x="594" y="208" textAnchor="middle" fontSize="7" fill={C.text}>Protec. sobretensión</text>
        <text x="594" y="219" textAnchor="middle" fontSize="7" fill={C.text}>tipo 2</text>
        <text x="594" y="232" textAnchor="middle" fontSize="7" fill={C.text}>Bornas DIN</text>
        <text x="594" y="243" textAnchor="middle" fontSize="7" fill={C.text}>Contador</text>
        <text x="594" y="254" textAnchor="middle" fontSize="7" fill={C.text}>bidireccional</text>
        {/* Wire to loads */}
        <line x1="644" y1="200" x2="680" y2="200" stroke={C.ac} strokeWidth="2.5" />

        {/* === LOADS / GRID === */}
        <rect x="684" y="170" width="110" height="80" rx="6" fill="#f1f5f9" stroke={C.grid} strokeWidth="2" />
        <text x="739" y="190" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.grid}>
          {hasGrid ? 'RED / CARGAS' : 'CARGAS'}
        </text>
        <text x="739" y="204" textAnchor="middle" fontSize="7" fill={C.grid}>
          {hasGrid ? result.tipoRed === 'hibrida' ? 'Red + consumo' : 'Backup emergencia' : 'Consumo'}
        </text>
        <text x="739" y="216" textAnchor="middle" fontSize="8" fontWeight="bold" fill={C.ac}>{result.potenciaInversorKw} kW</text>
        <text x="739" y="228" textAnchor="middle" fontSize="7" fill="#94a3b8">máx. disponible</text>
        <text x="739" y="240" textAnchor="middle" fontSize="7" fill={C.text}>220/380V AC</text>

        {/* Legend */}
        <g transform="translate(12, 270)">
          <rect width="200" height="72" rx="5" fill="white" stroke="#e2e8f0" strokeWidth="1" />
          <text x="8" y="14" fontSize="8" fontWeight="bold" fill={C.text}>LEYENDA</text>
          <line x1="8" y1="24" x2="35" y2="24" stroke={C.solar} strokeWidth="2" strokeDasharray="4,2" /><text x="40" y="28" fontSize="7" fill={C.text}>DC paneles (cable solar)</text>
          <line x1="8" y1="37" x2="35" y2="37" stroke={C.bat} strokeWidth="2" /><text x="40" y="41" fontSize="7" fill={C.text}>DC baterías (35-70mm²)</text>
          <line x1="8" y1="50" x2="35" y2="50" stroke={C.ac} strokeWidth="2" /><text x="40" y="54" fontSize="7" fill={C.text}>AC (3x6mm²)</text>
          <line x1="8" y1="63" x2="35" y2="63" stroke={C.gen} strokeWidth="1.5" strokeDasharray="5,3" /><text x="40" y="67" fontSize="7" fill={C.text}>Generador (apoyo)</text>
        </g>

        {/* Note */}
        <text x="410" y="352" textAnchor="middle" fontSize="7" fill="#94a3b8">
          Esquema orientativo. Dimensionar cables según ITC-BT y normativa aplicable. Verificar con instalador certificado.
        </text>
      </svg>
    </div>
  );
}