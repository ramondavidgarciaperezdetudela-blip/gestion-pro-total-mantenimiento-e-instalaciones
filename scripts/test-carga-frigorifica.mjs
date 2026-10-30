import { camarasDePlano, cargaFrigorifica, ajustesPorDefecto } from '../src/lib/planoCargaFrigorifica.js';
import { capacidadDeTexto, tipoDeMaquina, buscarMaquinas } from '../src/lib/planoBuscarPrecios.js';
let fallos = 0; const ok = (c, t, d = '') => { if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } else console.log('  ✓ ' + t); };
const w = (extra) => ({ camara: true, room_id: 'r1', room_w_m: 3, room_h_m: 4, alto_m: 2.5, espesor_mm: 100, tipo: 'positiva', suelo: true, ...extra });
const cams = camarasDePlano([w(), w(), { x1: 0 }, w({ room_id: 'r2', tipo: 'negativa' })]);
ok(cams.length === 2 && cams[0].ancho === 3 && cams[1].tipo === 'negativa', 'detecta las cámaras del plano');
const pos = cargaFrigorifica(cams[0]);
const neg = cargaFrigorifica({ ...cams[1], room_id: 'r2' });
console.log('   positiva 3x4x2,5:', pos.kw_frio, 'kW →', pos.kw_equipo, 'equipo →', pos.kw_comercial, '| negativa:', neg.kw_frio, neg.kw_equipo, neg.kw_comercial);
ok(pos.kw_frio > 0.8 && pos.kw_frio < 4, 'cámara positiva de 30 m³ en rango razonable (0,8–4 kW)', String(pos.kw_frio));
ok(neg.kw_frio > pos.kw_frio, 'la negativa pide más que la positiva');
ok(pos.kw_comercial >= pos.kw_equipo, 'el escalón comercial cubre la carga');
const grueso = cargaFrigorifica({ ...cams[0], espesor_mm: 150 });
ok(grueso.desglose_w.transmision < pos.desglose_w.transmision, 'más aislamiento, menos transmisión');
const mas = cargaFrigorifica(cams[0], { entradas_dia: 60 });
ok(mas.desglose_w.infiltracion > pos.desglose_w.infiltracion, 'más aperturas de puerta, más infiltración');
ok(Math.abs(pos.total_w - Object.values(pos.desglose_w).reduce((a, b) => a + b, 0) * 1.1) < pos.total_w * 0.2, 'el total sale del desglose (más seguridad)');
ok(capacidadDeTexto('Evaporador 2,5 kW') === 2.5 && Math.abs(capacidadDeTexto('Unidad 2150 kcal/h') - 2.5) < 0.01 && capacidadDeTexto('Condensadora 3200 W') === 3.2, 'lee la potencia del texto');
ok(capacidadDeTexto('Evaporador sin dato') === null, 'sin potencia no se adivina');
ok(tipoDeMaquina('Unidad condensadora Bitzer') === 'condensadora' && tipoDeMaquina('Evaporador cúbico') === 'evaporador' && tipoDeMaquina('Tubo cobre') === null, 'reconoce el tipo');
const tarifa = [
  { id: 1, product_name: 'Evaporador cúbico 1,6 kW conservación', sale_price: 300, supplier_name: 'Frio SA' },
  { id: 2, product_name: 'Evaporador cúbico 2,5 kW conservación', sale_price: 420, supplier_name: 'Frio SA' },
  { id: 3, product_name: 'Evaporador 2,5 kW congelación', sale_price: 560, supplier_name: 'Frio SA' },
  { id: 4, product_name: 'Evaporador 4 kW conservación', cost_price: 600, supplier_name: 'Frio SA' },
  { id: 5, product_name: 'Evaporador 3 kW', sale_price: 0, cost_price: 0 },
  { id: 6, product_name: 'Tubo cobre 5/8', sale_price: 5 },
];
const c = buscarMaquinas(tarifa, { tipo: 'evaporador', kw: 2.0, camaraTipo: 'positiva' });
ok(c[0].id === 2 && c[1].id === 4, 'elige la más ajustada que cubre y es de conservación', c.map((x) => x.id).join());
ok(!c.some((x) => x.id === 1 || x.id === 5), 'descarta la que no llega y la sin precio');
const n = buscarMaquinas(tarifa, { tipo: 'evaporador', kw: 2.0, camaraTipo: 'negativa' });
ok(n[0].id === 3, 'en negativa prefiere la de congelación', n.map((x) => x.id).join());
const nada = buscarMaquinas(tarifa, { tipo: 'evaporador', kw: 20 });
ok(nada[0].insuficiente === true, 'si ninguna llega, lo dice');
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
