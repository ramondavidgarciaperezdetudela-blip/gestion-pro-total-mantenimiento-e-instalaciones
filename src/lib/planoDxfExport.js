// Exportación del plano a CAD (DXF R12 / AutoCAD) por apartados.
//
// Cada apartado (plano frigorífico, plano eléctrico, cálculos y medidas) va en
// su propia HOJA, en milímetros de papel, con marco, cajetín y escala 1:N
// normalizada; las hojas se colocan una al lado de otra, en vertical u
// horizontal según se elija, y cada apartado tiene sus propias capas.
//
// Para que el CAD y el PDF salgan idénticos, se reutiliza el mismo generador
// (planoPaquete.js) con un "documento" que, en vez de dibujar un PDF, escribe
// entidades DXF (LINE, POLYLINE, CIRCLE, TEXT). Lo abren AutoCAD, LibreCAD,
// FreeCAD, QCAD y prácticamente cualquier CAD del mercado.
import { construirPaquetePDF, opcionesPorDefecto, nombreArchivo, SECCIONES, prismas3D } from '@/lib/planoPaquete';

const SEPARACION_HOJAS = 40; // mm entre hojas

// Colores índice AutoCAD aproximados.
const ACI = [
  [1, [255, 0, 0]], [2, [255, 255, 0]], [3, [0, 160, 0]], [4, [0, 200, 220]], [5, [0, 0, 255]],
  [6, [200, 0, 200]], [7, [0, 0, 0]], [8, [128, 128, 128]], [9, [192, 192, 192]], [30, [255, 127, 0]],
];
function aci(rgb) {
  let mejor = 7, d0 = Infinity;
  ACI.forEach(([i, c]) => {
    const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
    if (d < d0) { d0 = d; mejor = i; }
  });
  return mejor;
}
const aRgb = (a) => {
  if (a.length === 1) return [a[0], a[0], a[0]];
  if (a.length >= 3) return [a[0], a[1], a[2]];
  return [0, 0, 0];
};

const LIMPIEZA = { '→': '->', '←': '<-', '·': '-', '—': '-', '–': '-', '×': 'x', '€': 'EUR', '²': '2', '³': '3', 'º': 'o', '°': ' grados', '≥': '>=', '≤': '<=', 'Ø': 'D', 'ø': 'd', '“': '"', '”': '"', '’': "'", '‘': "'" };
/** DXF R12 es ASCII: se quitan acentos y símbolos para que se lea en cualquier CAD. */
export function textoAscii(t) {
  return String(t ?? '')
    .replace(/[→←·—–×€²³º°≥≤Øø“”’‘]/g, (c) => LIMPIEZA[c])
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '');
}
const num = (n) => Number(Number(n).toFixed(3)).toString();
const par = (c, v) => `${c}\n${v}\n`;

