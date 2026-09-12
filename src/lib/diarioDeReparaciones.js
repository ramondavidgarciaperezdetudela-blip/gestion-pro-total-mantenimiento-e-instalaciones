/**
 * diarioDeReparaciones.js — Que la intervención quede en el diario del cliente.
 *
 * El diario de reparaciones es donde se ve la historia de una máquina: qué le
 * ha pasado, cuándo y quién estuvo. Hasta ahora había que apuntarlo a mano
 * DESPUÉS de rellenar la ficha, así que casi nunca se apuntaba, y la máquina
 * que más avisos da era justo la que aparecía con el diario vacío.
 *
 * Aquí se hace solo al guardar la ficha: se busca el diario de esa máquina
 * (por número de serie, que es lo único que no cambia) y se le añade la
 * entrada. Si la ficha se vuelve a guardar, se ACTUALIZA la entrada anterior
 * en vez de crear otra: guardar dos veces no puede convertirse en dos
 * reparaciones que nunca existieron.
 */
import { resumenParaDiario, marcadosDe, SECCIONES, FOTOS } from '@/lib/inspeccionSanitaria';

/** Nombre con el que se ve la máquina en el diario. */
export function nombreDeLaMaquina(sheet) {
  const partes = [sheet?.equipment_brand, sheet?.equipment_model].filter(Boolean).join(' ').trim();
  if (partes && sheet?.location) return `Cámara frigorífica ${partes} — ${sheet.location}`;
  if (partes) return `Cámara frigorífica ${partes}`;
  if (sheet?.location) return `Cámara frigorífica — ${sheet.location}`;
  return 'Cámara frigorífica';
}

/** ¿Este diario es el de la máquina de la ficha? */
export function esLaMisma(diario, sheet) {
  const serie = String(sheet?.serial_number || '').trim().toLowerCase();
  if (serie) return String(diario?.serial_number || '').trim().toLowerCase() === serie;
  return String(diario?.machine_name || '').trim().toLowerCase()
    === nombreDeLaMaquina(sheet).trim().toLowerCase();
}

/** La entrada del diario que corresponde a esta intervención. */
export function entradaDesdeFicha(sheet, ficha) {
  const causas = marcadosDe(ficha, SECCIONES.find((s) => s.id === 'causa'));
  const acciones = marcadosDe(ficha, SECCIONES.find((s) => s.id === 'accion'));

  const fotos = [];
  const nombres = [];
  for (const bloque of FOTOS) {
    for (const url of ficha?.fotos?.[bloque.id] || []) {
      fotos.push(url);
      nombres.push(bloque.titulo);
    }
  }

  const descripcion = [
    ficha?.motivo ? `Motivo: ${ficha.motivo}` : '',
    causas.length ? `Causa detectada: ${causas.join('; ')}` : '',
    resumenParaDiario(ficha),
    sheet?.observations || '',
  ].filter(Boolean).join('\n');

  return {
    // Con esto se reconoce la entrada si la ficha se vuelve a guardar.
    ficha_id: sheet?.id || '',
    ficha_numero: sheet?.sheet_number || '',
    date: sheet?.date || new Date().toISOString().split('T')[0],
    type: 'reparacion',
    technician: sheet?.technician_name || '',
    description: descripcion,
    solution: acciones.join('; '),
    parts_used: '',
    cost: '',
    hours: '',
    photos: fotos,
    photo_names: nombres,
    next_action: sheet?.recommendations || '',
    next_action_date: '',
    signature_technician: sheet?.signature_technician || '',
    sign_datetime_technician: sheet?.sign_datetime_technician || '',
    signature_client: sheet?.signature_client || '',
    sign_datetime_client: sheet?.sign_datetime_client || '',
  };
}

/**
 * Mete (o actualiza) la entrada en la lista que ya tenía el diario.
 * Función aparte y sin servidor para poder comprobarla de verdad.
 */
export function conLaEntradaPuesta(entradas, entrada) {
  const lista = Array.isArray(entradas) ? entradas : [];
  const i = entrada.ficha_id
    ? lista.findIndex((e) => e && e.ficha_id === entrada.ficha_id)
    : -1;
  if (i === -1) return [...lista, entrada];
  const copia = [...lista];
  copia[i] = { ...lista[i], ...entrada };
  return copia;
}

/**
 * Deja la intervención apuntada en el diario del cliente.
 *
 * @returns {{ok: boolean, motivo?: string, creado?: boolean, diarioId?: string}}
 */
export async function anotarEnDiario(base44, { sheet, ficha }) {
  if (!sheet?.contact_id) return { ok: false, motivo: 'sin_cliente' };

  const entrada = entradaDesdeFicha(sheet, ficha);
  const diarios = await base44.entities.EquipmentDiary.filter({ contact_id: sheet.contact_id });
  const diario = (diarios || []).find((d) => esLaMisma(d, sheet));

  if (diario) {
    await base44.entities.EquipmentDiary.update(diario.id, {
      ...diario,
      entries: conLaEntradaPuesta(diario.entries, entrada),
    });
    return { ok: true, creado: false, diarioId: diario.id };
  }

  const nuevo = await base44.entities.EquipmentDiary.create({
    contact_id: sheet.contact_id,
    contact_name: sheet.contact_name || '',
    machine_name: nombreDeLaMaquina(sheet),
    machine_type: 'camara_frigorifica',
    equipment_brand: sheet.equipment_brand || '',
    equipment_model: sheet.equipment_model || '',
    serial_number: sheet.serial_number || '',
    location: sheet.location || '',
    equipment_refrigerant: sheet.readings_climate?.refrigerant_type || '',
    notes: '',
    entries: [entrada],
  });
  return { ok: true, creado: true, diarioId: nuevo?.id };
}
