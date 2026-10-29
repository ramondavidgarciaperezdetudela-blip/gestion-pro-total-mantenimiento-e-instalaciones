import React, { useMemo } from 'react';

// Imagen realista (símbolo técnico) de una condensadora por aire, generada
// como referencia de estilo. Se usa tal cual para que el elemento del plano
// se vea como la máquina que se va a instalar, no como un icono genérico.
const IMG_CONDENSADORA_AIRE =
  'https://media.base44.com/images/public/6994f99700e8a842baf72997/00e8f6bc4_generated_2831fa93.png';

/**
 * PlanoSimbolo — dibuja cada equipo del plano como un símbolo vectorial
 * "realista" (con degradado, sombra y su silueta propia), no como una caja
 * plana con dos letras.
 *
 * Las condensadoras se diferencian por TIPO, no por un detalle pequeño:
 *  - aire axial      → caja con ventiladores axiales (aspas radiales)
 *  - aire centrífugo → caja con carcasa de caracol y salida lateral
 *  - agua            → cilindro horizontal (shell&tube) con bridas
 *  - evaporativa     → torre con rejilla de evaporación y cuenca de agua
 *  - seca / dry-cooler → batería de aletillas en V con ventiladores arriba
 *
 * Se dibuja con SVG (no imágenes): nítido a cualquier zoom, sin peso y sin
 * conexión. El mismo componente sirve para el lienzo y para la leyenda de la
 * paleta (modo `mini`).
 *
 * Props:
 *  - el:     elemento colocado (type, w_m, h_m, color, datos, label, glyph)
 *  - scale:  px por metro
 *  - selected / fromHere: resaltado de selección y origen de conexión
 *  - mini:   dibujo pequeño para la leyenda (sin texto ni sombra grande)
 */

// Colores base del "cuerpo" según la familia, para que el degradado no sea
// un gris plano sino el tono de la máquina real.
const CUERPO = {
  refrigeracion: ['#0e7490', '#155e75'],
  clima: ['#0e7490', '#0f766e'],
  ventilacion: ['#047857', '#065f46'],
  electrico: ['#b45309', '#92400e'],
  seguridad: ['#b91c1c', '#7f1d1d'],
  estructura: ['#6d28d9', '#4c1d95'],
};

function cuerpo(cat) { return CUERPO[cat] || ['#475569', '#334155']; }

// Un id estable por instancia para que los <defs> (degradado/sombra) no
// colisionen entre símbolos distintos del mismo lienzo.
function uid(el) {
  return (el?.id || 'sim').replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'sim';
}

export default function PlanoSimbolo({ el, scale = 50, selected = false, fromHere = false, mini = false }) {
  const w = Math.max(14, (el.w_m || 0.5) * scale);
  const h = Math.max(14, (el.h_m || 0.5) * scale);
  const x0 = -w / 2, y0 = -h / 2;
  const id = uid(el);
  const [c1, c2] = cuerpo(el.cat);
  const color = el.color || c1;
  const datos = el.datos || {};

  // El "grano" del degradado depende del tipo de condensadora, para que se
  // note a cuál pertenece aunque el color de la familia sea el mismo.
  const tipoCond = el.type;
  const defs = (
    <defs>
      <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c1} stopOpacity="0.95" />
        <stop offset="55%" stopColor={c2} stopOpacity="1" />
        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.92" />
      </linearGradient>
      <linearGradient id={`gt-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
        <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
      </linearGradient>
      <radialGradient id={`ac-${id}`} cx="0.5" cy="0.45" r="0.7">
        <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.9" />
        <stop offset="70%" stopColor="#64748b" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
      </radialGradient>
      {!mini && (
        <filter id={`sh-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy={Math.max(1.5, h * 0.06)} stdDeviation={Math.max(1, h * 0.05)} floodColor="#000" floodOpacity="0.35" />
        </filter>
      )}
    </defs>
  );

  const borde = fromHere ? '#00D4FF' : (selected ? '#fde047' : color);
  const grosor = selected || fromHere ? 2.5 : 1.6;

  const dibujo = useMemo(() => dibujar(tipoCond, w, h, x0, y0, id, color, datos, mini, el.glyph), [tipoCond, w, h, id, color, datos, mini, el.glyph]);

  return (
    <g>
      {defs}
      {/* Halo de selección / origen */}
      {(selected || fromHere) && !mini && (
        <rect x={x0 - 4} y={y0 - 4} width={w + 8} height={h + 8} rx={8}
          fill={fromHere ? '#00D4FF22' : '#fde04722'} stroke={borde} strokeWidth={1} strokeDasharray="3 3" />
      )}
      <g filter={mini ? undefined : `url(#sh-${id})`} stroke={borde} strokeWidth={grosor}>
        {dibujo}
      </g>
    </g>
  );
}

