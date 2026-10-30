// Sustituto del cliente de Base44: misma forma, sin servicio externo.
import { crearEntidad } from './entidad';
import { auth } from './autenticacion';
import { invitarUsuario } from './invitaciones';
import { integrations } from './integraciones';
import { functions } from './funciones';

export function createClient() {
  const cache = {};
  const entities = new Proxy({}, {
    get(_t, nombre) {
      if (typeof nombre !== 'string' || nombre === 'then' || nombre.startsWith('_')) return undefined;
      if (!cache[nombre]) cache[nombre] = crearEntidad(nombre);
      return cache[nombre];
    },
  });
  return {
    entities,
    auth,
    integrations,
    functions,
    appLogs: { logUserInApp: async () => ({}) },
    users: { inviteUser: invitarUsuario },
    asServiceRole: { entities, integrations },
    setToken() {},
  };
}
