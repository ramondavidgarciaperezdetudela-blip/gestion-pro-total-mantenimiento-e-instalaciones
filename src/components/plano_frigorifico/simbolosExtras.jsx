import React from 'react';

// Símbolos vectoriales de los equipos que NO tenía dibujo propio en
// PlanoSimbolo: aparamenta eléctrica (con simbología IEC 60617 estándar),
// elementos de seguridad, de estructura y el resto de máquinas de frío/clima
// que antes caían a la caja genérica.
//
// Se devuelven como JSX (SVG) y los consume PlanoSimbolo.dibujar() antes de
// su fallback genérico. Así cada equipo se identifica en el plano a primera
// vista, sin iconos planos.

const NEGRO = '#0f172a';
const LINEA = '#e2e8f0';
const ACENT = '#fbbf24';

function pinta(c) { return c; }

// ─── Aparamenta eléctrica (simbología IEC 60617) ──────────────────────────────

// Magnetotérmico: contactor con disparo térmico + magnético.
// Símbolo IEC: una línea de contactos con un arco (térmico) y una "x" (magnético).
function magnetotermico(w, h, x0, y0, id, datos, mini) {
  const cx = 0;
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#1e293b" stroke={ACENT} strokeWidth="1.3" />
      {/* Línea de contacto: entra arriba, sale abajo con un quiebre */}
      <line x1={cx} y1={y0} x2={cx} y2={y0 + h * 0.28} stroke={LINEA} strokeWidth="1.4" />
      {/* Contacto abierto (línea diagonal) */}
      <line x1={cx} y1={y0 + h * 0.28} x2={cx + w * 0.18} y2={y0 + h * 0.52} stroke={LINEA} strokeWidth="1.4" />
      {/* Mecanismo térmico: arco (bimetal) */}
      <path d={`M ${cx} ${y0 + h * 0.55} q ${w * 0.12} ${h * 0.08} ${0} ${h * 0.16}`} fill="none" stroke={ACENT} strokeWidth="1.1" />
      {/* Mecanismo magnético: aspa */}
      <line x1={cx - w * 0.12} y1={y0 + h * 0.78} x2={cx + w * 0.12} y2={y0 + h * 0.66} stroke={ACENT} strokeWidth="1.1" />
      <line x1={cx} y1={y0 + h * 0.72} x2={cx} y2={y0 + h} stroke={LINEA} strokeWidth="1.4" />
      {!mini && <text x={0} y={y0 + h + 7} textAnchor="middle" fontSize="6" fill={ACENT} fontWeight="700">MG</text>}
    </g>
  );
}

// Diferencial: IEC = bloque con transformador de suma + símbolo de corriente
// de fuga (un círculo con flecha). El cuadro grande con la bobina.
function diferencial(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#1e293b" stroke={ACENT} strokeWidth="1.3" />
      {/* Bobina / transformador (dos arcos enfrentados) */}
      <path d={`M ${x0 + w * 0.28} ${y0 + h * 0.2} q ${w * 0.1} ${h * 0.12} 0 ${h * 0.24} q ${w * 0.1} ${h * 0.12} 0 ${h * 0.24}`}
        fill="none" stroke={LINEA} strokeWidth="1.1" />
      <path d={`M ${x0 + w * 0.72} ${y0 + h * 0.2} q ${-w * 0.1} ${h * 0.12} 0 ${h * 0.24} q ${-w * 0.1} ${h * 0.12} 0 ${h * 0.24}`}
        fill="none" stroke={LINEA} strokeWidth="1.1" />
      {/* Símbolo de corriente diferencial: flecha circular */}
      <circle cx={0} cy={y0 + h * 0.5} r={h * 0.13} fill="none" stroke={ACENT} strokeWidth="1" />
      <path d={`M ${w * 0.02} ${y0 + h * 0.42} a ${h * 0.13} ${h * 0.13} 0 0 1 ${-h * 0.13} ${h * 0.08}`} fill="none" stroke={ACENT} strokeWidth="1" />
      <polygon points={`${-h * 0.1},${y0 + h * 0.49} ${-h * 0.02},${y0 + h * 0.46} ${-h * 0.02},${y0 + h * 0.52}`} fill={ACENT} />
      {!mini && <text x={0} y={y0 + h + 7} textAnchor="middle" fontSize="6" fill={ACENT} fontWeight="700">ID</text>}
    </g>
  );
}

