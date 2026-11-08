// El puente entre un módulo (aislado en su iframe) y el programa.
// Cada petición del módulo se comprueba aquí: operación conocida, entidad permitida,
// permiso concedido, tamaños razonables y nada de campos sensibles.
import { ENTIDADES_PROHIBIDAS, permitido, quitaCamposSensibles, tieneCamposSensibles } from './permisos.js';

const RE_ENTIDAD = /^[A-Za-z][A-Za-z0-9_]{0,60}$/;
const RE_COLECCION = /^[A-Za-z0-9_\-]{1,60}$/;
const RE_PAGINA = /^[A-Za-z0-9]{1,60}(\?[A-Za-z0-9=&_%\-]{0,200})?$/;
const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const LIMITES = {
  filas: 500, bytesDatos: 200 * 1024, bytesRespuesta: 1024 * 1024, esperaHttp: 20000,
  consultasIA: 20, textoIA: 20000, textoAviso: 300
};

const falla = (msg) => { throw new Error(msg); };
const tamano = (x) => { try { return JSON.stringify(x ?? null).length; } catch { return Infinity; } };

function entidadValida(nombre) {
  if (typeof nombre !== 'string' || !RE_ENTIDAD.test(nombre)) falla('Nombre de entidad no válido.');
  if (ENTIDADES_PROHIBIDAS.has(nombre)) falla(`La entidad «${nombre}» no está disponible para módulos.`);
  return nombre;
}

function exigir(concedidos, accion, objetivo) {
  if (!permitido(concedidos, accion, objetivo)) {
    falla(accion === 'ia' ? 'Este módulo no tiene permiso para usar la IA.'
      : `Este módulo no tiene permiso «${accion}» sobre «${objetivo}». Se concede al activarlo.`);
  }
}

function datosValidos(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) falla('Los datos deben ser un objeto.');
  if (tamano(datos) > LIMITES.bytesDatos) falla('Los datos son demasiado grandes.');
  if (tieneCamposSensibles(datos)) falla('No se pueden escribir campos de contraseñas, claves o cuentas desde un módulo.');
  return datos;
}

