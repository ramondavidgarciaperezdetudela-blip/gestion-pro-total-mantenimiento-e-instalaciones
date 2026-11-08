// Cálculo de carga térmica de una cámara frigorífica de conservación.
// Método por componentes, resultado en kWh/día y potencia frigorífica en kW.
// Los valores por defecto son típicos; ajústalos a las tablas que use tu empresa.

export const PANELES = {
  'PUR 60 mm': 0.37,
  'PUR 80 mm': 0.28,
  'PUR 100 mm': 0.22,
  'PUR 120 mm': 0.19,
  'PUR 150 mm': 0.15
};

export const DATOS_POR_DEFECTO = {
  largo: 4.0, ancho: 3.0, alto: 2.6,
  tInterior: 2, tExterior: 32, hrInterior: 85, hrExterior: 60,
  panel: 'PUR 80 mm',
  entradaKg: 400, tEntrada: 20, cpProducto: 3.8,
  almacenadoKg: 1500, respiracionMwKg: 50,
  renovacionesDia: 9.5,
  luzW: 120, luzHoras: 4,
  personas: 1, personaW: 270, personaHoras: 2,
  ventiladoresW: 120, ventiladoresHoras: 20,
  horasFuncionamiento: 16, margen: 10, saltoEvaporador: 8
};

// Entalpía del aire húmedo en kJ/kg de aire seco.
export function entalpiaAire(t, hr) {
  const psat = 0.61094 * Math.exp((17.625 * t) / (t + 243.04)); // kPa
  const pv = (psat * hr) / 100;
  const w = (0.622 * pv) / (101.325 - pv);
  return 1.006 * t + w * (2501 + 1.86 * t);
}

export function calcularCarga(entrada) {
  const d = { ...DATOS_POR_DEFECTO, ...entrada };
  const volumen = d.largo * d.ancho * d.alto;
  const superficie = 2 * (d.largo * d.alto) + 2 * (d.ancho * d.alto) + 2 * (d.largo * d.ancho);
  const u = PANELES[d.panel] ?? 0.28;
  const dT = d.tExterior - d.tInterior;
  const densidad = 101325 / (287 * (d.tInterior + 273.15));
  const dH = entalpiaAire(d.tExterior, d.hrExterior) - entalpiaAire(d.tInterior, d.hrInterior);

  const partidas = [
    { id: 'transmision', concepto: 'Transmisión por cerramientos', base: `${f(superficie)} m² x ${f(u, 2)} W/m²K x ${f(dT, 0)} K`, kwh: (superficie * u * dT * 24) / 1000 },
    { id: 'producto', concepto: 'Enfriamiento del género', base: `${f(d.entradaKg, 0)} kg x ${f(d.cpProducto)} kJ/kgK x ${f(d.tEntrada - d.tInterior, 0)} K`, kwh: (d.entradaKg * d.cpProducto * (d.tEntrada - d.tInterior)) / 3600 },
    { id: 'aire', concepto: 'Renovación de aire', base: `${f(volumen)} m³ x ${f(d.renovacionesDia)} renov. x ${f(dH)} kJ/kg`, kwh: (volumen * d.renovacionesDia * densidad * dH) / 3600 },
    { id: 'ventiladores', concepto: 'Ventiladores del evaporador', base: `${f(d.ventiladoresW, 0)} W x ${f(d.ventiladoresHoras, 0)} h`, kwh: (d.ventiladoresW * d.ventiladoresHoras) / 1000 },
    { id: 'respiracion', concepto: 'Respiración del género', base: `${f(d.almacenadoKg, 0)} kg x ${f(d.respiracionMwKg, 0)} mW/kg`, kwh: (d.almacenadoKg * d.respiracionMwKg * 24) / 1e6 },
    { id: 'personas', concepto: 'Personas', base: `${d.personas} x ${f(d.personaW, 0)} W x ${f(d.personaHoras, 0)} h`, kwh: (d.personas * d.personaW * d.personaHoras) / 1000 },
    { id: 'luz', concepto: 'Iluminación', base: `${f(d.luzW, 0)} W x ${f(d.luzHoras, 0)} h`, kwh: (d.luzW * d.luzHoras) / 1000 }
  ].map((p) => ({ ...p, kwh: redondear(p.kwh, 2) }));

  const subtotal = redondear(partidas.reduce((s, p) => s + p.kwh, 0), 2);
  const margen = redondear((subtotal * d.margen) / 100, 2);
  const total = redondear(subtotal + margen, 2);
  const potenciaKw = redondear(total / d.horasFuncionamiento, 2);
  partidas.forEach((p) => { p.peso = subtotal > 0 ? (p.kwh / subtotal) * 100 : 0; });

  return {
    datos: d, volumen, superficie, u, partidas, subtotal, margen, total, potenciaKw,
    tEvaporacion: d.tInterior - d.saltoEvaporador
  };
}