/* ─── Dibujos por tipo ──────────────────────────────────────────────────── */

function dibujar(tipo, w, h, x0, y0, id, color, datos, mini, glyph) {
  const cx = 0, cy = 0;
  switch (tipo) {
    case 'condensadora_aire':       return condAireAxial(w, h, x0, y0, id, datos, mini);
    case 'condensadora_centrifugo': return condAireCentrifugo(w, h, x0, y0, id, datos, mini);
    case 'condensadora_agua':       return condAgua(w, h, x0, y0, id, datos, mini);
    case 'condensadora_evaporativa':return condEvaporativa(w, h, x0, y0, id, datos, mini);
    case 'condensadora_seca':       return condSeca(w, h, x0, y0, id, datos, mini);
    case 'condensador':             return condAireAxial(w, h, x0, y0, id, datos, mini);
    case 'compresor':               return compresor(w, h, x0, y0, id, mini);
    case 'evaporador':              return evaporador(w, h, x0, y0, id, datos, mini);
    case 'grupo_frio':              return grupoFrio(w, h, x0, y0, id, mini);
    case 'central_frigorifica':     return centralFrio(w, h, x0, y0, id, mini);
    case 'camara_frigorifica':      return camara(w, h, x0, y0, id, datos, mini);
    case 'ventilador':
    case 'ventilador_extraccion':
    case 'ventilador_impulsion':    return ventilador(w, h, x0, y0, id, mini);
    case 'exterior_clima':           return unidadExterior(w, h, x0, y0, id, mini);
    case 'cassette':                return cassette(w, h, x0, y0, id, datos, mini);
    case 'conductos':                return unidadConductos(w, h, x0, y0, id, mini);
    case 'split_pared':              return splitPared(w, h, x0, y0, id, mini);
    case 'fancoil':                  return fancoil(w, h, x0, y0, id, mini);
    case 'cuadro_electrico':         return cuadro(w, h, x0, y0, id, mini);
    case 'rejilla_impulsion':        return rejilla(w, h, x0, y0, id, 'I', mini);
    case 'rejilla_retorno':          return rejilla(w, h, x0, y0, id, 'R', mini);
    case 'rejilla_extraccion':       return rejilla(w, h, x0, y0, id, 'E', mini);
    case 'boca_impulsion':           return boca(w, h, x0, y0, id, 'I', mini);
    case 'boca_retorno':             return boca(w, h, x0, y0, id, 'R', mini);
    case 'difusor_circular':         return difusorCircular(w, h, x0, y0, id, datos, mini);
    case 'difusor_lineal':           return difusorLineal(w, h, x0, y0, id, mini);
    case 'uvt':                      return uvt(w, h, x0, y0, id, mini);
    case 'compuerta_cortafuego':     return cortafuegos(w, h, x0, y0, id, mini);
    case 'silenciador':              return silenciador(w, h, x0, y0, id, mini);
    case 'caja_toma':                return plenum(w, h, x0, y0, id, mini);
    default:                         return generico(w, h, x0, y0, id, color, datos, mini, glyph);
  }
}

// Cuerpo 3D estándar: cara superior con degradado de luz + cara frontal.
function cuerpo3D(x0, y0, w, h, id, rx = 6) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx={rx} fill={`url(#g-${id})`} />
      {/* Brillo superior */}
      <rect x={x0 + 1} y={y0 + 1} width={w - 2} height={h * 0.42} rx={rx} fill={`url(#gt-${id})`} />
    </g>
  );
}

function aspas(cx, cy, r, n, id) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    out.push(
      <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
        stroke="#e2e8f0" strokeWidth={Math.max(1, r * 0.16)} strokeLinecap="round" />
    );
  }
  out.push(<circle key="h" cx={cx} cy={cy} r={r * 0.18} fill="#0f172a" />);
  return out;
}

