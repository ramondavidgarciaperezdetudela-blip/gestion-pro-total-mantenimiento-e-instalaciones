// Informe de las fotos que no se han podido recuperar, para buscarlas a mano.
const celda = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

/**
 * @param {{proveedor?:string,codigo?:string,nombre?:string,motivo:string,pagina?:number,archivo?:string}[]} filas
 * @returns {string} CSV que Excel abre bien (UTF-8 con marca y «;»)
 */
export function construirCsvFotos(filas) {
  const cab = ['Proveedor', 'Referencia', 'Nombre', 'Motivo', 'Página del PDF', 'Archivo PDF'];
  const lineas = [cab.map(celda).join(';')];
  for (const f of filas) lineas.push([f.proveedor, f.codigo, f.nombre, f.motivo, f.pagina || '', f.archivo].map(celda).join(';'));
  return '﻿' + lineas.join('\r\n') + '\r\n';
}

export const MOTIVO_SIN_FOTO = 'No aparece ninguna foto junto a este código en el PDF';
