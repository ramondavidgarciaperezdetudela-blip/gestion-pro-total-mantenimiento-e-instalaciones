import { useEffect } from 'react';
import { recordarTrabajo } from '@/lib/recuperarTrabajo';

/**
 * Pone en marcha la recuperación de lo que se estaba escribiendo.
 *
 * Va dentro del router porque para volver a la pantalla donde estabas hace
 * falta el navegador de la aplicación; cambiando la dirección a pelo se
 * recargaría todo otra vez y se perdería lo que se acaba de recuperar.
 */
export default function RecordarTrabajo() {
  useEffect(() => {
    // Al abrir el programa se queda en el menú principal; solo se recupera
    // el texto a medio escribir.
    recordarTrabajo(() => {});
    // Solo al arrancar: es lo que sustituye a haber cerrado la aplicación.
  }, []);

  return null;
}