// Contactor: contactos (línea con quiebre) + bobina de mando (rectángulo con C).
function contactor(w, h, x0, y0, id, datos, mini) {
  const cx = x0 + w * 0.4;
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#1e293b" stroke={ACENT} strokeWidth="1.2" />
      {/* Contacto principal */}
      <line x1={cx} y1={y0} x2={cx} y2={y0 + h * 0.32} stroke={LINEA} strokeWidth="1.3" />
      <line x1={cx} y1={y0 + h * 0.32} x2={cx + w * 0.16} y2={y0 + h * 0.56} stroke={LINEA} strokeWidth="1.3" />
      <line x1={cx + w * 0.06} y1={y0 + h * 0.62} x2={cx + w * 0.06} y2={y0 + h} stroke={LINEA} strokeWidth="1.3" />
      {/* Bobina de mando */}
      <rect x={x0 + w * 0.66} y={y0 + h * 0.3} width={w * 0.24} height={h * 0.4} fill="none" stroke={ACENT} strokeWidth="1" />
      <line x1={x0 + w * 0.66} y1={y0 + h * 0.5} x2={x0 + w * 0.9} y2={y0 + h * 0.5} stroke={ACENT} strokeWidth="0.8" />
      {!mini && <text x={x0 + w * 0.78} y={y0 + h * 0.54} textAnchor="middle" fontSize="5" fill={ACENT} fontWeight="700">C</text>}
    </g>
  );
}

// Guardamotor: relé térmico. Símbolo IEC: caja con curva bimetal + contacto.
function guardamotor(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#1e293b" stroke={ACENT} strokeWidth="1.3" />
      {/* Bimetal (curva) */}
      <path d={`M ${x0 + w * 0.18} ${y0 + h * 0.7} q ${w * 0.2} ${-h * 0.35} ${w * 0.4} 0`}
        fill="none" stroke={ACENT} strokeWidth="1.2" />
      {/* Contacto de disparo */}
      <line x1={x0 + w * 0.7} y1={y0 + h * 0.3} x2={x0 + w * 0.86} y2={y0 + h * 0.5} stroke={LINEA} strokeWidth="1.2" />
      <line x1={x0 + w * 0.5} y1={y0 + h * 0.12} x2={x0 + w * 0.5} y2={y0 + h * 0.45} stroke={LINEA} strokeWidth="1.2" />
      <line x1={x0 + w * 0.5} y1={y0 + h * 0.55} x2={x0 + w * 0.5} y2={y0 + h * 0.88} stroke={LINEA} strokeWidth="1.2" />
    </g>
  );
}

// Variador de frecuencia: caja con símbolo de conversión seno → cuadrada.
function variador(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {cuerpo(w, h, x0, y0, id)}
      {/* Onda seno entrante */}
      <path d={`M ${x0 + w * 0.12} ${y0 + h * 0.45} q ${w * 0.1} ${-h * 0.18} ${w * 0.2} 0 q ${w * 0.1} ${h * 0.18} ${w * 0.2} 0`}
        fill="none" stroke={ACENT} strokeWidth="1.2" />
      {/* Flecha */}
      <line x1={x0 + w * 0.56} y1={y0 + h * 0.45} x2={x0 + w * 0.64} y2={y0 + h * 0.45} stroke={LINEA} strokeWidth="1" />
      {/* Onda cuadrada saliente */}
      <path d={`M ${x0 + w * 0.66} ${y0 + h * 0.58} h ${w * 0.08} v ${-h * 0.26} h ${w * 0.08} v ${h * 0.26} h ${w * 0.08}`}
        fill="none" stroke={ACENT} strokeWidth="1.2" />
      {!mini && <text x={0} y={y0 + h + 7} textAnchor="middle" fontSize="6" fill={ACENT} fontWeight="700">VFD</text>}
    </g>
  );
}

