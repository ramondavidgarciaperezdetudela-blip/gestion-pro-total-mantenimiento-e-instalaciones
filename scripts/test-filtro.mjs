// Pruebas del cálculo del filtro deshidratador (src/lib/filtro.js).
import { calcularFiltro, avisosFiltro, tablaTubos, tuboSugerido, valorarVelocidad, REFERENCIA_CATALOGO, CASOS_FILTRO, MONTAJE_FILTRO } from '../src/lib/filtro.js';
import { TUBOS_COBRE, seccionInterior } from '../src/lib/tubosCobre.js';

let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

const BASE = { gas: 'R-134a', Te: -10, Tc: 40, subenf: 5, recal: 0, potenciaW: 3000 };

console.log('1. Efecto frigorífico y densidad frente a CoolProp (valores calculados fuera del programa)');
// [gas, Te, Tc, subenf, q0 kJ/kg (sin recalentamiento), densidad del líquido kg/m³, tolerancia]
const REF = [
  ['R-134a', -10, 40, 5, 143.658, 1167.50, 0.004],
  ['R-32', 5, 45, 5, 240.494, 893.04, 0.004],
  ['R-290', -10, 40, 5, 270.814, 476.10, 0.004],
  ['R-410A', 5, 45, 5, 156.491, 975.72, 0.008],
];
for (const [gas, Te, Tc, sub, q, rho, tol] of REF) {
  const r = calcularFiltro({ gas, Te, Tc, subenf: sub, recal: 0, potenciaW: 2000 });
  ok(r.ok, `${gas}: calcula`, r.error);
  if (!r.ok) continue;
  ok(rel(r.qEfecto, q, tol), `${gas}: efecto frigorífico ${q} kJ/kg`, String(r.qEfecto));
  ok(rel(r.rho, rho, tol), `${gas}: densidad del líquido ${rho} kg/m³`, String(r.rho));
}

console.log('2. Identidades del caudal');
{
  const r = calcularFiltro({ ...BASE, idMm: 7.9 });
  ok(rel(r.mdot, 3000 / (r.qEfecto * 1000), 1e-12), 'ṁ = potencia / efecto frigorífico');
  ok(rel(r.caudalLmin, (r.mdot / r.rho) * 1000 * 60, 1e-12), 'caudal volumétrico = ṁ/ρ');
  ok(rel(r.velocidad * seccionInterior(7.9), r.mdot / r.rho, 1e-12), 'continuidad: v·A = ṁ/ρ');
  const r2 = calcularFiltro({ ...BASE, potenciaW: 6000, idMm: 7.9 });
  ok(rel(r2.mdot, 2 * r.mdot, 1e-12) && rel(r2.velocidad, 2 * r.velocidad, 1e-12), 'doble potencia → doble caudal y velocidad');
  const r3 = calcularFiltro({ ...BASE, idMm: 11.07 });
  ok(r3.velocidad < r.velocidad, 'un tubo mayor baja la velocidad');
}

console.log('3. Caída de presión del filtro');
{
  // Mismas condiciones que las del catálogo → la caída es la del catálogo
  const cat = { Q: 3500, dp: 0.07, TeRef: -15, TliqRef: 30 };
  const r = calcularFiltro({ gas: 'R-134a', Te: -15, Tc: 35, subenf: 5, recal: 0, potenciaW: 3500, catalogo: cat });
  ok(rel(r.dpFiltro, 0.07, 0.003), 'en las condiciones del catálogo y a su capacidad: ΔP = ΔP del catálogo', String(r.dpFiltro));
  ok(rel(r.cargaFiltro, 1, 0.003), 'trabaja al 100 % de su caudal nominal', String(r.cargaFiltro));
  // Ley cuadrática
  const a = calcularFiltro({ ...BASE, catalogo: cat, potenciaW: 2000 });
  const b = calcularFiltro({ ...BASE, catalogo: cat, potenciaW: 4000 });
  ok(rel(b.dpFiltro / a.dpFiltro, 4, 1e-9), 'doble caudal → cuádruple caída de presión');
  // Capacidad de catálogo mayor → menos caída
  const grande = calcularFiltro({ ...BASE, catalogo: { ...cat, Q: 7000 } });
  const peq = calcularFiltro({ ...BASE, catalogo: { ...cat, Q: 3500 } });
  ok(rel(peq.dpFiltro / grande.dpFiltro, 4, 1e-9), 'filtro de doble capacidad → cuarta parte de caída');
  // Otra caída de presión de catálogo escala linealmente
  const dp2 = calcularFiltro({ ...BASE, catalogo: { ...cat, dp: 0.14 } });
  ok(rel(dp2.dpFiltro / peq.dpFiltro, 2, 1e-9), 'caída de presión de catálogo doble → caída doble');
  // Líquido más caliente (menos denso) → más caída
  const cal = calcularFiltro({ ...BASE, Tc: 50, catalogo: cat });
  const fri = calcularFiltro({ ...BASE, Tc: 30, catalogo: cat });
  ok(cal.rho < fri.rho, 'el líquido caliente es menos denso');
  ok(cal.dpFiltro > fri.dpFiltro, 'a igual caudal másico el líquido caliente (menos denso) pierde más presión');
}

