/**
 * simuladorCiclo.js — diagnóstico en vivo a partir de entradas simuladas
 * (presiones, recalentamiento, subenfriamiento). Mismos umbrales que el
 * diagnóstico real de DiagnosticoCarga, para que el simulador enseñe lo mismo.
 */
import { evaluar, zonasPresion, golpeDeLiquido, ZONAS_RECALENTAMIENTO, ZONAS_SUBENFRIAMIENTO } from './instrumentos.js';

/** @returns {{e:string, estado:'critico'|'aviso'|'ok', t:string}[]} */
export function diagnosticoSimulado({ pBaja, pAlta, recal, subenf, rec }) {
  const items = [];
  const hay = !!rec?.hay;
  const margen = (v) => Math.max(0.3, Math.abs(v) * 0.08);
  const bajaBaja = hay && pBaja < rec.bajaMin - margen(rec.bajaMin);
  const bajaAlta = hay && pBaja > rec.bajaMax + margen(rec.bajaMax);
  const altaAlta = hay && pAlta > rec.altaMax + margen(rec.altaMax);
  const altaBaja = hay && pAlta < rec.altaMin - margen(rec.altaMin);

  if (recal > 12 && (bajaBaja || subenf < 3)) items.push({ e: 'FALTA DE REFRIGERANTE', estado: 'critico', t: 'Recalentamiento alto con baja presión baja o subenfriamiento escaso: falta carga o hay fuga.' });
  if (subenf > 12 && recal < 4) items.push({ e: 'EXCESO DE CARGA', estado: 'aviso', t: 'Subenfriamiento alto y recalentamiento bajo: sobrecarga o retorno de líquido.' });
  if (recal > 15 && subenf >= 5) items.push({ e: 'VÁLVULA DE EXPANSIÓN OBSTRUIDA', estado: 'aviso', t: 'Recalentamiento muy alto con subenfriamiento normal: válvula o filtro obstruidos o mal ajustados.' });
  if (golpeDeLiquido(recal)) items.push({ e: 'RIESGO DE GOLPE DE LÍQUIDO', estado: 'critico', t: 'Recalentamiento casi nulo: puede llegar líquido al compresor.' });
  if (altaAlta) items.push({ e: 'CONDENSACIÓN ALTA', estado: 'aviso', t: 'Alta presión elevada: condensador sucio, ventilador parado o incondensables.' });
  if (bajaBaja && recal < 6) items.push({ e: 'POCO CAUDAL EN EVAPORADOR', estado: 'aviso', t: 'Baja presión baja con recalentamiento bajo: hielo, filtro de aire sucio o ventilador de evaporador.' });
  if (altaBaja && bajaBaja) items.push({ e: 'COMPRESOR CON POCA COMPRESIÓN', estado: 'aviso', t: 'Alta y baja presión bajas: compresor gastado o fuga interna.' });
  if (bajaAlta && !altaAlta) items.push({ e: 'BAJA PRESIÓN ALTA', estado: 'aviso', t: 'Baja presión por encima de lo normal: carga térmica alta o válvula demasiado abierta.' });
  if (!items.length) items.push({ e: 'PARÁMETROS EN RANGO', estado: 'ok', t: 'Presiones, recalentamiento y subenfriamiento dentro de lo orientativo.' });
  return items;
}

/** Estado de cada magnitud para colorear los deslizadores. */
export function estadosSimulados({ pBaja, pAlta, recal, subenf, rec }) {
  return {
    pBaja: rec?.hay ? evaluar(pBaja, zonasPresion(rec.bajaMin, rec.bajaMax)) : 'neutro',
    pAlta: rec?.hay ? evaluar(pAlta, zonasPresion(rec.altaMin, rec.altaMax)) : 'neutro',
    recal: golpeDeLiquido(recal) ? 'critico' : evaluar(recal, ZONAS_RECALENTAMIENTO),
    subenf: evaluar(subenf, ZONAS_SUBENFRIAMIENTO),
  };
}
