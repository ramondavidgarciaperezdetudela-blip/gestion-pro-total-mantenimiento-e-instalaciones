import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PhotoGallery from './PhotoGallery';
import {
  SECCIONES, FOTOS, clave, veredicto, ETIQUETA_VEREDICTO, fichaVacia,
  elegidasDe, conLaOpcionCambiada,
} from '@/lib/inspeccionSanitaria';

/**
 * La hoja de inspección técnico-sanitaria, dentro de la ficha de la cámara.
 *
 * Se rellena tocando, no escribiendo: el técnico está de pie delante de la
 * máquina, muchas veces con guantes y con el móvil en una mano. Por eso cada
 * punto son botones grandes y no un desplegable, y por eso el veredicto se ve
 * arriba y cambia según se va contestando: así se sabe qué falta sin tener que
 * bajar hasta el final.
 */

const COLORES = {
  conforme: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  conforme_con_observaciones: 'bg-amber-100 text-amber-800 border-amber-300',
  no_conforme: 'bg-red-100 text-red-800 border-red-300',
  sin_datos: 'bg-slate-100 text-slate-600 border-slate-300',
};

export default function InspeccionSanitaria({ ficha, onChange }) {
  const datos = { ...fichaVacia(), ...(ficha || {}) };
  const v = veredicto(datos);
  const marca = ETIQUETA_VEREDICTO[v.estado];

  const cambiar = (parche) => onChange({ ...datos, ...parche });
  const responder = (k, valor) => cambiar({ respuestas: { ...datos.respuestas, [k]: valor } });
  // Se puede marcar más de una: una máquina puede estar sucia Y con las aletas
  // dobladas, y obligar a elegir una sola era dejar fuera media avería.
  const alternar = (seccionId, puntoId, opcion) => onChange(conLaOpcionCambiada(datos, seccionId, puntoId, opcion));
  const medir = (k, valor) => cambiar({ medidas: { ...datos.medidas, [k]: valor } });
  const observar = (id, valor) => cambiar({ observaciones: { ...datos.observaciones, [id]: valor } });
  const fotografiar = (id, lista) => cambiar({ fotos: { ...datos.fotos, [id]: lista } });

  return (
    <div className="space-y-4" data-prueba="inspeccion-sanitaria">
      <div className={`rounded-xl border-2 p-3 ${COLORES[v.estado]}`} data-prueba="veredicto-sanitario">
        <p className="text-sm font-extrabold tracking-wide">{marca.texto}</p>
        <p className="mt-0.5 text-xs">
          {v.correctos} conformes · {v.deficiencias.length} deficiencias
          {v.sinContestar > 0 && ` · ${v.sinContestar} sin revisar`}
        </p>
        <p className="mt-1 text-[11px] opacity-80">
          Esto es lo que verá el inspector nada más coger la hoja. Se calcula solo con lo que vas marcando.
          Puedes marcar <strong>varias opciones</strong> en cada punto, y lo que no esté en la lista lo
          escribes en las observaciones del apartado.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[10px] text-gray-500">Establecimiento</label>
          <Input value={datos.establecimiento} placeholder="Nombre del comercio"
            onChange={(e) => cambiar({ establecimiento: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">Actividad</label>
          <Input value={datos.actividad} placeholder="Carnicería, frutería, restaurante…"
            onChange={(e) => cambiar({ actividad: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">Nº de registro sanitario</label>
          <Input value={datos.registro_sanitario}
            onChange={(e) => cambiar({ registro_sanitario: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">Nº de instalador / carné</label>
          <Input value={datos.carne_instalador}
            onChange={(e) => cambiar({ carne_instalador: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] text-gray-500">Motivo de la visita</label>
          <Input value={datos.motivo} placeholder="Aviso de urgencia por pérdida de frío"
            onChange={(e) => cambiar({ motivo: e.target.value })} />
        </div>
      </div>

      {SECCIONES.map((seccion) => (
        <div key={seccion.id} className="rounded-xl border border-slate-200 p-3">
          <p className="mb-2 text-xs font-bold text-slate-700">
            {seccion.numero}. {seccion.titulo}
          </p>

          {seccion.tipo === 'una' ? (
            <div className="space-y-2">
              {seccion.puntos.map((punto) => {
                const k = clave(seccion.id, punto.id);
                const elegidas = elegidasDe(datos, seccion.id, punto.id);
                return (
                  <div key={punto.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-[11px] font-medium text-slate-700">{punto.etiqueta}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {punto.opciones.map((opcion, i) => {
                        const puesta = elegidas.includes(opcion);
                        const buena = i === 0;
                        return (
                          <button
                            key={opcion}
                            type="button"
                            data-prueba={`punto-${k}`}
                            aria-pressed={puesta}
                            onClick={() => alternar(seccion.id, punto.id, opcion)}
                            className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
                              puesta
                                ? (buena
                                  ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-800'
                                  : 'border-red-500 bg-red-50 font-semibold text-red-800')
                                : 'border-slate-200 text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {opcion}
                          </button>
                        );
                      })}
                      {punto.medida && (
                        <span className="flex items-center gap-1">
                          <Input
                            className="h-8 w-24 text-[11px]"
                            placeholder={punto.medida.etiqueta}
                            value={datos.medidas[k] ?? ''}
                            onChange={(e) => medir(k, e.target.value)}
                            aria-label={`${punto.etiqueta} — ${punto.medida.etiqueta}`}
                          />
                          <span className="text-[10px] text-slate-500">{punto.medida.unidad}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {seccion.puntos.map((punto) => {
                const k = clave(seccion.id, punto.id);
                const puesto = datos.respuestas[k] === true;
                return (
                  <label
                    key={punto.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-[11px] ${
                      puesto ? 'border-slate-800 bg-slate-50 font-medium' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={puesto}
                      data-prueba={`punto-${k}`}
                      onChange={(e) => responder(k, e.target.checked)}
                    />
                    <span>{punto.etiqueta}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-2 rounded-lg bg-slate-50 p-2">
            <p className="text-[10px] font-semibold text-slate-600">
              ¿Falta alguna opción, o quieres detallar algo de este apartado?
            </p>
            <p className="mb-1 text-[10px] text-slate-500">
              Escríbelo aquí y sale impreso en la hoja, justo debajo de estos puntos.
            </p>
            <Textarea
              className="text-[11px] bg-white"
              rows={2}
              placeholder="Por ejemplo: «el desagüe vierte a la sala, se avisa al titular»"
              value={datos.observaciones[seccion.id] || ''}
              onChange={(e) => observar(seccion.id, e.target.value)}
              aria-label={`Observaciones de ${seccion.titulo}`}
              data-prueba={`observaciones-${seccion.id}`}
            />
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-1 text-xs font-bold text-slate-700">6. Anexo fotográfico de la intervención</p>
        <p className="mb-2 text-[11px] text-slate-500">
          Son las fotos del día, las que demuestran cómo quedó la cámara. Salen en la hoja
          en este mismo orden y con su explicación debajo.
        </p>
        <div className="space-y-3">
          {FOTOS.map((bloque, i) => (
            <div key={bloque.id}>
              <p className="text-[11px] font-semibold text-slate-700">Foto {i + 1} · {bloque.titulo}</p>
              <p className="text-[10px] text-slate-500">{bloque.descripcion}</p>
              <PhotoGallery
                photos={datos.fotos[bloque.id] || []}
                onChange={(lista) => fotografiar(bloque.id, lista)}
                label=""
                maxPhotos={30}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