console.log('4. Capacidad de catálogo mínima');
{
  const cat = { dp: 0.07, TeRef: -15, TliqRef: 30 };
  for (const obj of [0.03, 0.07, 0.1]) {
    const r = calcularFiltro({ ...BASE, catalogo: { ...cat, Q: 1000 }, dpObjetivo: obj });
    const q = r.capacidadMinimaW;
    const r2 = calcularFiltro({ ...BASE, catalogo: { ...cat, Q: q }, dpObjetivo: obj });
    ok(rel(r2.dpFiltro, obj, 1e-9), `con la capacidad mínima la caída es exactamente el objetivo (${obj} bar)`, String(r2.dpFiltro));
  }
  const sin = calcularFiltro(BASE); // sin catálogo: también da la capacidad mínima
  ok(sin.capacidadMinimaW > 0 && sin.dpFiltro === undefined, 'sin catálogo no hay caída de presión, pero sí capacidad mínima');
  const r1 = calcularFiltro({ ...BASE, potenciaW: 2000 }), r2 = calcularFiltro({ ...BASE, potenciaW: 4000 });
  ok(rel(r2.capacidadMinimaW / r1.capacidadMinimaW, 2, 1e-9), 'la capacidad mínima es proporcional a la potencia');
  ok(REFERENCIA_CATALOGO.dp === 0.07 && REFERENCIA_CATALOGO.TeRef === -15 && REFERENCIA_CATALOGO.TliqRef === 30, 'condiciones de catálogo por defecto: 0,07 bar, −15 °C, 30 °C');
}

console.log('5. Margen de subenfriamiento y vapor antes de la válvula');
{
  const cat = { Q: 3500, dp: 0.07, TeRef: -15, TliqRef: 30 };
  const r = calcularFiltro({ ...BASE, catalogo: cat });
  ok(r.margenBar > 1.1 && r.margenBar < 1.5, 'R-134a con 5 K: unos 1,3 bar de margen', String(r.margenBar));
  ok(!r.hayVapor && r.valoracion === 'ok', 'sin desnivel: no hay vapor');
  ok(rel(calcularFiltro({ ...BASE, catalogo: cat, desnivel: 3 }).dpEstatica, (r.rho * 9.80665 * 3) / 1e5, 1e-12), 'caída por altura = ρ·g·h');
  const alto = calcularFiltro({ ...BASE, catalogo: cat, desnivel: 15 });
  ok(alto.hayVapor && alto.valoracion === 'mal', '15 m de subida con 5 K de subenfriamiento: hierve', String(alto.dpTotal));
  const sub0 = calcularFiltro({ ...BASE, subenf: 0, catalogo: cat });
  ok(sub0.hayVapor, 'sin subenfriamiento cualquier pérdida produce vapor');
  const intermedio = calcularFiltro({ ...BASE, catalogo: cat, dpOtros: r.margenBar * 0.6 });
  ok(!intermedio.hayVapor && intermedio.valoracion === 'justo', 'consumir más de la mitad del margen: justo');
  ok(rel(intermedio.dpTotal, intermedio.dpFiltro + intermedio.dpOtros, 1e-12), 'pérdida total = filtro + estática + otros');
  ok(avisosFiltro(alto).some((a) => a.nivel === 'error' && /hierve/.test(a.texto)), 'aviso de error cuando hierve');
}

