/**
 * use-toast.jsx — Los avisos que salen arriba ("Documento actualizado…").
 *
 * QUÉ PASABA
 *
 * Este fichero venía de la plantilla de shadcn, que está pensada para usarse
 * con @radix-ui/react-toast. Aquí Radix no está: toast.jsx son <div> normales
 * que se limitan a copiar las propiedades. Resultado:
 *
 *   · `duration: 2500` no lo leía nadie. El aviso NO desaparecía nunca.
 *   · `open: false` tampoco: el aviso se seguía pintando igual.
 *   · La X era un <button> sin nada dentro, así que no cerraba.
 *   · Y una vez "cerrado", el aviso no se quitaba de la lista hasta pasados
 *     TOAST_REMOVE_DELAY = 1.000.000 ms, o sea 16 minutos y medio.
 *
 * Con el aviso fijo arriba del todo y a toda anchura (z-100), en el móvil eso
 * tapaba la cabecera entera: ni atrás, ni editar, ni inicio. Y no había forma
 * de quitarlo.
 *
 * QUÉ SE HACE AHORA
 *
 * El resto del programa (unos 35 sitios) ya avisaba con `sonner`, que sí sabe
 * cerrarse solo. Así que en vez de arreglar una segunda tubería para que haga
 * lo mismo, esta pasa a ser un adaptador de la que ya funciona: se mantiene la
 * forma de llamarla —toast({ title, description, variant, duration })— para no
 * tocar las pantallas, y por debajo avisa sonner. Un solo sitio, un solo
 * comportamiento, y los avisos se van solos.
 */
import { toast as sonner } from 'sonner';

/** Lo que dura un aviso en pantalla si nadie dice otra cosa. */
export const DURACION_POR_DEFECTO = 2500;

/** Junta título y texto como los espera sonner. */
function toast({ title, description, variant, duration, ...resto } = {}) {
  const opciones = {
    description: description || undefined,
    duration: Number.isFinite(duration) ? duration : DURACION_POR_DEFECTO,
    ...resto,
  };
  const texto = title || description || '';
  const id = variant === 'destructive'
    ? sonner.error(texto, opciones)
    : sonner.success(texto, opciones);

  return {
    id,
    dismiss: () => sonner.dismiss(id),
    update: ({ title: t, ...r } = {}) => sonner(t || texto, { ...opciones, ...r, id }),
  };
}

function useToast() {
  return {
    toasts: [],           // ya no hace falta pintarlos a mano: lo hace sonner
    toast,
    dismiss: (id) => sonner.dismiss(id),
  };
}

export { useToast, toast };
