import React from 'react';

/**
 * Esquema técnico de un tubo capilar con sus cotas:
 * longitud (L), diámetro interno (Ø), presiones de entrada (Pc, condensador)
 * y salida (Pe, evaporador) y dirección del flujo de líquido.
 *
 * Recibe cadenas ya formateadas para mantener el componente puramente visual.
 */
export default function CapillarySchematic({
  refrigerant = '',
  color = '#00D4FF',
  lengthLabel = '',
  diameterLabel = '',
  pcLabel = '',
  peLabel = '',
  dpLabel = '',
  flowLabel = '',
}) {
  const x1 = 70;
  const x2 = 690;
  const yTube = 150;
  const hTube = 18;

  return (
    <svg viewBox="0 0 760 300" className="w-full h-auto" style={{ maxHeight: 260 }} role="img" aria-label="Esquema de tubo capilar">
      <defs>
        <linearGradient id="capFill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="50%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0.35" />
        </linearGradient>
        <marker id="arrowEnd" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={color} />
        </marker>
      </defs>

      {/* Conector condensador (alta) */}
      <path d={`M30,${yTube + hTube / 2} C45,${yTube + hTube / 2} 55,${yTube} ${x1},${yTube} L${x1},${yTube + hTube} C55,${yTube + hTube} 45,${yTube + hTube / 2} 30,${yTube + hTube / 2} Z`}
        fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
      <text x="30" y={yTube - 14} textAnchor="start" className="fill-mouth" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>Condensador</text>
      <text x="30" y={yTube + hTube + 22} textAnchor="start" style={{ fontSize: 11, fontWeight: 700, fill: color }}>{pcLabel}</text>

      {/* Conector evaporador (baja) */}
      <path d={`M730,${yTube + hTube / 2} C715,${yTube + hTube / 2} 705,${yTube} ${x2},${yTube} L${x2},${yTube + hTube} C705,${yTube + hTube} 715,${yTube + hTube / 2} 730,${yTube + hTube / 2} Z`}
        fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
      <text x="730" y={yTube - 14} textAnchor="end" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>Evaporador</text>
      <text x="730" y={yTube + hTube + 22} textAnchor="end" style={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--foreground))' }}>{peLabel}</text>

      {/* Capilar */}
      <rect x={x1} y={yTube} width={x2 - x1} height={hTube} rx="3" fill="url(#capFill)" stroke={color} strokeWidth="1.5" />

      {/* Flecha de flujo */}
      <line x1={x1 + 20} y1={yTube - 26} x2={x2 - 20} y2={yTube - 26} stroke={color} strokeWidth="1.5" markerEnd="url(#arrowEnd)" />
      <text x={(x1 + x2) / 2} y={yTube - 32} textAnchor="middle" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>
        {flowLabel || 'Flujo de líquido (alta → baja presión)'}
      </text>

      {/* Cota longitud L */}
      <line x1={x1} y1={yTube + hTube + 44} x2={x2} y2={yTube + hTube + 44} stroke="hsl(var(--foreground))" strokeWidth="1" />
      <line x1={x1} y1={yTube + hTube + 38} x2={x1} y2={yTube + hTube + 50} stroke="hsl(var(--foreground))" strokeWidth="1" />
      <line x1={x2} y1={yTube + hTube + 38} x2={x2} y2={yTube + hTube + 50} stroke="hsl(var(--foreground))" strokeWidth="1" />
      <text x={(x1 + x2) / 2} y={yTube + hTube + 62} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: color }}>
        {lengthLabel}
      </text>

      {/* Cota diámetro Ø (detalle ampliado a la derecha del tubo) */}
      <g transform="translate(610, 40)">
        <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="20" cy="20" r="9" fill="url(#capFill)" stroke={color} strokeWidth="1.2" />
        <line x1="-6" y1="11" x2="11" y2="11" stroke="hsl(var(--foreground))" strokeWidth="0.8" />
        <line x1="-6" y1="29" x2="11" y2="29" stroke="hsl(var(--foreground))" strokeWidth="0.8" />
        <line x1="-6" y1="11" x2="-6" y2="29" stroke="hsl(var(--foreground))" strokeWidth="0.8" />
        <text x="48" y="24" style={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--foreground))' }}>{diameterLabel}</text>
        <text x="48" y="6" style={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}>Sección</text>
      </g>

      {/* ΔP etiqueta central */}
      <text x={(x1 + x2) / 2} y={yTube + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--card))' }}>
        {dpLabel}
      </text>

      {/* Refrigerante */}
      <text x={(x1 + x2) / 2} y={28} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: 'hsl(var(--foreground))', letterSpacing: '0.05em' }}>
        {refrigerant} · Tubo capilar
      </text>
    </svg>
  );
}