// Autómata / PLC: caja con líneas de entrada/salida.
function automata(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#1e293b" stroke={ACENT} strokeWidth="1.3" />
      {/* Pantalla */}
      <rect x={x0 + w * 0.1} y={y0 + h * 0.18} width={w * 0.5} height={h * 0.24} fill="#0ea5e9" opacity="0.5" stroke={LINEA} strokeWidth="0.6" />
      {/* Bornes de entrada/salida */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={'o' + i} cx={x0 + w * 0.74} cy={y0 + h * (0.25 + i * 0.17)} r={Math.max(1, h * 0.05)} fill={ACENT} />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={'i' + i} cx={x0 + w * 0.14} cy={y0 + h * (0.6 + i * 0.14)} r={Math.max(1, h * 0.05)} fill={LINEA} />
      ))}
      {!mini && <text x={x0 + w * 0.35} y={y0 + h * 0.33} textAnchor="middle" fontSize="5" fill="#0f172a" fontWeight="700">PLC</text>}
    </g>
  );
}

// Cableado: tramo de conductor (línea con marca de sección).
function cableado(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx={h / 2} fill="#0f172a" stroke={ACENT} strokeWidth="1" />
      <line x1={x0 + 2} y1={0} x2={x0 + w - 2} y2={0} stroke={ACENT} strokeWidth="1.6" />
      {!mini && <line x1={x0 + w * 0.3} y1={-h * 0.6} x2={x0 + w * 0.7} y2={h * 0.6} stroke={ACENT} strokeWidth="0.8" opacity="0.7" />}
    </g>
  );
}

// Toma de corriente: símbolo IEC de base Schuko (semi-círculo con prongs).
function tomaCorriente(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.4;
  return (
    <g>
      <path d={`M ${-r} ${r} a ${r} ${r} 0 0 1 ${r * 2} 0`} fill="#1e293b" stroke={ACENT} strokeWidth="1.3" />
      {/* Dos prongs */}
      <rect x={-r * 0.4} y={-r * 0.4} width={r * 0.18} height={r * 0.5} fill={LINEA} />
      <rect x={r * 0.22} y={-r * 0.4} width={r * 0.18} height={r * 0.5} fill={LINEA} />
      {/* Toma de tierra central */}
      <circle cx={0} cy={r * 0.15} r={r * 0.12} fill="none" stroke={ACENT} strokeWidth="1" />
    </g>
  );
}

// Interruptor: símbolo IEC de interruptor unipolar (línea con contacto inclinado).
function interruptor(w, h, x0, y0, id, datos, mini) {
  const cx = 0;
  return (
    <g>
      <line x1={cx - w * 0.42} y1={0} x2={cx - w * 0.12} y2={0} stroke={LINEA} strokeWidth="1.6" />
      <line x1={cx - w * 0.12} y1={0} x2={cx + w * 0.26} y2={-h * 0.34} stroke={LINEA} strokeWidth="1.6" />
      <circle cx={cx + w * 0.26} cy={-h * 0.34} r={1.2} fill={LINEA} />
      <line x1={cx + w * 0.26} y1={0} x2={cx + w * 0.42} y2={0} stroke={LINEA} strokeWidth="1.6" />
    </g>
  );
}

// Luminaria: símbolo IEC de lámpara (círculo con X dentro).
function luminaria(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.34;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#1e293b" stroke={ACENT} strokeWidth="1.3" />
      <line x1={-r * 0.7} y1={-r * 0.7} x2={r * 0.7} y2={r * 0.7} stroke={ACENT} strokeWidth="1.2" />
      <line x1={-r * 0.7} y1={r * 0.7} x2={r * 0.7} y2={-r * 0.7} stroke={ACENT} strokeWidth="1.2" />
    </g>
  );
}

// Puesta a tierra: símbolo IEC de toma de tierra (3 líneas horizontales decrecientes).
function puestaTierra(w, h, x0, y0, id, datos, mini) {
  const cx = 0;
  return (
    <g>
      <line x1={cx} y1={y0} x2={cx} y2={y0 + h * 0.4} stroke={LINEA} strokeWidth="1.6" />
      <line x1={cx - w * 0.4} y1={y0 + h * 0.4} x2={cx + w * 0.4} y2={y0 + h * 0.4} stroke={LINEA} strokeWidth="1.6" />
      <line x1={cx - w * 0.28} y1={y0 + h * 0.58} x2={cx + w * 0.28} y2={y0 + h * 0.58} stroke={LINEA} strokeWidth="1.4" />
      <line x1={cx - w * 0.16} y1={y0 + h * 0.74} x2={cx + w * 0.16} y2={y0 + h * 0.74} stroke={LINEA} strokeWidth="1.2" />
    </g>
  );
}