// ── Condensadora por aire (axial): imagen técnica realista de la máquina ──
function condAireAxial(w, h, x0, y0, id, datos, mini) {
  const radio = Math.min(w, h) * 0.12;
  return (
    <g>
      <defs>
        <clipPath id={`clip-${id}`}>
          <rect x={x0} y={y0} width={w} height={h} rx={radio} />
        </clipPath>
      </defs>
      <image
        href={IMG_CONDENSADORA_AIRE}
        x={x0} y={y0} width={w} height={h}
        preserveAspectRatio="xMidYMid meet"
        clipPath={`url(#clip-${id})`}
      />
      <rect x={x0} y={y0} width={w} height={h} rx={radio} fill="none" stroke="#1F2D3D" strokeWidth="1.4" />
    </g>
  );
}

// ── Condensadora por aire (centrífugo): carcola de caracol + salida lateral ──
function condAireCentrifugo(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id)}
      {/* Caracol del centrífugo */}
      <circle cx={x0 + w * 0.36} cy={y0 + h * 0.5} r={h * 0.3} fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
      <circle cx={x0 + w * 0.36} cy={y0 + h * 0.5} r={h * 0.24} fill={`url(#ac-${id})`} />
      {aspas(x0 + w * 0.36, y0 + h * 0.5, h * 0.2, 6, id)}
      {/* Salida de aire conducido por el lado */}
      <rect x={x0 + w * 0.66} y={y0 + h * 0.32} width={w * 0.34} height={h * 0.36} rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
      {!mini && <line x1={x0 + w * 0.66} y1={y0 + h * 0.5} x2={x0 + w} y2={y0 + h * 0.5} stroke="#38bdf8" strokeWidth="1.4" markerEnd="" />}
    </g>
  );
}

// ── Condensadora por agua: cilindro horizontal (shell&tube) con bridas ──
function condAgua(w, h, x0, y0, id, datos, mini) {
  const rx = w * 0.4, ry = h * 0.36;
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id)}
      {/* Cuerpo cilíndrico horizontal */}
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
      <ellipse cx={0} cy={0} rx={rx * 0.92} ry={ry * 0.9} fill={`url(#g-${id})`} />
      {/* Tapas (bridas) a los lados */}
      <ellipse cx={x0 + w * 0.12} cy={0} rx={w * 0.08} ry={ry} fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
      <ellipse cx={x0 + w * 0.88} cy={0} rx={w * 0.08} ry={ry} fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
      {/* Tubos internos (rayitas) */}
      {!mini && [...Array(6)].map((_, i) => (
        <line key={i} x1={x0 + w * 0.2} y1={-ry * 0.7 + i * ry * 0.28} x2={x0 + w * 0.8} y2={-ry * 0.7 + i * ry * 0.28}
          stroke="#7dd3fc" strokeWidth="0.8" opacity="0.6" />
      ))}
      {/* Bocas de agua */}
      <circle cx={x0 + w * 0.5} cy={-ry * 1.02} r={Math.max(2, h * 0.08)} fill="#38bdf8" stroke="#0f172a" strokeWidth="0.8" />
    </g>
  );
}

// ── Condensadora evaporativa: torre con rejilla de evaporación y cuenca ──
function condEvaporativa(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id)}
      {/* Rejilla lateral de evaporación (celosía) */}
      {[...Array(6)].map((_, i) => (
        <line key={'r' + i} x1={x0 + w * 0.12 + i * (w * 0.76 / 5)} y1={y0 + h * 0.18} x2={x0 + w * 0.12 + i * (w * 0.76 / 5)} y2={y0 + h * 0.78}
          stroke="#cbd5e1" strokeWidth="1.2" opacity="0.8" />
      ))}
      {/* Ventilador superior */}
      <circle cx={0} cy={y0 + h * 0.22} r={h * 0.16} fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <circle cx={0} cy={y0 + h * 0.22} r={h * 0.13} fill={`url(#ac-${id})`} />
      {aspas(0, y0 + h * 0.22, h * 0.1, 6, id)}
      {/* Cuenca de agua abajo */}
      <rect x={x0 + w * 0.1} y={y0 + h * 0.82} width={w * 0.8} height={h * 0.1} rx="2" fill="#0ea5e9" stroke="#0f172a" strokeWidth="0.8" />
      {!mini && <text x={0} y={y0 + h * 0.89} textAnchor="middle" fontSize="6" fill="#e0f2fe">agua</text>}
    </g>
  );
}