console.log('6. Tubos y velocidades');
{
  ok(TUBOS_COBRE.length >= 14, 'hay tubos en pulgadas y en milímetros');
  ok(TUBOS_COBRE.every((t) => t.id > 0 && t.id < t.odMm), 'el interior siempre es menor que el exterior');
  const t14 = TUBOS_COBRE.find((t) => t.od === '1/4"'), t78 = TUBOS_COBRE.find((t) => t.od === '7/8"'), t12 = TUBOS_COBRE.find((t) => t.od === '12 mm');
  ok(Math.abs(t14.id - 4.83) < 0.02 && Math.abs(t78.id - 19.94) < 0.02 && t12.id === 10, 'Ø interior típico: 1/4" = 4,83 · 7/8" = 19,94 · 12 mm = 10');
  const r = calcularFiltro({ ...BASE, potenciaW: 12000 });
  const tabla = tablaTubos(r.ctx, r.mdot, TUBOS_COBRE);
  const orden = [...tabla].sort((a, b) => a.id - b.id);
  ok(orden.every((t, i) => i === 0 || t.v < orden[i - 1].v), 'más Ø interior → menos velocidad');
  const sug = tuboSugerido(tabla);
  ok(sug && sug.valoracion.clave === 'optima', 'el tubo sugerido tiene velocidad adecuada');
  ok(orden.find((t) => t.id < sug.id && t.valoracion.clave === 'optima') === undefined, 'y es el más pequeño que la cumple');
  ok(valorarVelocidad(0.9).clave === 'optima' && valorarVelocidad(1.2).clave === 'alta' && valorarVelocidad(1.8).clave === 'muyalta', 'umbrales 1,0 y 1,5 m/s');
  const aviso = avisosFiltro(calcularFiltro({ ...BASE, potenciaW: 12000, idMm: 4.83 }));
  ok(aviso.some((a) => a.nivel === 'error' && /velocidad/.test(a.texto)), 'aviso cuando el tubo es pequeño para el caudal');
}

console.log('7. Entradas incorrectas y límites');
{
  ok(calcularFiltro({ ...BASE, potenciaW: 0 }).ok === false, 'potencia 0 → mensaje');
  ok(calcularFiltro({ ...BASE, Te: 50 }).ok === false, 'evaporación mayor que condensación → mensaje');
  ok(calcularFiltro({ ...BASE, gas: 'R-999' }).ok === false, 'gas sin tabla → mensaje');
  ok(calcularFiltro({ ...BASE, subenf: 60 }).ok === false, 'subenfriamiento fuera de rango → mensaje');
  const f = calcularFiltro({ gas: 'R-744', Te: -30, Tc: 10, subenf: 2, recal: 5, potenciaW: 3000, catalogo: { Q: 3500, dp: 0.07, TeRef: -15, TliqRef: 30 } });
  ok(f.ok && f.referencia.ok === false && f.dpFiltro === undefined, 'R-744: el líquido a 30 °C no está en la tabla → no inventa la caída', JSON.stringify(f.referencia));
  ok(avisosFiltro(f).some((a) => /no tiene tabla/.test(a.texto)), 'y avisa de por qué');
  const raro = calcularFiltro({ ...BASE, catalogo: { Q: 0 }, idMm: NaN, desnivel: -4, dpOtros: NaN });
  ok(raro.ok && raro.dpFiltro === undefined && raro.dpEstatica === 0 && raro.velocidad === undefined, 'valores vacíos o negativos no rompen nada');
}

console.log('8. Textos en español');
{
  const textos = [...CASOS_FILTRO.map((c) => c.texto + c.nombre), ...MONTAJE_FILTRO];
  const todos = [];
  for (const g of ['R-134a', 'R-290', 'R-32']) {
    for (const extra of [{ subenf: 0 }, { desnivel: 30 }, { potenciaW: 20000, idMm: 4.83 }]) {
      const r = calcularFiltro({ ...BASE, gas: g, catalogo: { Q: 2000, dp: 0.07, TeRef: -15, TliqRef: 30 }, ...extra });
      for (const a of avisosFiltro(r)) todos.push(a.texto);
    }
  }
  const INGLES = /\b(drop-in|retrofit|charge|oil|valve|the|and|with|only|flow|filter)\b/i;
  ok(textos.concat(todos).every((t) => !INGLES.test(t)), 'sin palabras en inglés');
  ok(todos.every((t) => !/\d\.\d/.test(t)), 'los números de los avisos llevan coma decimal', todos.find((t) => /\d\.\d/.test(t)));
}

console.log(`\n${total} comprobaciones, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
