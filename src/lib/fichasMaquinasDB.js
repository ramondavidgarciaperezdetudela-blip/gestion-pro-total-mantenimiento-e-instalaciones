import { base44 } from '@/api/base44Client';
import { cargarTodo } from '@/lib/cargarTodo';
import { uploadImage } from '@/lib/uploadImage';
import { iaActivada } from '@/lib/modoSinIA';
import { sePuedeDescargar, descargarDocumento, comoFichero, nombreDesdeUrl, porQueNoSePuede } from '@/lib/documentacionTecnica';
import { claveFicha, encargoFichaIA, limpiarRespuestaIA, urlValida } from '@/lib/fichasMaquinas';
import { diametroDePulgadas } from '@/lib/tuberiaEquipos';

export const cargarFichas = () => cargarTodo('FichaTecnicaMaquina', 'manufacturer').catch(() => []);

/** Guarda una ficha (crea o actualiza) y devuelve el registro. */
export async function guardarFicha(datos, id = null) {
  const limpio = {
    manufacturer: String(datos.manufacturer || '').trim(), model: String(datos.model || '').trim(),
    reference: String(datos.reference || '').trim(), description: String(datos.description || '').trim(),
    equipment_type: datos.equipment_type || undefined,
    url: String(datos.url || '').trim(), file_url: datos.file_url || '', file_name: datos.file_name || '',
    liquid_pipe: datos.liquid_pipe || '', suction_pipe: datos.suction_pipe || '', notes: datos.notes || '', source: datos.source || 'manual',
  };
  if (!limpio.model && !limpio.reference) throw new Error('Pon el modelo o la referencia de la máquina.');
  if (!limpio.model) limpio.model = limpio.reference;
  if (limpio.url && !urlValida(limpio.url)) throw new Error('El enlace tiene que empezar por http:// o https://');
  limpio.key = claveFicha(limpio.manufacturer, limpio.model);
  return id ? base44.entities.FichaTecnicaMaquina.update(id, limpio) : base44.entities.FichaTecnicaMaquina.create(limpio);
}

export const borrarFicha = (id) => base44.entities.FichaTecnicaMaquina.delete(id);

/** Sube un PDF o imagen de la ficha. */
export async function subirCopiaFicha(file) {
  const file_url = await uploadImage(file);
  return { file_url, file_name: file.name };
}

/** Intenta bajar el PDF del enlace y guardarlo. Solo funciona en el programa del ordenador y en la app del móvil. */
export async function guardarCopiaDelEnlace(url) {
  if (!sePuedeDescargar()) return { ok: false, error: porQueNoSePuede() };
  const r = await descargarDocumento(url);
  if (!r.ok) return { ok: false, error: r.error || 'No se ha podido descargar.' };
  const nombre = nombreDesdeUrl(url, 'ficha-tecnica.pdf');
  const { file_url } = await subirCopiaFicha(comoFichero(r.base64, nombre));
  return { ok: true, file_url, file_name: nombre };
}

/**
 * Pregunta a la IA (con búsqueda en internet) por la ficha de una máquina. Solo si la IA está encendida.
 * Devuelve {fabricante, modelo, url, liquido, aspiracion}; todo es una sugerencia que hay que revisar.
 */
export async function buscarFichaConIA(datos) {
  if (!iaActivada()) throw new Error('La ayuda con IA está apagada. Enciéndela en Configuración para buscar sola la ficha.');
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: encargoFichaIA(datos),
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: Object.fromEntries(['fabricante', 'modelo', 'url_ficha', 'conexion_liquido', 'conexion_aspiracion'].map((c) => [c, { type: 'string' }])),
    },
  });
  return limpiarRespuestaIA(r, diametroDePulgadas);
}