// ── Condensadora seca (dry-cooler): batería de aletillas en V + ventiladores ──
function condSeca(w, h, x0, y0, id, datos, mini) {
  const nV = Math.max(2, parseInt(datos?.ventiladores) || 4);
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id)}
      {/* Batería en V: dos planos aletillados que suben al centro */}
      <polygon points={`${x0 + w * 0.08},${y0 + h * 0.8} ${x0 + w * 0.5},${y0 + h * 0.3} ${x0 + w * 0.92},${y0 + h * 0.8}`}
        fill="#1e293b" stroke="#64748b" strokeWidth="1" />
      {[...Array(5)].map((_, i) => (
        <line key={'v' + i} x1={x0 + w * 0.12 + i * (w * 0.18)} y1={y0 + h * 0.78} x2={x0 + w * 0.5} y2={y0 + h * 0.3 + i * (h * 0.1)}
          stroke="#94a3b8" strokeWidth="0.7" />
      ))}
      {[...Array(5)].map((_, i) => (
        <line key={'v2' + i} x1={x0 + w * 0.88 - i * (w * 0.18)} y1={y0 + h * 0.78} x2={x0 + w * 0.5} y2={y0 + h * 0.3 + i * (h * 0.1)}
          stroke="#94a3b8" strokeWidth="0.7" />
      ))}
      {/* Ventiladores arriba, en hilera */}
      {Array.from({ length: nV }).map((_, i) => {
        const fx = x0 + (w / (nV + 0.3)) * (i + 0.65);
        const r = Math.min(h * 0.12, w / (nV * 2.4));
        return (
          <g key={i}>
            <circle cx={fx} cy={y0 + h * 0.16} r={r} fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx={fx} cy={y0 + h * 0.16} r={r * 0.86} fill={`url(#ac-${id})`} />
            {aspas(fx, y0 + h * 0.16, r * 0.78, 5, id)}
          </g>
        );
      })}
    </g>
  );
}

// ── Compresor: cuerpo cilíndrico con la cabeza del motor ──
function compresor(w, h, x0, y0, id, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 10)}
      <ellipse cx={0} cy={0} rx={w * 0.32} ry={h * 0.4} fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
      <ellipse cx={0} cy={0} rx={w * 0.28} ry={h * 0.34} fill={`url(#g-${id})`} />
      {/* Cabeza del motor */}
      <rect x={-w * 0.12} y={y0 + h * 0.06} width={w * 0.24} height={h * 0.18} rx="2" fill="#334155" stroke="#cbd5e1" strokeWidth="0.8" />
      {/* Tubería de descarga */}
      <line x1={w * 0.28} y1={-h * 0.1} x2={w * 0.46} y2={-h * 0.28} stroke="#7dd3fc" strokeWidth="2.4" />
      <line x1={-w * 0.28} y1={-h * 0.1} x2={-w * 0.46} y2={-h * 0.28} stroke="#7dd3fc" strokeWidth="2.4" />
    </g>
  );
}

// ── Evaporador: caja con ventiladores y aletillas ──
function evaporador(w, h, x0, y0, id, datos, mini) {
  const nV = Math.max(1, parseInt(datos?.ventiladores) || 2);
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id)}
      {/* Aletillas del intercambiador */}
      {!mini && [...Array(8)].map((_, i) => (
        <line key={i} x1={x0 + 3 + i * (w - 6) / 7} y1={y0 + 3} x2={x0 + 3 + i * (w - 6) / 7} y2={y0 + h * 0.5}
          stroke="#94a3b8" strokeWidth="0.7" opacity="0.7" />
      ))}
      {Array.from({ length: nV }).map((_, i) => {
        const fx = x0 + (w / (nV + 0.3)) * (i + 0.65);
        const r = Math.min(h * 0.18, w / (nV * 2.4));
        return (
          <g key={i}>
            <circle cx={fx} cy={y0 + h * 0.72} r={r} fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx={fx} cy={y0 + h * 0.72} r={r * 0.86} fill={`url(#ac-${id})`} />
            {aspas(fx, y0 + h * 0.72, r * 0.78, 5, id)}
          </g>
        );
      })}
    </g>
  );
}

