import React from 'react';

// Dibuja el panel en la posición de montaje según el ángulo seleccionado (como PVGIS oficial)
const MONTAJE_DATA = {
  '1seccion':   { label: 'Superpuesto una sección', tilt: 30 },
  'integrado':  { label: 'Integrado en techo', tilt: 25 },
  'triangular': { label: 'Triangular cubierta plana', tilt: 15 },
  '2secciones': { label: 'Superpuesto dos secciones', tilt: 22 },
  'eo_plano':   { label: 'Este-Oeste cubierta plana', tilt: 10 },
  'ns_plano':   { label: 'Norte-Sur cubierta plana', tilt: 10 },
  '3secciones': { label: 'Tres secciones', tilt: 20 },
  '4secciones': { label: 'Cuatro secciones', tilt: 18 },
};

const AZIMUTH_ARROWS = {
  '0':    { label: 'Sur ↑',     angle: 0 },
  '-45':  { label: 'SSO ↖',    angle: -45 },
  '45':   { label: 'SSE ↗',    angle: 45 },
  '-90':  { label: 'Oeste ←',  angle: -90 },
  '90':   { label: 'Este →',   angle: 90 },
  '-135': { label: 'NO ↙',     angle: -135 },
  '135':  { label: 'NE ↘',     angle: 135 },
  '180':  { label: 'Norte ↓',  angle: 180 },
};

function deg2rad(d) { return d * Math.PI / 180; }