/** Documento con la misma interfaz que jsPDF (la parte que usa planoPaquete) pero que escribe DXF. */
export function crearDocDXF({ format: [corto, largo], orientation }) {
  const paginas = [];
  const capas = new Map(); // nombre → color
  let actual = null;
  let apartado = 'PLANO';
  let tam = 8, color = [0, 0, 0], colorLinea = [0, 0, 0], escalaEscritura = 1;
  const dims = (o) => (o === 'portrait' ? { w: corto, h: largo } : { w: largo, h: corto });
  const nueva = (o) => {
    const { w, h } = dims(o);
    const ox = paginas.reduce((a, q) => a + q.w + SEPARACION_HOJAS, 0);
    actual = { w, h, ox, ents: [], apartado };
    paginas.push(actual);
  };
  nueva(orientation);

  const capa = (sufijo = '') => {
    const n = `${apartado}${sufijo}`;
    if (!capas.has(n)) capas.set(n, 7);
    return n;
  };
  const Y = (y) => actual.h - y; // el CAD tiene el eje Y hacia arriba
  const X = (x) => x + actual.ox; // las hojas van una al lado de otra

  const api = {
    internal: { pageSize: null },
    apartado(id) {
      apartado = { frigorifico: 'FRIGORIFICO', electrico: 'ELECTRICO', calculos: 'CALCULOS' }[id] || String(id).toUpperCase();
      actual.apartado = apartado;
    },
    addPage(formato, o) { nueva(o === 'portrait' ? 'portrait' : 'landscape'); return api; },
    getNumberOfPages: () => paginas.length,
    setPage(n) { actual = paginas[n - 1]; return api; },
    setFontSize(s) { tam = s; return api; },
    setFont() { return api; },
    setTextColor(...a) { color = aRgb(a); return api; },
    setDrawColor(...a) { colorLinea = aRgb(a); return api; },
    setFillColor() { return api; },
    setLineWidth() { return api; },
    setLineDash() { return api; },
    autoPrint() { return api; },
    addImage() { return api; },
    splitTextToSize(t, ancho) {
      const alto = tam * 0.3528;
      const maxChars = Math.max(4, Math.floor(ancho / (alto * 0.52)));
      const out = [];
      String(t).split('\n').forEach((parrafo) => {
        let linea = '';
        parrafo.split(/\s+/).forEach((pal) => {
          if (!linea) linea = pal;
          else if ((linea + ' ' + pal).length <= maxChars) linea += ' ' + pal;
          else { out.push(linea); linea = pal; }
        });
        out.push(linea);
      });
      return out;
    },
    line(x1, y1, x2, y2) {
      actual.ents.push(par(0, 'LINE') + par(8, capa()) + par(62, aci(colorLinea)) + par(10, num(X(x1))) + par(20, num(Y(y1))) + par(30, 0) + par(11, num(X(x2))) + par(21, num(Y(y2))) + par(31, 0));
      return api;
    },
    rect(x, y, w, h) {
      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      polilinea(pts, true);
      return api;
    },
    circle(x, y, r) {
      actual.ents.push(par(0, 'CIRCLE') + par(8, capa()) + par(62, aci(colorLinea)) + par(10, num(X(x))) + par(20, num(Y(y))) + par(30, 0) + par(40, num(r)));
      return api;
    },
    lines(segs, x, y, escala = [1, 1], estilo, cerrada) {
      const [sx, sy] = escala;
      const pts = [[x, y]];
      let cx = x, cy = y;
      segs.forEach((s) => {
        if (s.length >= 6) { cx += s[4] * sx; cy += s[5] * sy; } else { cx += s[0] * sx; cy += s[1] * sy; }
        pts.push([cx, cy]);
      });
      polilinea(pts, !!cerrada);
      return api;
    },
    text(t, x, y, op = {}) {
      const lineas = Array.isArray(t) ? t : [t];
      const alto = tam * 0.3528;
      lineas.forEach((l, i) => {
        const tx = textoAscii(l);
        if (!tx.trim()) return;
        const h = op.align === 'center' ? 1 : op.align === 'right' ? 2 : 0;
        const v = op.baseline === 'middle' ? 2 : 0;
        const yy = Y(y + i * alto * 1.3);
        let e = par(0, 'TEXT') + par(8, capa('_TEXTO')) + par(62, aci(color))
          + par(10, num(X(x))) + par(20, num(yy)) + par(30, 0) + par(40, num(alto)) + par(1, tx);
        if (h || v) e += par(72, h) + par(11, num(X(x))) + par(21, num(yy)) + par(31, 0) + par(73, v);
        actual.ents.push(e);
      });
      return api;
    },
    /**
     * Modelo 3D REAL: cada prisma como 6 caras 3DFACE, en milímetros reales (1:1),
     * a la derecha de las hojas. Y hacia arriba, como en el plano visto desde arriba.
     */
    modelo3D(cuerpos) {
      if (!cuerpos.length) return 0;
      const x0 = paginas.reduce((a, q) => a + q.w + SEPARACION_HOJAS, 0) + 2000;
      const minX = Math.min(...cuerpos.flatMap((q) => q.base.map((b) => b[0])));
      const P = (b, z) => [x0 + (b[0] - minX) * 1000, -b[1] * 1000, z * 1000];
      const cara = (L, col, a, b, c, d) => {
        let e = par(0, '3DFACE') + par(8, L) + par(62, col);
        [a, b, c, d].forEach((p, i) => { e += par(10 + i, num(p[0])) + par(20 + i, num(p[1])) + par(30 + i, num(p[2])); });
        modelo.push(e);
      };
      const modelo = api.modelo = api.modelo || [];
      cuerpos.forEach((q) => {
        const L = q.tipo === 'pared' ? 'VISTA3D_PAREDES' : 'VISTA3D_EQUIPOS';
        if (!capas.has(L)) capas.set(L, 7);
        const col = q.tipo === 'pared' ? (q.camara ? (q.negativa ? 1 : 5) : 8) : aci(q.rgb);
        const A = q.base.map((b) => P(b, q.z0)), B = q.base.map((b) => P(b, q.z1));
        cara(L, col, A[0], A[1], A[2], A[3]); cara(L, col, B[0], B[1], B[2], B[3]);
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; cara(L, col, A[i], A[j], B[j], B[i]); }
      });
      return cuerpos.length;
    },
    capas, paginas,
  };
  Object.defineProperty(api.internal, 'pageSize', { get: () => ({ width: actual.w, height: actual.h, getWidth: () => actual.w, getHeight: () => actual.h }) });

  function polilinea(pts, cerrada) {
    const L = capa();
    let e = par(0, 'POLYLINE') + par(8, L) + par(62, aci(colorLinea)) + par(66, 1) + par(10, 0) + par(20, 0) + par(30, 0) + par(70, cerrada ? 1 : 0);
    pts.forEach(([px, py]) => { e += par(0, 'VERTEX') + par(8, L) + par(10, num(X(px))) + par(20, num(Y(py))) + par(30, 0); });
    e += par(0, 'SEQEND') + par(8, L);
    actual.ents.push(e);
  }

  /** Texto DXF final con las hojas una al lado de otra. */
  api.salida = () => {
    const x0 = paginas.reduce((acc, p) => acc + p.w + SEPARACION_HOJAS, 0);
    const ents = paginas.flatMap((p) => p.ents);
    const nombres = [...capas.keys()];
    const tablas = par(0, 'SECTION') + par(2, 'TABLES')
      + par(0, 'TABLE') + par(2, 'LTYPE') + par(70, 1)
      + par(0, 'LTYPE') + par(2, 'CONTINUOUS') + par(70, 0) + par(3, 'Solid line') + par(72, 65) + par(73, 0) + par(40, 0)
      + par(0, 'ENDTAB')
      + par(0, 'TABLE') + par(2, 'LAYER') + par(70, nombres.length + 1)
      + par(0, 'LAYER') + par(2, '0') + par(70, 0) + par(62, 7) + par(6, 'CONTINUOUS')
      + nombres.map((n) => par(0, 'LAYER') + par(2, n) + par(70, 0) + par(62, 7) + par(6, 'CONTINUOUS')).join('')
      + par(0, 'ENDTAB') + par(0, 'ENDSEC');
    const cabecera = par(0, 'SECTION') + par(2, 'HEADER')
      + par(9, '$ACADVER') + par(1, 'AC1009')
      + par(9, '$INSUNITS') + par(70, 4) // milímetros
      + par(9, '$EXTMIN') + par(10, 0) + par(20, 0) + par(30, 0)
      + par(9, '$EXTMAX') + par(10, num(x0)) + par(20, num(Math.max(...paginas.map((p) => p.h)))) + par(30, 0)
      + par(0, 'ENDSEC');
    return cabecera + tablas + par(0, 'SECTION') + par(2, 'ENTITIES') + ents.join('') + (api.modelo || []).join('') + par(0, 'ENDSEC') + par(0, 'EOF');
  };
  return api;
}