// ── Grupo de frío / central frigorífica: bloque compacto con compresor + cond ──
function maquinaCompacta(w, h, x0, y0, id, mini, etiqueta) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 8)}
      {/* Compartimento compresor */}
      <rect x={x0 + w * 0.06} y={y0 + h * 0.14} width={w * 0.4} height={h * 0.6} rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
      <ellipse cx={x0 + w * 0.26} cy={y0 + h * 0.44} rx={w * 0.13} ry={h * 0.2} fill={`url(#g-${id})`} />
      {/* Compartimento condensador con ventilador */}
      <rect x={x0 + w * 0.54} y={y0 + h * 0.14} width={w * 0.4} height={h * 0.6} rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
      <circle cx={x0 + w * 0.74} cy={y0 + h * 0.44} r={h * 0.18} fill={`url(#ac-${id})`} />
      {aspas(x0 + w * 0.74, y0 + h * 0.44, h * 0.16, 5, id)}
      {!mini && etiqueta && <text x={0} y={y0 + h - 3} textAnchor="middle" fontSize="6" fill="#cbd5e1">{etiqueta}</text>}
    </g>
  );
}
function grupoFrio(w, h, x0, y0, id, mini) { return maquinaCompacta(w, h, x0, y0, id, mini, 'grupo'); }
function centralFrio(w, h, x0, y0, id, mini) { return maquinaCompacta(w, h, x0, y0, id, mini, 'central'); }

// ── Cámara frigorífica: habitación panelada con puerta ──
function camara(w, h, x0, y0, id, datos, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="3" fill={`url(#g-${id})`} stroke="#0ea5e9" strokeWidth="1.6" />
      {/* Paneles (juntas verticales) */}
      {[0.25, 0.5, 0.75].map((p, i) => (
        <line key={'v' + i} x1={x0 + w * p} y1={y0} x2={x0 + w * p} y2={y0 + h} stroke="#0f172a" strokeWidth="0.8" opacity="0.5" />
      ))}
      {[0.33, 0.66].map((p, i) => (
        <line key={'h' + i} x1={x0} y1={y0 + h * p} x2={x0 + w} y2={y0 + h * p} stroke="#0f172a" strokeWidth="0.8" opacity="0.4" />
      ))}
      {/* Puerta en una esquina */}
      <rect x={x0 + w * 0.78} y={y0 - 3} width={w * 0.18} height={6} rx="1" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.8" />
      {/* Símbolo de frío (copo) */}
      {!mini && <text x={0} y={4} textAnchor="middle" fontSize={Math.min(16, h * 0.22)} fill="#e0f2fe">❄</text>}
    </g>
  );
}

// ── Ventilador: círculo con aspas ──
function ventilador(w, h, x0, y0, id, mini) {
  const r = Math.min(w, h) * 0.38;
  return (
    <g>
      <circle cx={0} cy={0} r={r + 2} fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <circle cx={0} cy={0} r={r} fill={`url(#ac-${id})`} />
      {aspas(0, 0, r * 0.86, 6, id)}
    </g>
  );
}

// ── Unidad exterior de climatización ──
function unidadExterior(w, h, x0, y0, id, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 4)}
      <circle cx={x0 + w * 0.32} cy={0} r={h * 0.32} fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
      <circle cx={x0 + w * 0.32} cy={0} r={h * 0.28} fill={`url(#ac-${id})`} />
      {aspas(x0 + w * 0.32, 0, h * 0.24, 5, id)}
      {!mini && [...Array(5)].map((_, i) => (
        <line key={i} x1={x0 + w * 0.6} y1={y0 + 3 + i * (h - 6) / 4} x2={x0 + w - 3} y2={y0 + 3 + i * (h - 6) / 4}
          stroke="#94a3b8" strokeWidth="0.6" />
      ))}
    </g>
  );
}

// ── Cassette: cuadrado con salidas de aire por sus 4 lados ──
function cassette(w, h, x0, y0, id, datos, mini) {
  const vias = datos?.bocas === 'una' ? 1 : datos?.bocas === 'dos' ? 2 : 4;
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="3" fill={`url(#g-${id})`} stroke="#0f172a" strokeWidth="1" />
      <rect x={x0 + w * 0.22} y={y0 + h * 0.22} width={w * 0.56} height={h * 0.56} rx="2" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
      {[vias >= 1, vias >= 2, vias >= 3, vias >= 4].map((on, i) => {
        if (!on) return null;
        const ang = (i * Math.PI) / 2;
        return <line key={i} x1={0} y1={0} x2={Math.cos(ang) * w * 0.46} y2={Math.sin(ang) * h * 0.46}
          stroke="#38bdf8" strokeWidth="1.6" markerEnd="" />;
      })}
    </g>
  );
}

