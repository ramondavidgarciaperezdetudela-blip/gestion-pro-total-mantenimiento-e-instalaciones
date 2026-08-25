/**
 * cargarTodo.js — Traer TODOS los registros, sin topes.
 *
 * Las pantallas pedían un número fijo: los 200 últimos partes, los 300
 * primeros clientes, las 500 últimas facturas. Mientras hay pocos no se nota,
 * pero al pasar de ese número los que sobran DESAPARECEN de la pantalla sin
 * decir nada: ni salen en la lista, ni en las búsquedas, ni al elegir cliente.
 * No es un aviso de "hay más", es que dejan de existir para el programa.
 *
 * Aquí se traen todos, por páginas y varias a la vez, que es como ya se hacía
 * en las copias de seguridad.
 */
import { fetchAllRecordsFast } from '@/lib/backupEngine';

/** Ordena por un campo, con "-campo" para el orden inverso. */
function ordenar(registros, orden) {
  if (!orden) return registros;
  const alReves = orden.startsWith('-');
  const campo = alReves ? orden.slice(1) : orden;
  const copia = [...registros];
  copia.sort((a, b) => {
    const x = a?.[campo] ?? '';
    const y = b?.[campo] ?? '';
    if (x === y) return 0;
    const menor = x < y ? -1 : 1;
    return alReves ? -menor : menor;
  });
  return copia;
}

/**
 * Todos los registros de una entidad, ordenados como se pida.
 * @param {string} entidad  Por ejemplo 'Contact' o 'SATOrder'.
 * @param {string} orden    'name', '-date'… Igual que en .list().
 */
export async function cargarTodo(entidad, orden = '') {
  const registros = (await fetchAllRecordsFast(entidad)) || [];
  return ordenar(registros, orden);
}