function PanelSVG({ tilt, azimuth }) {
  const az = parseInt(azimuth) || 0;

  // Vista lateral: panel inclinado
  const BASE_Y = 90;
  const W = 70;
  const panelLen = 58;
  const tRad = deg2rad(tilt);
  const panelEndX = panelLen * Math.cos(tRad);
  const panelEndY = panelLen * Math.sin(tRad);

  // Coordenadas panel vista lateral
  const px1 = 20, py1 = BASE_Y;
  const px2 = px1 + panelEndX, py2 = BASE_Y - panelEndY;
  // Grosor del panel
  const thick = 3;
  const nx = -Math.sin(tRad) * thick, ny = -Math.cos(tRad) * thick;

  // Suelo
  const groundY = BASE_Y + 10;

  // Flecha azimut (brújula pequeña)
  const cxBr = 155, cyBr = 45, rBr = 25;
  const azRad = deg2rad(az);
  const arrowX = cxBr + rBr * 0.85 * Math.sin(azRad);
  const arrowY = cyBr - rBr * 0.85 * Math.cos(azRad);

  return (
    <svg viewBox="0 0 210 110" className="w-full" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
      {/* Fondo */}
      <rect x="0" y="0" width="210" height="110" rx="8" fill="#f0f6ff" stroke="#bfdbfe" strokeWidth="1" />

      {/* Título vista lateral */}
      <text x="6" y="10" fontSize="6.5" fill="#1e3a5f" fontWeight="bold">Vista lateral — inclinación</text>

      {/* Suelo */}
      <rect x="8" y={groundY} width={W + 20} height="4" rx="1" fill="#94a3b8" />
      {/* Tejado (triángulo) */}
      <polygon points={`8,${BASE_Y} ${8 + panelEndX + 6},${BASE_Y - panelEndY - 4} ${8 + W},${BASE_Y}`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />

      {/* Panel (vista lateral) */}
      <polygon
        points={`
          ${px1},${py1} ${px2},${py2}
          ${px2 + nx},${py2 + ny} ${px1 + nx},${py1 + ny}
        `}
        fill="#1e40af" stroke="#1e3a5f" strokeWidth="0.7"
      />
      {/* Líneas células */}
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i}
          x1={px1 + t * (px2 - px1)} y1={py1 + t * (py2 - py1)}
          x2={px1 + t * (px2 - px1) + nx} y2={py1 + t * (py2 - py1) + ny}
          stroke="#60a5fa" strokeWidth="0.4"
        />
      ))}

      {/* Ángulo de inclinación */}
      <path d={`M ${px1 + 18},${py1} A 18 18 0 0 1 ${px1 + 18 * Math.cos(tRad)},${py1 - 18 * Math.sin(tRad)}`}
        fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="2,1" />
      <text x={px1 + 21} y={BASE_Y - 4} fontSize="7" fill="#f97316" fontWeight="bold">{tilt}°</text>

      {/* Sol */}
      <circle cx={px1 + 5 + panelEndX * 0.6} cy={py2 - 14} r="7" fill="#fbbf24" opacity="0.9" />
      {[0,45,90,135,180,225,270,315].map((a, i) => {
        const r1 = 9, r2 = 12, ar = deg2rad(a);
        return <line key={i}
          x1={px1 + 5 + panelEndX * 0.6 + r1 * Math.cos(ar)} y1={py2 - 14 + r1 * Math.sin(ar)}
          x2={px1 + 5 + panelEndX * 0.6 + r2 * Math.cos(ar)} y2={py2 - 14 + r2 * Math.sin(ar)}
          stroke="#fbbf24" strokeWidth="0.8" />;
      })}

      {/* ── Brújula azimut ── */}
      <text x={cxBr - 6} y={cyBr - rBr - 4} fontSize="6.5" fill="#1e3a5f" fontWeight="bold">Azimut</text>
      <circle cx={cxBr} cy={cyBr} r={rBr} fill="white" stroke="#93c5fd" strokeWidth="1" />
      {/* Puntos cardinales */}
      <text x={cxBr - 2.5} y={cyBr - rBr + 6} fontSize="5.5" fill="#374151">N</text>
      <text x={cxBr - 2.5} y={cyBr + rBr - 1} fontSize="5.5" fill="#374151">S</text>
      <text x={cxBr + rBr - 6} y={cyBr + 2} fontSize="5.5" fill="#374151">E</text>
      <text x={cxBr - rBr + 2} y={cyBr + 2} fontSize="5.5" fill="#374151">O</text>
      {/* Flecha azimut */}
      <line x1={cxBr} y1={cyBr} x2={arrowX} y2={arrowY} stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={arrowX} cy={arrowY} r="2.5" fill="#ef4444" />
      {/* Panel mini top-view */}
      {(() => {
        const pw = 10, ph = 16;
        const cosA = Math.cos(azRad), sinA = Math.sin(azRad);
        const corners = [[-pw/2, -ph/2],[pw/2, -ph/2],[pw/2, ph/2],[-pw/2, ph/2]];
        const rot = corners.map(([x, y]) => [
          cxBr + x * cosA - y * sinA,
          cyBr + x * sinA + y * cosA
        ]);
        return (
          <polygon
            points={rot.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="#1e40af" stroke="#60a5fa" strokeWidth="0.6" opacity="0.7"
          />
        );
      })()}

      {/* Etiqueta azimut */}
      <text x={cxBr - 16} y={cyBr + rBr + 9} fontSize="6" fill="#ef4444" fontWeight="bold">
        {AZIMUTH_ARROWS[azimuth]?.label || 'Sur'}
      </text>

      {/* Producción estimada */}
      <rect x="8" y="96" width="96" height="12" rx="2" fill="#1e3a5f" opacity="0.08" />
      <text x="12" y="105" fontSize="6" fill="#1e3a5f" fontWeight="bold">
        Tilt óptimo aprox. {Math.round(38 * 0.87 - 1.5)}–{Math.round(43 * 0.87 - 1.5)}° según zona
      </text>
    </svg>
  );
}

export default function MontajeIllustration({ montaje, tilt, azimuth }) {
  const data = MONTAJE_DATA[montaje] || MONTAJE_DATA['1seccion'];
  const tiltVal = tilt !== '' && !isNaN(parseFloat(tilt)) ? parseFloat(tilt) : data.tilt;

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-3 shadow-sm">
      <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
        📐 Posición de montaje — {data.label}
      </p>
      <PanelSVG tilt={tiltVal} azimuth={azimuth || '0'} />
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-600">
        <span className="bg-orange-100 text-orange-700 rounded px-2 py-0.5 font-semibold">Inclinación: {tiltVal}°</span>
        <span className="bg-red-100 text-red-700 rounded px-2 py-0.5 font-semibold">
          Azimut: {AZIMUTH_ARROWS[azimuth]?.label || 'Sur (0°)'}
        </span>
      </div>
    </div>
  );
}