// ─── Seguridad ───────────────────────────────────────────────────────────────

function valvulaSeguridad(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {/* Cuerpo de válvula (triángulo) */}
      <polygon points={`${-w * 0.25},${y0 + h * 0.3} ${w * 0.25},${y0 + h * 0.3} ${0},${y0 + h * 0.7}`} fill="#1e293b" stroke="#ef4444" strokeWidth="1.3" />
      {/* Muelle (zigzag) */}
      <polyline points={`${0},${y0} ${-w * 0.12},${y0 + h * 0.12} ${w * 0.12},${y0 + h * 0.22} ${-w * 0.12},${y0 + h * 0.32}`}
        fill="none" stroke="#ef4444" strokeWidth="1.2" />
      <line x1={0} y1={y0 + h * 0.3} x2={0} y2={y0 + h * 0.7} stroke="#ef4444" strokeWidth="1.2" />
      {/* Flecha de descarga hacia arriba */}
      <line x1={0} y1={y0 - h * 0.1} x2={0} y2={y0 + h * 0.05} stroke="#f87171" strokeWidth="1.4" />
    </g>
  );
}

function detectorFugas(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.36;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#1e293b" stroke="#ef4444" strokeWidth="1.3" />
      {/* Ondas de gas */}
      <path d={`M ${-r * 0.4} ${-r * 0.2} q ${r * 0.2} ${-r * 0.25} ${r * 0.4} 0 q ${r * 0.2} ${r * 0.25} ${r * 0.4} 0`}
        fill="none" stroke="#fca5a5" strokeWidth="1.1" />
      <path d={`M ${-r * 0.4} ${r * 0.2} q ${r * 0.2} ${-r * 0.2} ${r * 0.4} 0 q ${r * 0.2} ${r * 0.2} ${r * 0.4} 0`}
        fill="none" stroke="#fca5a5" strokeWidth="1" />
      {!mini && <text x={0} y={r + 7} textAnchor="middle" fontSize="5" fill="#ef4444" fontWeight="700">GAS</text>}
    </g>
  );
}

function alarmaCamara(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.36;
  return (
    <g>
      {/* Campana */}
      <path d={`M ${-r} ${r * 0.4} a ${r} ${r} 0 0 1 ${r * 2} 0 z`} fill="#1e293b" stroke="#ef4444" strokeWidth="1.3" />
      <rect x={-r * 0.5} y={-r * 0.15} width={r} height={r * 0.2} rx="2" fill="#ef4444" />
      <circle cx={0} cy={r * 0.55} r={r * 0.1} fill="#fbbf24" />
      {/* Badajuel */}
      <line x1={0} y1={r * 0.4} x2={0} y2={r * 0.6} stroke="#fbbf24" strokeWidth="1.4" />
    </g>
  );
}

function pulsadorEmergencia(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.36;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.6} fill="#ef4444" />
      {!mini && <text x={0} y={2} textAnchor="middle" fontSize={Math.max(6, r * 0.5)} fill="#fff" fontWeight="700">STOP</text>}
    </g>
  );
}

function paroEmergencia(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.4;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.4" />
      <circle cx={0} cy={0} r={r * 0.55} fill="#dc2626" />
      <line x1={-r * 0.4} y1={0} x2={r * 0.4} y2={0} stroke="#fff" strokeWidth="1.6" />
      <line x1={0} y1={-r * 0.4} x2={0} y2={r * 0.4} stroke="#fff" strokeWidth="1.6" />
    </g>
  );
}

function extraccionEmergencia(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.32;
  return (
    <g>
      <circle cx={0} cy={0} r={r + 2} fill="#1e293b" stroke="#ef4444" strokeWidth="1.3" />
      <circle cx={0} cy={0} r={r} fill="#334155" />
      {/* Aspas */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i * 2 * Math.PI) / 5;
        return <line key={i} x1={0} y1={0} x2={Math.cos(a) * r * 0.8} y2={Math.sin(a) * r * 0.8} stroke="#cbd5e1" strokeWidth="1.4" />;
      })}
      <circle cx={0} cy={0} r={r * 0.2} fill="#0f172a" />
      {/* Signo de emergencia */}
      <text x={r + 4} y={-r} fontSize={Math.max(7, r * 0.7)} fill="#ef4444" fontWeight="700">!</text>
    </g>
  );
}

