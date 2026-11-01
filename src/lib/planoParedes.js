// Tipos de pared y ajuste de medidas de una pared ya dibujada.

export const MATERIALES_PARED = [
  { id: 'ladrillo', etiqueta: 'Ladrillo', color: '#c2410c', espesor_mm: 110 },
  { id: 'bloque_hormigon', etiqueta: 'Bloque de hormigón', color: '#78716c', espesor_mm: 200 },
  { id: 'hormigon', etiqueta: 'Hormigón', color: '#57534e', espesor_mm: 200 },
  { id: 'cemento', etiqueta: 'Cemento / mortero', color: '#a8a29e', espesor_mm: 150 },
  { id: 'yeso', etiqueta: 'Yeso / tabique de yeso', color: '#e7e5e4', espesor_mm: 70 },
  { id: 'pladur', etiqueta: 'Pladur', color: '#cbd5e1', espesor_mm: 78 },
  { id: 'panel_sandwich', etiqueta: 'Panel sándwich', color: '#bae6fd', espesor_mm: 80 },
  { id: 'madera', etiqueta: 'Madera', color: '#b45309', espesor_mm: 80 },
  { id: 'cristal', etiqueta: 'Cristal', color: '#7dd3fc', espesor_mm: 20 },
  { id: 'otro', etiqueta: 'Otro', color: '#cbd5e1', espesor_mm: 100 },
];

export const materialDe = (w) => MATERIALES_PARED.find((x) => x.id === w?.material) || null;

/** Espesor en metros: el que tenga la pared, el de su material o 0,10 m. */
export function espesorPared(w) {
  const e = Number(w?.espesor_mm);
  if (Number.isFinite(e) && e > 0) return e / 1000;
  const mat = materialDe(w);
  return (mat ? mat.espesor_mm : 100) / 1000;
}

/** Longitud en metros. */
export const largoPared = (w, scale) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / scale;

/**
 * Cambia el largo de una pared moviendo su extremo final en su misma dirección.
 * Las paredes encadenadas que empezaban o acababan en ese punto lo siguen, para
 * que el contorno no se abra. Devuelve la nueva lista de paredes.
 */
export function cambiarLargoPared(walls, id, largoM, scale) {
  const w = walls.find((x) => x.id === id);
  if (!w || !(largoM > 0) || w.room_id) return walls;
  const actual = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  if (actual < 0.0001) return walls;
  const k = (largoM * scale) / actual;
  const nx = w.x1 + (w.x2 - w.x1) * k, ny = w.y1 + (w.y2 - w.y1) * k;
  const cerca = (x, y) => Math.hypot(x - w.x2, y - w.y2) < 1;
  return walls.map((p) => {
    if (p.id === id) return { ...p, x2: nx, y2: ny };
    if (p.room_id) return p;
    const o = { ...p };
    if (cerca(p.x1, p.y1)) { o.x1 = nx; o.y1 = ny; }
    if (cerca(p.x2, p.y2)) { o.x2 = nx; o.y2 = ny; }
    return o;
  });
}