/** Devuelve el texto DXF del plano, con las hojas por apartados elegidas. */
export function construirDXF(datos, opciones = opcionesPorDefecto()) {
  let doc = null;
  const cad = new Set(SECCIONES.filter((s) => s.cad).map((s) => s.id));
  const secciones = (opciones.secciones || []).filter((s) => cad.has(s.id));
  construirPaquetePDF(datos, { ...opciones, secciones, soloCad: true, fabrica: (o) => (doc = crearDocDXF(o)) });
  // La vista 3D en CAD = hoja isométrica (ya añadida arriba) + modelo 3D real.
  const cuerpos3d = secciones.some((s) => s.id === 'vista3d') ? doc.modelo3D(prismas3D({ ...datos, plan: datos.plan || {} })) : 0;
  return { texto: doc.salida(), hojas: doc.paginas.length, capas: [...doc.capas.keys()], cuerpos3d };
}

function descargar(texto, nombre) {
  const blob = new Blob([texto], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Descarga el .dxf por hojas. `datos` = {plan, elements, walls, connections, empresa, presupuesto}. */
export function exportarDXFPorHojas(datos, opciones) {
  const r = construirDXF(datos, opciones);
  descargar(r.texto, nombreArchivo(datos.plan, 'dxf'));
  return r;
}

/** Compatibilidad con la llamada antigua. */
export function exportarDXF(plan, elements, walls, connections, empresa = {}) {
  return exportarDXFPorHojas({ plan, elements, walls, connections, empresa });
}