function extintor(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {/* Cuerpo del extintor */}
      <rect x={-w * 0.18} y={y0 + h * 0.1} width={w * 0.36} height={h * 0.8} rx="3" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
      {/* Cuello y manija */}
      <rect x={-w * 0.06} y={y0} width={w * 0.12} height={h * 0.14} fill="#334155" />
      <rect x={w * 0.05} y={y0 + h * 0.02} width={w * 0.12} height={h * 0.08} rx="2" fill="#1e293b" />
      {/* Manguera */}
      <path d={`M ${w * 0.05} ${y0 + h * 0.2} q ${w * 0.18} ${h * 0.1} ${w * 0.1} ${h * 0.3}`} fill="none" stroke="#0f172a" strokeWidth="1.2" />
      {/* Etiqueta */}
      {!mini && <text x={0} y={y0 + h * 0.55} textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">EXT</text>}
    </g>
  );
}

function detectorHumo(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.36;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#1e293b" stroke="#ef4444" strokeWidth="1.3" />
      {/* Espiral de humo */}
      <path d={`M ${0} ${-r * 0.3} q ${r * 0.4} ${r * 0.1} ${0} ${r * 0.3} q ${-r * 0.4} ${r * 0.1} ${0} ${r * 0.3}`}
        fill="none" stroke="#fca5a5" strokeWidth="1.2" />
    </g>
  );
}

function luzEmergencia(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.32;
  return (
    <g>
      <rect x={-w * 0.4} y={y0} width={w * 0.8} height={h} rx="2" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.2" />
      <circle cx={-w * 0.18} cy={y0 + h * 0.5} r={r * 0.6} fill="#fbbf24" />
      <line x1={-w * 0.18 - r * 0.4} y1={y0 + h * 0.5 - r * 0.4} x2={-w * 0.18 + r * 0.4} y2={y0 + h * 0.5 + r * 0.4} stroke="#1e293b" strokeWidth="0.8" />
      <line x1={-w * 0.18 - r * 0.4} y1={y0 + h * 0.5 + r * 0.4} x2={-w * 0.18 + r * 0.4} y2={y0 + h * 0.5 - r * 0.4} stroke="#1e293b" strokeWidth="0.8" />
      {!mini && <text x={w * 0.14} y={y0 + h * 0.56} textAnchor="middle" fontSize="6" fill="#fbbf24" fontWeight="700">E</text>}
    </g>
  );
}

function señalización(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#fef3c7" stroke="#ef4444" strokeWidth="1.4" />
      <polygon points={`${x0 + w * 0.5},${y0 + h * 0.22} ${x0 + w * 0.78},${y0 + h * 0.6} ${x0 + w * 0.22},${y0 + h * 0.6}`}
        fill="#ef4444" />
      <text x={x0 + w * 0.5} y={y0 + h * 0.5} textAnchor="middle" fontSize={Math.max(7, h * 0.4)} fill="#fff" fontWeight="700">!</text>
    </g>
  );
}

// ─── Estructura ──────────────────────────────────────────────────────────────

function pilar(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} fill="#4c1d95" stroke="#2e1065" strokeWidth="1.4" />
      {/* Rayado de hormigón */}
      {[0.2, 0.4, 0.6, 0.8].map((p, i) => (
        <line key={i} x1={x0} y1={y0 + h * p} x2={x0 + w} y2={y0 + h * p - w * 0.2} stroke="#7c3aed" strokeWidth="0.6" opacity="0.7" />
      ))}
    </g>
  );
}

function puerta(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {/* Hoja */}
      <line x1={x0} y1={y0 + h} x2={x0 + w} y2={y0} stroke="#a78bfa" strokeWidth="1.6" />
      {/* Arco de giro */}
      <path d={`M ${x0 + w} ${y0} a ${w} ${w} 0 0 0 ${-w} ${w}`} fill="none" stroke="#7c3aed" strokeWidth="1" strokeDasharray="2 2" />
      <line x1={x0} y1={y0 + h} x2={x0} y2={y0} stroke="#7c3aed" strokeWidth="1" strokeDasharray="2 2" />
    </g>
  );
}

