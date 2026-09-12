/**
 * toaster.jsx — Ya no pinta nada.
 *
 * Este componente montaba DOS contenedores fijos, los dos con
 * `fixed top-0 z-[100] w-full`, uno encima del otro y por delante de la
 * cabecera de la aplicación. Ahí es donde se quedaba clavado el aviso de
 * "Documento actualizado" tapando atrás / editar / inicio.
 *
 * Los avisos los pinta ahora `sonner` (ver src/App.jsx), que es lo que ya
 * usaba el resto del programa y sabe cerrarse solo. Se deja el componente
 * exportado, y sin pintar nada, para que cualquier importación antigua siga
 * funcionando en vez de romper la pantalla entera.
 */
export function Toaster() {
  return null;
}
