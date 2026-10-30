import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordarTrabajo } from '@/lib/recuperarTrabajo';

/**
 * Pone en marcha la recuperación de lo que se estaba escribiendo.
 *
 * Va dentro del router porque para volver a la pantalla donde estabas hace
 * falta el navegador de la aplicación; cambiando la dirección a pelo se
 * recargaría todo otra vez y se perdería lo que se acaba de recuperar.
 */
export default function RecordarTrabajo() {
  const navigate = useNavigate();

  useEffect(() => {
    recordarTrabajo((donde) => {
      // Con HashRouter la pantalla se guarda como "#/Loquesea"; el navegador
      // de la aplicación espera la ruta sin la almohadilla.
      const ruta = donde.startsWith('#') ? donde.slice(1) : donde;
      if (ruta && ruta !== '/') navigate(ruta, { replace: true });
    });
    // Solo al arrancar: es lo que sustituye a haber cerrado la aplicación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