function ventana(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.3" />
      <line x1={x0 + w * 0.5} y1={y0} x2={x0 + w * 0.5} y2={y0 + h} stroke="#7c3aed" strokeWidth="0.8" />
      <line x1={x0} y1={y0 + h * 0.5} x2={x0 + w} y2={y0 + h * 0.5} stroke="#7c3aed" strokeWidth="0.8" />
    </g>
  );
}

function desague(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.4;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#1e293b" stroke="#7c3aed" strokeWidth="1.3" />
      {/* Rejilla */}
      <line x1={-r} y1={0} x2={r} y2={0} stroke="#a78bfa" strokeWidth="0.9" />
      <line x1={0} y1={-r} x2={0} y2={r} stroke="#a78bfa" strokeWidth="0.9" />
      <line x1={-r * 0.7} y1={-r * 0.7} x2={r * 0.7} y2={r * 0.7} stroke="#a78bfa" strokeWidth="0.7" />
      <line x1={-r * 0.7} y1={r * 0.7} x2={r * 0.7} y2={-r * 0.7} stroke="#a78bfa" strokeWidth="0.7" />
    </g>
  );
}

// ─── Refrigeración / clima que faltaban ──────────────────────────────────────

function valvulaExpansion(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {/* Orificio restrictivo (dos triángulos) */}
      <polygon points={`${-w * 0.4},${-h * 0.2} ${0},${0} ${-w * 0.4},${h * 0.2}`} fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      <polygon points={`${w * 0.4},${-h * 0.2} ${0},${0} ${w * 0.4},${h * 0.2}`} fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      <line x1={-w * 0.45} y1={0} x2={-w * 0.4} y2={0} stroke="#7dd3fc" strokeWidth="1.4" />
      <line x1={w * 0.4} y1={0} x2={w * 0.45} y2={0} stroke="#7dd3fc" strokeWidth="1.4" />
    </g>
  );
}

function tuberiaRefrigerante(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx={h / 2} fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      {/* Aislamiento (rayita) */}
      {!mini && <line x1={x0 + 2} y1={0} x2={x0 + w - 2} y2={0} stroke="#7dd3fc" strokeWidth="1" strokeDasharray="2 1" />}
    </g>
  );
}

function deshumidificador(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="3" fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      <circle cx={x0 + w * 0.35} cy={y0 + h * 0.45} r={h * 0.2} fill="#0f172a" />
      {/* Gotas */}
      <path d={`M ${x0 + w * 0.7} ${y0 + h * 0.3} a ${h * 0.12} ${h * 0.12} 0 1 0 ${h * 0.04} ${h * 0.2} z`} fill="#7dd3fc" />
      <path d={`M ${x0 + w * 0.82} ${y0 + h * 0.45} a ${h * 0.1} ${h * 0.1} 0 1 0 ${h * 0.03} ${h * 0.16} z`} fill="#7dd3fc" />
    </g>
  );
}

function vitrina(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      {/* Cristal frontal (más claro) */}
      <rect x={x0 + 2} y={y0 + 3} width={w - 4} height={h * 0.55} fill="#7dd3fc" opacity="0.35" stroke="#e0f2fe" strokeWidth="0.6" />
      {/* Repisas */}
      <line x1={x0 + 2} y1={y0 + h * 0.45} x2={x0 + w - 2} y2={y0 + h * 0.45} stroke="#0f172a" strokeWidth="0.7" />
      {!mini && <text x={0} y={y0 + h * 0.75} textAnchor="middle" fontSize="7" fill="#e0f2fe">❄</text>}
    </g>
  );
}

function mural(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      {/* Bandejas */}
      {[0.3, 0.55, 0.8].map((p, i) => (
        <line key={i} x1={x0 + 3} y1={y0 + h * p} x2={x0 + w - 3} y2={y0 + h * p} stroke="#e0f2fe" strokeWidth="0.7" />
      ))}
      {!mini && <text x={x0 + w * 0.5} y={y0 + h * 0.2} textAnchor="middle" fontSize="6" fill="#e0f2fe">❄</text>}
    </g>
  );
}