// Catálogo de ejemplo. Sustituir por el catálogo real (potencias a la Te y Tc del cálculo).
export const EVAPORADORES = [
  { modelo: 'EV-18', kw: 1.8, ventiladores: '1 ventilador de 60 W' },
  { modelo: 'EV-25', kw: 2.5, ventiladores: '2 ventiladores de 60 W' },
  { modelo: 'EV-32', kw: 3.2, ventiladores: '2 ventiladores de 90 W' },
  { modelo: 'EV-40', kw: 4.0, ventiladores: '3 ventiladores de 90 W' },
  { modelo: 'EV-55', kw: 5.5, ventiladores: '3 ventiladores de 120 W' }
];

export const UNIDADES_CONDENSADORAS = [
  { modelo: 'UC-15', kw: 1.55, detalle: 'Hermético alternativo, 230 V, 0,9 kW eléctricos, 44 dB(A)', vet: 'N.º 01', liquido: '1/4"', aspiracion: '1/2"', proteccion: 'C10' },
  { modelo: 'UC-20', kw: 2.05, detalle: 'Hermético alternativo, 230 V, 1,1 kW eléctricos, 45 dB(A)', vet: 'N.º 02', liquido: '3/8"', aspiracion: '5/8"', proteccion: 'C16' },
  { modelo: 'UC-24', kw: 2.40, detalle: 'Hermético alternativo, 230 V, 1,3 kW eléctricos, 46 dB(A)', vet: 'N.º 02', liquido: '3/8"', aspiracion: '5/8"', proteccion: 'C16' },
  { modelo: 'UC-30', kw: 3.00, detalle: 'Rotativo, 230 V, 1,5 kW eléctricos, 48 dB(A)', vet: 'N.º 03', liquido: '3/8"', aspiracion: '3/4"', proteccion: 'C20' },
  { modelo: 'UC-38', kw: 3.80, detalle: 'Scroll, 400 V trifásico, 1,8 kW eléctricos, 50 dB(A)', vet: 'N.º 04', liquido: '3/8"', aspiracion: '7/8"', proteccion: 'C10 III' },
  { modelo: 'UC-50', kw: 5.00, detalle: 'Scroll, 400 V trifásico, 2,4 kW eléctricos, 52 dB(A)', vet: 'N.º 05', liquido: '1/2"', aspiracion: '7/8"', proteccion: 'C16 III' }
];

export const COMPACTOS = [
  { modelo: 'CMP-21', kw: 2.10, detalle: 'Monobloc de pared, 230 V, 1,2 kW eléctricos', hueco: '640 x 420 mm', proteccion: 'C16' },
  { modelo: 'CMP-26', kw: 2.60, detalle: 'Monobloc de pared, 230 V, 1,4 kW eléctricos', hueco: '640 x 420 mm', proteccion: 'C16' },
  { modelo: 'CMP-32', kw: 3.20, detalle: 'Monobloc de techo, 230 V, 1,7 kW eléctricos', hueco: '760 x 760 mm', proteccion: 'C20' }
];

// Reserva en % frente a la potencia necesaria y su valoración.
export function valorarEquipo(kwEquipo, kwNecesario) {
  const reserva = (kwEquipo / kwNecesario - 1) * 100;
  let valoracion = 'Sobredimensionada';
  let tipo = 'contorno';
  if (reserva < 0) { valoracion = 'No cubre'; tipo = 'urgente'; }
  else if (reserva <= 20) { valoracion = 'Recomendada'; tipo = 'cerrado'; }
  else if (reserva <= 40) { valoracion = 'Válida, sobrada'; tipo = 'contorno'; }
  return { reserva, valoracion, tipo };
}

// Evaporador que va bien con una unidad: el primero que iguala o supera su potencia.
export function evaporadorPara(unidad) {
  return EVAPORADORES.find((e) => e.kw >= unidad.kw) || EVAPORADORES[EVAPORADORES.length - 1];
}

// La opción recomendada por defecto: la más pequeña que cubre la carga.
export function recomendada(lista, kwNecesario) {
  return lista.find((e) => e.kw >= kwNecesario) || lista[lista.length - 1];
}

export function f(n, dec = 1) {
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function redondear(n, dec) {
  const k = 10 ** dec;
  return Math.round(n * k) / k;
}