/** Une el conector con la ruta pedida sin dejar que el módulo salga de su dirección base. */
export function urlDelConector(conector, ruta) {
  const base = String(conector?.url_base || '').replace(/\/+$/, '');
  if (!/^https:\/\//i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base)) falla('El conector necesita una dirección https.');
  const r = String(ruta ?? '');
  if (r && !r.startsWith('/') && !r.startsWith('?')) falla('La ruta debe empezar por /');
  if (r.startsWith('//') || /^[a-z]+:/i.test(r) || r.includes('..') || r.includes('\\')) falla('Ruta no permitida.');
  return base + r;
}

/**
 * @param {object} o
 *  base44      cliente de datos (entities.X.list/filter/get/create/update/delete)
 *  modulo      { id, nombre }
 *  concedidos  permisos concedidos
 *  modoPrueba  true = lectura real, escrituras/envíos simulados, almacenamiento propio en memoria
 *  conectores  lista de ConectorIA activos { nombre, url_base, cabecera_nombre }
 *  secretoDe   (conector) => valor de la cabecera (guardado solo en este aparato)
 *  fetchFn     fetch
 *  preguntarIA (pregunta, sistema) => texto
 *  avisar(texto, tipo), irA(pagina)
 * @returns {(op:string, args:object) => Promise<any>}
 */
export function crearPuente({
  base44, modulo, concedidos = [], modoPrueba = false, conectores = [], secretoDe = () => '',
  fetchFn = (...a) => fetch(...a), preguntarIA, avisar = () => {}, irA = () => {}, registrar = () => {}
}) {
  const memoria = new Map(); // almacenamiento propio en modo prueba
  let consultasIA = 0;
  const ent = (n) => base44.entities[n];

  const operaciones = {
    async listar({ entidad, filtro, orden, limite }) {
      entidadValida(entidad); exigir(concedidos, 'leer', entidad);
      const lim = Math.min(Math.max(parseInt(limite, 10) || 100, 1), LIMITES.filas);
      const ordenOk = typeof orden === 'string' && /^-?[A-Za-z0-9_]{1,60}$/.test(orden) ? orden : undefined;
      const hayFiltro = filtro && typeof filtro === 'object' && !Array.isArray(filtro) && Object.keys(filtro).length;
      const filas = hayFiltro ? await ent(entidad).filter(filtro, ordenOk, lim) : await ent(entidad).list(ordenOk, lim);
      return quitaCamposSensibles((filas || []).slice(0, lim));
    },
    async obtener({ entidad, id }) {
      entidadValida(entidad); exigir(concedidos, 'leer', entidad);
      if (typeof id !== 'string' || !id) falla('Falta el id.');
      const r = await ent(entidad).get(id);
      return r ? quitaCamposSensibles(r) : null;
    },
    async crear({ entidad, datos }) {
      entidadValida(entidad); exigir(concedidos, 'crear', entidad); datosValidos(datos);
      if (modoPrueba) { registrar(`(simulado) crear en ${entidad}`); return { simulado: true, id: 'simulado', ...datos }; }
      return quitaCamposSensibles(await ent(entidad).create(datos));
    },
    async editar({ entidad, id, datos }) {
      entidadValida(entidad); exigir(concedidos, 'editar', entidad); datosValidos(datos);
      if (typeof id !== 'string' || !id) falla('Falta el id.');
      if (modoPrueba) { registrar(`(simulado) editar ${entidad} ${id}`); return { simulado: true, id, ...datos }; }
      return quitaCamposSensibles(await ent(entidad).update(id, datos));
    },
    async borrar({ entidad, id }) {
      entidadValida(entidad); exigir(concedidos, 'borrar', entidad);
      if (typeof id !== 'string' || !id) falla('Falta el id.');
      if (modoPrueba) { registrar(`(simulado) borrar ${entidad} ${id}`); return { simulado: true }; }
      await ent(entidad).delete(id);
      return { ok: true };
    },

    // Almacenamiento propio del módulo (no necesita permiso): colección + clave → datos.
    async guardar({ coleccion, clave, datos }) {
      if (!RE_COLECCION.test(String(coleccion))) falla('Nombre de colección no válido.');
      if (!RE_COLECCION.test(String(clave))) falla('Clave no válida.');
      datosValidos(datos);
      if (modoPrueba) { memoria.set(`${coleccion}\u0000${clave}`, datos); return { ok: true }; }
      const previos = await ent('DatoModulo').filter({ modulo_id: modulo.id, coleccion, clave });
      if (previos?.length) await ent('DatoModulo').update(previos[0].id, { datos });
      else await ent('DatoModulo').create({ modulo_id: modulo.id, coleccion, clave, datos });
      return { ok: true };
    },
    async leer({ coleccion, clave }) {
      if (!RE_COLECCION.test(String(coleccion)) || !RE_COLECCION.test(String(clave))) falla('Colección o clave no válida.');
      if (modoPrueba) return memoria.get(`${coleccion}\u0000${clave}`) ?? null;
      const r = await ent('DatoModulo').filter({ modulo_id: modulo.id, coleccion, clave });
      return r?.[0]?.datos ?? null;
    },
    async listarColeccion({ coleccion }) {
      if (!RE_COLECCION.test(String(coleccion))) falla('Colección no válida.');
      if (modoPrueba) {
        return [...memoria.entries()].filter(([k]) => k.startsWith(`${coleccion}\u0000`)).map(([k, datos]) => ({ clave: k.split('\u0000')[1], datos }));
      }
      const r = await ent('DatoModulo').filter({ modulo_id: modulo.id, coleccion }, undefined, LIMITES.filas);
      return (r || []).map((x) => ({ clave: x.clave, datos: x.datos }));
    },
    async borrarDato({ coleccion, clave }) {
      if (!RE_COLECCION.test(String(coleccion)) || !RE_COLECCION.test(String(clave))) falla('Colección o clave no válida.');
      if (modoPrueba) { memoria.delete(`${coleccion}\u0000${clave}`); return { ok: true }; }
      const r = await ent('DatoModulo').filter({ modulo_id: modulo.id, coleccion, clave });
      for (const x of r || []) await ent('DatoModulo').delete(x.id);
      return { ok: true };
    },

    async http({ conector, metodo = 'GET', ruta = '', cuerpo }) {
      exigir(concedidos, 'http', conector);
      const c = conectores.find((x) => x.nombre === conector && x.activo !== false);
      if (!c) falla(`El conector «${conector}» no existe o está desactivado.`);
      const m = String(metodo).toUpperCase();
      if (!METODOS.includes(m)) falla('Método no permitido.');
      const url = urlDelConector(c, ruta);
      if (cuerpo !== undefined && tamano(cuerpo) > LIMITES.bytesDatos) falla('El cuerpo es demasiado grande.');
      if (modoPrueba && m !== 'GET') { registrar(`(simulado) ${m} ${conector}${ruta}`); return { simulado: true, estado: 200, datos: null }; }
      const cabeceras = { Accept: 'application/json' };
      if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
      const secreto = secretoDe(c);
      if (c.cabecera_nombre && secreto) cabeceras[c.cabecera_nombre] = secreto;
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), LIMITES.esperaHttp);
      try {
        const r = await fetchFn(url, { method: m, headers: cabeceras, body: cuerpo === undefined || m === 'GET' ? undefined : JSON.stringify(cuerpo), signal: ctl.signal, redirect: 'error' });
        const texto = (await r.text()).slice(0, LIMITES.bytesRespuesta);
        let datos = texto;
        try { datos = JSON.parse(texto); } catch { /* texto plano */ }
        return { estado: r.status, ok: r.ok, datos };
      } catch (e) {
        falla(e?.name === 'AbortError' ? 'El conector tardó demasiado en responder.' : `No se pudo llamar al conector: ${e?.message || 'error de red'}`);
      } finally { clearTimeout(t); }
    },

    async ia({ pregunta, sistema }) {
      exigir(concedidos, 'ia');
      if (typeof pregunta !== 'string' || !pregunta.trim()) falla('Falta la pregunta.');
      if (pregunta.length + String(sistema || '').length > LIMITES.textoIA) falla('El texto para la IA es demasiado largo.');
      if (++consultasIA > LIMITES.consultasIA) falla('Este módulo ha hecho demasiadas consultas a la IA seguidas.');
      if (!preguntarIA) falla('La IA no está configurada. Pon tu clave de Anthropic en el Centro de IA.');
      return await preguntarIA(pregunta, typeof sistema === 'string' ? sistema : '');
    },
    async aviso({ texto, tipo }) {
      avisar(String(texto ?? '').slice(0, LIMITES.textoAviso), tipo === 'error' ? 'error' : 'ok');
      return { ok: true };
    },
    async irA({ pagina }) {
      if (typeof pagina !== 'string' || !RE_PAGINA.test(pagina)) falla('Pantalla no válida.');
      irA(pagina);
      return { ok: true };
    }
  };

  return async function manejar(op, args) {
    const f = Object.prototype.hasOwnProperty.call(operaciones, op) ? operaciones[op] : null;
    if (!f) falla('Operación desconocida.');
    return f(args && typeof args === 'object' ? args : {});
  };
}
