/**
 * planoCargaFrigorifica.js — Carga frigorífica de las cámaras del plano y
 * máquina que hace falta.
 *
 * Sin React, para poder comprobar los números por su cuenta. Es un cálculo de
 * dimensionado para presupuestar (transmisión, producto, renovación de aire,
 * cargas internas y desescarche), no sustituye al cálculo de un proyecto.
 *
 * Medidas en METROS, temperaturas en °C, potencias en vatios salvo `kw_*`.
 */

/** Escalones comerciales de potencia frigorífica (kW), de equipos de cámara. */
export const ESCALONES_FRIO_KW = [0.5, 0.8, 1.2, 1.6, 2.0, 2.5, 3.2, 4.0, 5.0, 6.3, 8.0, 10.0, 12.5, 16.0, 20.0, 25.0, 32.0, 40.0];

export const AISLANTE_LAMBDA = 0.022; // W/m·K, panel sándwich de poliuretano
const TEMP_TERRENO = 15; // °C bajo el suelo de la cámara

const r = (n, d = 0) => { const f = 10 ** d; return Math.round((Number(n) || 0) * f) / f; };

/** Cámaras dibujadas en el plano (una por room_id), con sus medidas y datos. */
export function camarasDePlano(walls = []) {
  const vistas = new Map();
  for (const w of walls) {
    if (!w?.camara || !w.room_id || vistas.has(w.room_id)) continue;
    vistas.set(w.room_id, {
      room_id: w.room_id,
      ancho: Number(w.room_w_m) || 0,
      largo: Number(w.room_h_m) || 0,
      alto: Number(w.alto_m) || 2.5,
      tipo: w.tipo === 'negativa' ? 'negativa' : 'positiva',
      espesor_mm: Number(w.espesor_mm) || 100,
      suelo: !!w.suelo,
    });
  }
  return [...vistas.values()].filter((c) => c.ancho > 0 && c.largo > 0);
}

/** Valores de partida según sea cámara positiva o negativa. */
export function ajustesPorDefecto(camara) {
  const neg = camara?.tipo === 'negativa';
  const vol = (camara?.ancho || 0) * (camara?.largo || 0) * (camara?.alto || 2.5);
  return {
    temp_int: neg ? -20 : 2,
    temp_ext: 32,
    producto_kg_dia: Math.round(vol * (neg ? 15 : 25)),
    temp_entrada: neg ? 0 : 15,
    // En congelación el valor incluye el calor de congelación repartido (equivalente).
    calor_especifico: neg ? 6 : 3.5, // kJ/kg·K
    entradas_dia: neg ? 10 : 20,
    horas_funcionamiento: neg ? 16 : 18,
    refrigerante: 'R-449A',
    personas: 1,
  };
}

/**
 * Carga de una cámara.
 * @returns desglose en vatios, kW de frío, kW de equipo (a las horas de
 *          funcionamiento) y escalón comercial.
 */
export function cargaFrigorifica(camara, ajustes = {}) {
  const a = { ...ajustesPorDefecto(camara), ...ajustes };
  const { ancho, largo, alto } = camara;
  const e = (Number(camara.espesor_mm) || 100) / 1000;
  const U = AISLANTE_LAMBDA / e; // W/m²·K
  const dT = a.temp_ext - a.temp_int;
  const dTsuelo = TEMP_TERRENO - a.temp_int;

  const paredes = 2 * (ancho + largo) * alto;
  const techo = ancho * largo;
  const suelo = ancho * largo;
  // Con suelo sanitario el panel del suelo aísla igual; sin él, solo la solera.
  const Usuelo = camara.suelo ? U : Math.max(U, 0.35);
  const transmision = U * (paredes + techo) * dT * 1.05 + Usuelo * suelo * dTsuelo;

  const producto = (a.producto_kg_dia * a.calor_especifico * 1000 * Math.abs(a.temp_entrada - a.temp_int)) / (24 * 3600);

  const vol = ancho * largo * alto;
  const renovDia = Math.max(2, 70 * Math.pow(Math.max(vol, 1), -0.35)) * Math.min(3, Math.max(0.5, a.entradas_dia / 20));
  const deltaH = 1.8 * dT; // kJ/kg aire, humedad incluida
  const infiltracion = (vol * renovDia * 1.2 * deltaH * 1000) / (24 * 3600);

  const iluminacion = 10 * ancho * largo * (8 / 24);
  const personas = a.personas * 250 * (4 / 24);
  const internas = iluminacion + personas;

  const base = transmision + producto + infiltracion + internas;
  const ventiladores = base * 0.08;
  const desescarche = camara.tipo === 'negativa' ? base * 0.1 : base * 0.03;
  const total = (base + ventiladores + desescarche) * 1.1; // 10 % de seguridad

  const kw_frio = total / 1000;
  const kw_equipo = (kw_frio * 24) / Math.max(1, a.horas_funcionamiento);
  const escalon = ESCALONES_FRIO_KW.find((k) => k >= kw_equipo) ?? ESCALONES_FRIO_KW[ESCALONES_FRIO_KW.length - 1];

  const avisos = [];
  if (kw_equipo > ESCALONES_FRIO_KW[ESCALONES_FRIO_KW.length - 1]) avisos.push('Carga por encima del equipo comercial habitual: hará falta más de una máquina o un proyecto.');
  if (e < 0.08 && a.temp_int < 0) avisos.push('Para congelación se recomienda panel de 100 mm o más.');
  if (!camara.suelo && a.temp_int < 0) avisos.push('Cámara negativa sin suelo sanitario: conviene calefactar el suelo contra la congelación del terreno.');

  return {
    ajustes: a,
    volumen: r(vol, 1),
    desglose_w: {
      transmision: r(transmision), producto: r(producto), infiltracion: r(infiltracion),
      internas: r(internas), ventiladores: r(ventiladores), desescarche: r(desescarche),
    },
    total_w: r(total),
    kw_frio: r(kw_frio, 2),
    kw_equipo: r(kw_equipo, 2),
    kw_comercial: escalon,
    temp_evaporacion: a.temp_int - 8,
    avisos,
  };
}