// ── Unidad de conductos ──
function unidadConductos(w, h, x0, y0, id, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 4)}
      <rect x={x0 - w * 0.18} y={y0 + h * 0.3} width={w * 0.18} height={h * 0.4} fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
      <rect x={x0 + w} y={y0 + h * 0.3} width={w * 0.18} height={h * 0.4} fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
      <circle cx={x0 + w * 0.5} cy={0} r={h * 0.22} fill={`url(#ac-${id})`} />
      {aspas(x0 + w * 0.5, 0, h * 0.2, 5, id)}
    </g>
  );
}

// ── Split de pared ──
function splitPared(w, h, x0, y0, id, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx={h * 0.4} fill={`url(#g-${id})`} stroke="#0f172a" strokeWidth="1" />
      <rect x={x0 + 2} y={y0 + 2} width={w - 4} height={h * 0.4} rx={h * 0.3} fill={`url(#gt-${id})`} />
      {!mini && [...Array(5)].map((_, i) => (
        <line key={i} x1={x0 + w * 0.15 + i * w * 0.16} y1={y0 + h * 0.62} x2={x0 + w * 0.15 + i * w * 0.16} y2={y0 + h * 0.82}
          stroke="#38bdf8" strokeWidth="0.8" />
      ))}
    </g>
  );
}

// ── Fancoil ──
function fancoil(w, h, x0, y0, id, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="3" fill={`url(#g-${id})`} stroke="#0f172a" strokeWidth="1" />
      <rect x={x0 + w * 0.1} y={y0 + h * 0.25} width={w * 0.8} height={h * 0.5} rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x0 + w * (0.3 + i * 0.2)} cy={y0 + h * 0.5} r={h * 0.12} fill={`url(#ac-${id})`} />
      ))}
    </g>
  );
}

// ── Cuadro eléctrico ──
function cuadro(w, h, x0, y0, id, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 3)}
      <rect x={x0 + w * 0.15} y={y0 + h * 0.2} width={w * 0.7} height={h * 0.6} fill="#1e293b" stroke="#fbbf24" strokeWidth="0.8" />
      {!mini && [...Array(4)].map((_, i) => (
        <rect key={i} x={x0 + w * (0.2 + i * 0.15)} y={y0 + h * 0.3} width={w * 0.1} height={h * 0.4} fill="#fbbf24" opacity="0.8" />
      ))}
      <circle cx={x0 + w * 0.88} cy={y0 + h * 0.5} r={h * 0.08} fill="#22c55e" />
    </g>
  );
}

// ── Rejilla: marco con lamas + flecha de sentido (impulsión/retorno/extracción) ──
function rejilla(w, h, x0, y0, id, sentido, mini) {
  const col = sentido === 'I' ? '#38bdf8' : sentido === 'E' ? '#f97316' : '#94a3b8';
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#1e293b" stroke={col} strokeWidth="1.4" />
      {[...Array(5)].map((_, i) => (
        <line key={i} x1={x0 + 3} y1={y0 + 3 + i * (h - 6) / 4} x2={x0 + w - 3} y2={y0 + 3 + i * (h - 6) / 4} stroke="#cbd5e1" strokeWidth="1" />
      ))}
      {!mini && (
        <text x={0} y={y0 + h + 8} textAnchor="middle" fontSize="7" fill={col} fontWeight="700">
          {sentido === 'I' ? '↑IMP' : sentido === 'E' ? '↓EXT' : '↕RET'}
        </text>
      )}
    </g>
  );
}

// ── Boca de impulsión/retorno: círculo con cruz ──
function boca(w, h, x0, y0, id, sentido, mini) {
  const col = sentido === 'I' ? '#38bdf8' : '#94a3b8';
  const r = Math.min(w, h) * 0.4;
  return (
    <g>
      <circle cx={0} cy={0} r={r + 1} fill="#1e293b" stroke={col} strokeWidth="1.4" />
      <circle cx={0} cy={0} r={r * 0.7} fill={col} opacity="0.25" />
      <line x1={-r * 0.6} y1={0} x2={r * 0.6} y2={0} stroke={col} strokeWidth="1.2" />
      <line x1={0} y1={-r * 0.6} x2={0} y2={r * 0.6} stroke={col} strokeWidth="1.2" />
    </g>
  );
}

