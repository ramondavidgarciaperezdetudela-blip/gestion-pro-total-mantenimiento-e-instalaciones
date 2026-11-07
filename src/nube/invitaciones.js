// Dar de alta a otra persona sin Base44. En servidor propio la crea el
// administrador con una clave provisional que se le entrega a mano; en
// Supabase las cuentas se crean desde su panel; en local no hay cuentas.
import { leerConfig, leerSesion } from './config';
import { errorHttp, leerError } from './errores';

export async function invitarUsuario(email, role = 'user') {
  const c = leerConfig();
  if (!c || c.modo === 'local') {
    throw errorHttp(400, 'En el modo «solo este dispositivo» no hay cuentas: quien usa el aparato es el administrador.');
  }
  if (c.modo !== 'servidor') {
    throw errorHttp(400, 'Con Supabase las cuentas se crean en su panel (Authentication → Users → Add user).');
  }
  const clave = `GPT-${Math.random().toString(36).slice(2, 8)}${Math.floor(1000 + Math.random() * 9000)}`;
  const r = await fetch(`${c.url}/api/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leerSesion()?.token || ''}` },
    body: JSON.stringify({ email, password: clave, role, nombre: email }),
  }).catch(() => { throw errorHttp(0, 'No hay conexión con el servidor.'); });
  if (!r.ok) throw await leerError(r);
  return { email, role, clave_provisional: clave };
}
