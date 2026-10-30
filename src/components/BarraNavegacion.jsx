import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

/**
 * Volver atrás y volver a Inicio, desde cualquier pantalla.
 *
 * Antes esto solo existía en el móvil, y a medias: en el ordenador no había
 * ninguna forma de retroceder sin usar el menú lateral, y a Inicio no se
 * podía volver de un toque desde ninguna parte.
 *
 * El botón de atrás tiene una trampa que hay que contemplar: si se ha abierto
 * el programa directamente en una pantalla (un enlace, recargar la página, o
 * el instalador que abre donde lo dejaste) NO hay nada a lo que volver, y un
 * "atrás" normal sacaría al usuario de la aplicación. En ese caso se va a
 * Inicio, que es lo que espera cualquiera.
 */
export default function BarraNavegacion({ enInicio = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const atras = () => {
    // window.history.length > 1 no basta: dentro del programa instalado
    // arranca ya en 1 y hay casos en que crece sin que haya página previa
    // NUESTRA. El estado del enrutador dice si hemos navegado de verdad.
    const hayDondeVolver = location.key && location.key !== 'default';
    if (hayDondeVolver) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="mb-3 flex items-center gap-2" data-prueba="barra-navegacion">
      <button
        type="button"
        onClick={atras}
        aria-label="Volver a la pantalla anterior"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Atrás
      </button>

      {!enInicio && (
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Ir a la pantalla de inicio"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Home className="h-4 w-4" />
          Inicio
        </button>
      )}
    </div>
  );
}