// ── Difusor circular: anillo con bocas ──
function difusorCircular(w, h, x0, y0, id, datos, mini) {
  const r = Math.min(w, h) * 0.4;
  const n = parseInt(datos?.bocas) || 4;
  return (
    <g>
      <circle cx={0} cy={0} r={r + 1} fill="#1e293b" stroke="#34d399" strokeWidth="1.4" />
      <circle cx={0} cy={0} r={r * 0.45} fill="#0f172a" />
      {Array.from({ length: n }).map((_, i) => {
        const a = (i * 2 * Math.PI) / n;
        return <line key={i} x1={Math.cos(a) * r * 0.45} y1={Math.sin(a) * r * 0.45} x2={Math.cos(a) * r} y2={Math.sin(a) * r}
          stroke="#34d399" strokeWidth="1.2" />;
      })}
    </g>
  );
}

// ── Difusor lineal: tira con ranuras ──
function difusorLineal(w, h, x0, y0, id, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="1" fill="#1e293b" stroke="#34d399" strokeWidth="1.2" />
      {[...Array(6)].map((_, i) => (
        <line key={i} x1={x0 + 4 + i * (w - 8) / 5} y1={y0 + 3} x2={x0 + 4 + i * (w - 8) / 5} y2={y0 + h - 3} stroke="#34d399" strokeWidth="0.9" />
      ))}
    </g>
  );
}

// ── UVT (unidad de tratamiento de aire) ──
function uvt(w, h, x0, y0, id, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 3)}
      {/* Secciones: filtro / batería / ventilador */}
      <rect x={x0 + w * 0.08} y={y0 + h * 0.2} width={w * 0.22} height={h * 0.6} fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
      <rect x={x0 + w * 0.38} y={y0 + h * 0.2} width={w * 0.22} height={h * 0.6} fill="#0ea5e9" stroke="#0f172a" strokeWidth="0.8" opacity="0.8" />
      <circle cx={x0 + w * 0.74} cy={y0 + h * 0.5} r={h * 0.26} fill={`url(#ac-${id})`} />
      {aspas(x0 + w * 0.74, y0 + h * 0.5, h * 0.22, 5, id)}
    </g>
  );
}

// ── Compuerta cortafuegos ──
function cortafuegos(w, h, x0, y0, id, mini) {
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="#7f1d1d" stroke="#fbbf24" strokeWidth="1.4" />
      <line x1={x0} y1={y0 + h} x2={x0 + w} y2={y0} stroke="#fbbf24" strokeWidth="1.6" />
      <text x={0} y={4} textAnchor="middle" fontSize={Math.min(12, h * 0.4)} fill="#fbbf24" fontWeight="700">CF</text>
    </g>
  );
}

// ── Silenciador: cilindro con núcleo perforado ──
function silenciador(w, h, x0, y0, id, mini) {
  return (
    <g>
      <rect x={x0} y={y0 + h * 0.1} width={w} height={h * 0.8} rx={h * 0.4} fill={`url(#g-${id})`} stroke="#0f172a" strokeWidth="1" />
      <line x1={x0 + 3} y1={0} x2={x0 + w - 3} y2={0} stroke="#34d399" strokeWidth="1.6" strokeDasharray="3 2" />
      {!mini && [...Array(6)].map((_, i) => (
        <circle key={i} cx={x0 + w * (0.15 + i * 0.14)} cy={0} r={1.4} fill="#0f172a" />
      ))}
    </g>
  );
}

// ── Caja / plenum ──
function plenum(w, h, x0, y0, id, mini) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 3)}
      <line x1={x0 + w * 0.2} y1={y0 + h * 0.2} x2={x0 + w * 0.8} y2={y0 + h * 0.8} stroke="#34d399" strokeWidth="1" opacity="0.6" />
      <line x1={x0 + w * 0.2} y1={y0 + h * 0.8} x2={x0 + w * 0.8} y2={y0 + h * 0.2} stroke="#34d399" strokeWidth="1" opacity="0.6" />
    </g>
  );
}

// ── Genérico: caja 3D con el glifo del catálogo ──
function generico(w, h, x0, y0, id, color, datos, mini, glyph) {
  return (
    <g>
      {cuerpo3D(x0, y0, w, h, id, 5)}
      {!mini && glyph && (
        <text x={0} y={4} textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.min(16, Math.min(w, h) / 2.2)} fill="#e2e8f0" fontWeight="700">
          {glyph}
        </text>
      )}
    </g>
  );
}