function arcon(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0 + h * 0.2} width={w} height={h * 0.8} rx="3" fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      {/* Tapa abatible */}
      <path d={`M ${x0} ${y0 + h * 0.2} q ${w * 0.5} ${-h * 0.18} ${w} 0`} fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      {!mini && <text x={0} y={y0 + h * 0.65} textAnchor="middle" fontSize="8" fill="#e0f2fe">❄</text>}
    </g>
  );
}

function abatidor(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="3" fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      {/* Flecha descendente (abatir) */}
      <line x1={0} y1={y0 + h * 0.2} x2={0} y2={y0 + h * 0.7} stroke="#e0f2fe" strokeWidth="1.8" />
      <polyline points={`${-h * 0.15},${y0 + h * 0.55} ${0},${y0 + h * 0.72} ${h * 0.15},${y0 + h * 0.55}`}
        fill="none" stroke="#e0f2fe" strokeWidth="1.6" />
      {!mini && <text x={0} y={y0 + h * 0.92} textAnchor="middle" fontSize="5" fill="#e0f2fe">ABAT</text>}
    </g>
  );
}

function botellero(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#0e7490" stroke="#0f172a" strokeWidth="1" />
      {/* Botellas (rectángulos) */}
      {[0.25, 0.5, 0.75].map((p, i) => (
        <rect key={i} x={x0 + w * p - w * 0.08} y={y0 + h * 0.2} width={w * 0.16} height={h * 0.65} rx="2" fill="#7dd3fc" opacity="0.6" />
      ))}
    </g>
  );
}

function recibidor(w, h, x0, y0, id, datos, mini) {
  const rx = w * 0.35, ry = h * 0.38;
  return (
    <g>
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      <ellipse cx={0} cy={-ry * 0.15} rx={rx * 0.7} ry={ry * 0.5} fill="#0e7490" opacity="0.6" />
      {/* Nivel de líquido */}
      <line x1={-rx * 0.6} y1={-ry * 0.1} x2={rx * 0.6} y2={-ry * 0.1} stroke="#7dd3fc" strokeWidth="0.8" />
    </g>
  );
}

function separadorAceite(w, h, x0, y0, id, datos, mini) {
  const rx = w * 0.32, ry = h * 0.4;
  return (
    <g>
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      {/* Gota de aceite */}
      <path d={`M ${0} ${-ry * 0.5} a ${rx * 0.25} ${rx * 0.25} 0 1 0 ${rx * 0.08} ${ry * 0.3} z`} fill="#fbbf24" />
    </g>
  );
}

function filtroDeshidratador(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0 + h * 0.1} width={w} height={h * 0.8} rx={h * 0.3} fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      {/* Malla interna */}
      {[0.3, 0.5, 0.7].map((p, i) => (
        <line key={i} x1={x0 + 3} y1={y0 + h * p} x2={x0 + w - 3} y2={y0 + h * p} stroke="#7dd3fc" strokeWidth="0.6" opacity="0.7" />
      ))}
    </g>
  );
}

function visorLiquido(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.4;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#7dd3fc" stroke="#0f172a" strokeWidth="1.2" opacity="0.8" />
      <circle cx={0} cy={0} r={r * 0.5} fill="#e0f2fe" opacity="0.6" />
      <circle cx={-r * 0.2} cy={-r * 0.2} r={r * 0.1} fill="#fff" opacity="0.8" />
    </g>
  );
}

function valvulaSolenoide(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {/* Cuerpo */}
      <rect x={x0} y={y0 + h * 0.3} width={w} height={h * 0.4} fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      {/* Bobina (rectángulo encima) */}
      <rect x={x0 + w * 0.3} y={y0} width={w * 0.4} height={h * 0.32} fill="#1e293b" stroke="#fbbf24" strokeWidth="0.8" />
      <line x1={x0 + w * 0.5} y1={y0} x2={x0 + w * 0.5} y2={y0 + h * 0.32} stroke="#fbbf24" strokeWidth="0.7" strokeDasharray="1 1" />
    </g>
  );
}

