import { leerConfig } from './config';
import { almacenLocal } from './almacenLocal';
import { almacenServidor, almacenSupabase } from './almacenRemoto';

/** El almacén que toca según lo elegido al instalar. */
export function almacenActivo() {
  const c = leerConfig();
  if (!c) throw new Error('Aún no has elegido dónde guardar los datos.');
  if (c.modo === 'supabase') return almacenSupabase;
  if (c.modo === 'servidor') return almacenServidor;
  return almacenLocal;
}