function presostato(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.35;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      {/* Manecilla */}
      <line x1={0} y1={0} x2={r * 0.6} y2={-r * 0.4} stroke="#e0f2fe" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.15} fill="#0f172a" />
      {!mini && <text x={0} y={r * 0.6} textAnchor="middle" fontSize="5" fill="#e0f2fe">P</text>}
    </g>
  );
}

function controlTemperatura(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.34;
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#155e75" stroke="#0f172a" strokeWidth="1" />
      {/* Pantalla */}
      <rect x={x0 + w * 0.2} y={y0 + h * 0.2} width={w * 0.6} height={h * 0.4} fill="#0ea5e9" opacity="0.7" />
      {/* Termómetro */}
      <line x1={x0 + w * 0.5} y1={y0 + h * 0.7} x2={x0 + w * 0.5} y2={y0 + h * 0.9} stroke="#e0f2fe" strokeWidth="1.2" />
      <circle cx={x0 + w * 0.5} cy={y0 + h * 0.9} r={r * 0.25} fill="#fbbf24" />
    </g>
  );
}

function consolaSuelo(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="3" fill="#0f766e" stroke="#0f172a" strokeWidth="1" />
      {/* Rejilla frontal */}
      {[0.25, 0.5, 0.75].map((p, i) => (
        <line key={i} x1={x0 + 3} y1={y0 + h * p} x2={x0 + w - 3} y2={y0 + h * p} stroke="#5eead4" strokeWidth="0.7" />
      ))}
    </g>
  );
}

function recuperador(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="3" fill="#0f766e" stroke="#0f172a" strokeWidth="1" />
      {/* Dos flujos cruzados */}
      <line x1={x0 + 3} y1={y0 + h * 0.35} x2={x0 + w - 3} y2={y0 + h * 0.35} stroke="#38bdf8" strokeWidth="1.2" />
      <line x1={x0 + 3} y1={y0 + h * 0.65} x2={x0 + w - 3} y2={y0 + h * 0.65} stroke="#f87171" strokeWidth="1.2" />
      <line x1={x0 + w * 0.3} y1={y0 + 3} x2={x0 + w * 0.3} y2={y0 + h - 3} stroke="#5eead4" strokeWidth="0.7" strokeDasharray="2 2" />
      <line x1={x0 + w * 0.7} y1={y0 + 3} x2={x0 + w * 0.7} y2={y0 + h - 3} stroke="#5eead4" strokeWidth="0.7" strokeDasharray="2 2" />
    </g>
  );
}

function cuerpo(w, h, x0, y0, id) {
  return (
    <rect x={x0} y={y0} width={w} height={h} rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
  );
}

// Mapa tipo → dibujo. Devuelve null si el tipo no está aquí.
const MAPA = {
  // Eléctricos
  magnetotermico,
  diferencial,
  contactor,
  guardamotor,
  variador,
  automata,
  cableado,
  toma_corriente: tomaCorriente,
  interruptor,
  luminaria,
  puesta_tierra: puestaTierra,
  // Seguridad
  valvula_seguridad: valvulaSeguridad,
  detector_fugas: detectorFugas,
  alarma_camara: alarmaCamara,
  pulsador_emergencia: pulsadorEmergencia,
  paro_emergencia: paroEmergencia,
  extraccion_emergencia: extraccionEmergencia,
  extintor,
  detector_humo: detectorHumo,
  luz_emergencia: luzEmergencia,
  señalizacion: señalización,
  senalizacion: señalización,
  // Estructura
  pilar,
  puerta,
  ventana,
  desague,
  // Refrigeración / clima que faltaban
  valvula_expansion: valvulaExpansion,
  tuberia_refrigerante: tuberiaRefrigerante,
  deshumidificador,
  vitrina,
  mural,
  arcon,
  abatidor,
  botellero,
  recibidor,
  separador_aceite: separadorAceite,
  filtro_deshidratador: filtroDeshidratador,
  visor_liquido: visorLiquido,
  valvula_solenoide: valvulaSolenoide,
  presostato,
  control_temperatura: controlTemperatura,
  consola_suelo: consolaSuelo,
  recuperador,
};

export function dibujarExtra(tipo, w, h, x0, y0, id, color, datos, mini) {
  const fn = MAPA[tipo];
  if (!fn) return null;
  return fn(w, h, x0, y0, id, datos, mini);
}

export const TIPOS_EXTRA = Object.keys(MAPA);