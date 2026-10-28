import React, { useMemo, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { longitudConexion } from '@/lib/planoCalculo';
import { elementoDe, valoresPorDefecto } from '@/lib/planoFrigorificoCatalogo';
import {
  sugerirDiametros, sugerirSeccion, DIAMETROS, SECCIONES,
  TIPOS_CONEXION_ELECTRICA, BUSES_COMUNICACION,
} from '@/lib/instalacionCalculos';

/**
 * Panel de detalles del elemento, pared o conexión seleccionada.
 *
 * Las tuberías piden los diámetros de gas y de líquido, y los SUGIEREN con la
 * potencia del equipo al que van, la longitud dibujada y el desnivel: así no
 * hay que ir a la tabla cada vez. Las conexiones eléctricas piden el tipo de
 * conexión de potencia y de comunicaciones, y sugieren la sección por
 * intensidad y por caída de tensión.
 *
 * Lo que sale de aquí es ORIENTATIVO: el diámetro bueno es el de la ficha
 * técnica del equipo, y la sección la que salga del REBT. Cada sugerencia se
 * presenta como lo que es, con su aviso.
 */

const POWER_OPTS = [
  'Manguera 3G1.5', 'Manguera 3G2.5', 'Manguera 5G6', 'Manguera 5G10', 'Manguera 7G16',
  'Barra omnibus', 'Cable H07RN-F 3G2.5', 'Toma industrial 16A', 'Toma industrial 32A', 'Directo a borne',
];
const TENSIONES = ['230 V monofásica', '400 V trifásica', '24 V', '12 V'];

export default function PlanoEquipoDetalles({ element, wall, connection, elements, scale, onUpdate, onDelete }) {
  if (connection) {
    return (
      <DetalleConexion
        connection={connection} elements={elements} scale={scale}
        onUpdate={onUpdate} onDelete={onDelete} />
    );
  }

  if (wall) {
    const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
    return (
      <div className="flex flex-col gap-2" data-prueba="detalle-pared">
        <div className="tech-label">Pared seleccionada</div>
        <div className="text-sm">Longitud: <span className="font-mono font-bold">{(len / scale).toFixed(2)} m</span></div>
        <button onClick={onDelete} className="flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" /> Borrar pared
        </button>
      </div>
    );
  }

  if (!element) {
    return (
      <div className="text-xs text-muted-foreground p-2" data-prueba="detalle-vacio">
        Selecciona un equipo, una pared o una conexión para ver sus datos.
      </div>
    );
  }

  return <DetalleEquipo element={element} onUpdate={onUpdate} onDelete={onDelete} />;
}

/* ─── Tubería y línea eléctrica ─────────────────────────────────────────── */

function DetalleConexion({ connection, elements, scale, onUpdate, onDelete }) {
  const a = elements.find((e) => e.id === connection.from_id);
  const b = elements.find((e) => e.id === connection.to_id);
  const L = longitudConexion(connection, elements, scale);
  const esRef = connection.type === 'refrigerante';
  const esConducto = connection.type === 'conducto';
  const color = esRef ? '#00A0E9' : esConducto ? '#10b981' : '#F5821F';

  // La potencia sale del equipo al que está enganchada. Puede estar pegada a
  // dos (el grupo y el evaporador): se coge el que la tenga puesta, porque es
  // lo normal que solo se rellene en uno de los dos.
  const extremos = [a, b].filter(Boolean);
  const campoPot = esRef ? 'potencia_w' : 'consumo_w';
  const conDato = extremos.find((e) => Number(e?.datos?.[campoPot]) > 0)
    || extremos.find((e) => Number(e?.datos?.potencia_w) > 0) || extremos[0];
  const potenciaW = Number(connection.power_w ?? conDato?.datos?.[campoPot] ?? conDato?.datos?.potencia_w) || 0;
  const tension = connection.voltage || conDato?.datos?.tension || '230 V monofásica';

  const sugTub = useMemo(
    () => sugerirDiametros({ potenciaW, longitudM: L, desnivelM: Number(connection.height_m) || 0 }),
    [potenciaW, L, connection.height_m],
  );
  const sugEle = useMemo(
    () => sugerirSeccion({ potenciaW, tension, longitudM: L }),
    [potenciaW, tension, L],
  );
  const esComunicacion = connection.conn_kind === 'comunicacion';

  return (
    <div className="flex flex-col gap-2" data-prueba={esRef ? 'detalle-tuberia' : esConducto ? 'detalle-conducto' : 'detalle-electrica'}>
      <div className="flex items-center justify-between">
        <div className="tech-label" style={{ color }}>{esRef ? 'Tubería refrigerante' : esConducto ? 'Conducto / ventilación' : 'Conexión eléctrica'}</div>
        <button onClick={onDelete} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div className="text-xs text-muted-foreground">{(a?.label) || '?'} → {(b?.label) || '?'}</div>
      <div className="text-sm">Longitud: <span className="font-mono font-bold">{L.toFixed(2)} m</span></div>

      {esRef ? (
        <>
          <Campo label="Potencia que mueve (W)">
            <input inputMode="decimal" data-prueba="potencia-tuberia"
              value={connection.power_w ?? conDato?.datos?.potencia_w ?? ''}
              onChange={(e) => onUpdate({ power_w: e.target.value })}
              placeholder="de la placa del equipo"
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </Campo>
          <Campo label="Desnivel (m, negativo si baja)">
            <input inputMode="decimal" value={connection.height_m ?? ''}
              onChange={(e) => onUpdate({ height_m: e.target.value })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Línea de gas">
              <select value={connection.gas_diameter || sugTub.gas?.pulgadas || ''} data-prueba="gas-tuberia"
                onChange={(e) => onUpdate({ gas_diameter: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                <option value="">—</option>
                {DIAMETROS.map((d) => <option key={d.pulgadas} value={d.pulgadas}>{d.pulgadas} ({d.mm} mm)</option>)}
              </select>
            </Campo>
            <Campo label="Línea de líquido">
              <select value={connection.liquid_diameter || sugTub.liquido?.pulgadas || ''} data-prueba="liquido-tuberia"
                onChange={(e) => onUpdate({ liquid_diameter: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                <option value="">—</option>
                {DIAMETROS.map((d) => <option key={d.pulgadas} value={d.pulgadas}>{d.pulgadas} ({d.mm} mm)</option>)}
              </select>
            </Campo>
          </div>
          {sugTub.gas ? (
            <div className="rounded-md px-2 py-1.5 text-[11px]" data-prueba="sugerencia-tuberia"
              style={{ background: '#00A0E915', color: '#0369a1' }}>
              <p><b>Sugerencia:</b> gas {sugTub.gas.pulgadas} · líquido {sugTub.liquido.pulgadas}</p>
              {sugTub.cargaEstimadaG > 0 && <p>Carga en la línea de líquido: ≈ {sugTub.cargaEstimadaG} g</p>}
            </div>
          ) : (
            <p className="rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground" data-prueba="sugerencia-tuberia">
              Pon la potencia (aquí o en la ficha del equipo) y te digo los diámetros de gas y de líquido.
            </p>
          )}
          <Avisos lista={sugTub.avisos} />
          <p className="text-[10px] leading-snug text-muted-foreground">
            Diámetros orientativos: el bueno es el de la ficha técnica del equipo.
          </p>
        </>
      ) : esConducto ? (
        <>
          <Campo label="Forma del conducto">
            <select value={connection.duct_shape || 'Rectangular'} data-prueba="forma-conducto"
              onChange={(e) => onUpdate({ duct_shape: e.target.value })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
              <option value="Rectangular">Rectangular</option>
              <option value="Circular">Circular</option>
              <option value="Flexible">Flexible</option>
            </select>
          </Campo>
          <Campo label="Sección / diámetro (mm)">
            <input value={connection.duct_section || ''} data-prueba="seccion-conducto"
              onChange={(e) => onUpdate({ duct_section: e.target.value })}
              placeholder="p. ej. 400×200 o Ø250"
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </Campo>
          <Campo label="Caudal (m³/h)">
            <input inputMode="decimal" value={connection.duct_caudal_m3h ?? conDato?.datos?.caudal_m3h ?? ''}
              data-prueba="caudal-conducto"
              onChange={(e) => onUpdate({ duct_caudal_m3h: e.target.value })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </Campo>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Conducto de distribución de aire. La sección sale del caudal y la velocidad recomendada (2-5 m/s).
          </p>
        </>
      ) : (
        <>
          <Campo label="Qué lleva esta línea">
            <select value={connection.conn_kind || 'potencia'} data-prueba="tipo-electrico"
              onChange={(e) => onUpdate({ conn_kind: e.target.value })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
              {TIPOS_CONEXION_ELECTRICA.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </Campo>

          {esComunicacion ? (
            <>
              <Campo label="Bus / protocolo">
                <select value={connection.comm_type || ''} data-prueba="bus-comunicacion"
                  onChange={(e) => onUpdate({ comm_type: e.target.value })}
                  className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                  <option value="">— Selecciona —</option>
                  {BUSES_COMUNICACION.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Campo>
              <Campo label="Cable">
                <input value={connection.cable || ''} onChange={(e) => onUpdate({ cable: e.target.value })}
                  placeholder="p. ej. 2×0,75 apantallado"
                  className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
              </Campo>
              <p className="text-[10px] leading-snug text-muted-foreground">
                El bus de datos va separado de la fuerza para que no le entren interferencias.
              </p>
            </>
          ) : (
            <>
              <Campo label="Conexión de potencia">
                <select value={connection.power_type || ''} data-prueba="conexion-potencia"
                  onChange={(e) => onUpdate({ power_type: e.target.value })}
                  className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                  <option value="">— Selecciona —</option>
                  {POWER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Potencia (W)">
                  <input inputMode="decimal" data-prueba="potencia-electrico"
                    value={connection.power_w ?? conDato?.datos?.consumo_w ?? ''}
                    onChange={(e) => onUpdate({ power_w: e.target.value })}
                    className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
                </Campo>
                <Campo label="Tensión">
                  <select value={tension} data-prueba="tension-electrico"
                    onChange={(e) => onUpdate({ voltage: e.target.value })}
                    className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                    {TENSIONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Campo>
              </div>
              <Campo label="Sección (mm²)">
                <select value={connection.section_mm2 || sugEle.seccion?.mm2 || ''} data-prueba="seccion-electrico"
                  onChange={(e) => onUpdate({ section_mm2: e.target.value })}
                  className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                  <option value="">—</option>
                  {SECCIONES.map((s) => <option key={s.mm2} value={s.mm2}>{s.mm2} mm²</option>)}
                </select>
              </Campo>
              {sugEle.seccion ? (
                <div className="rounded-md px-2 py-1.5 text-[11px]" data-prueba="sugerencia-electrico"
                  style={{ background: '#F5821F15', color: '#b45309' }}>
                  <b>Sugerencia:</b> {sugEle.seccion.mm2} mm² · {sugEle.intensidadA} A {sugEle.trifasica ? '(trifásica)' : '(monofásica)'}
                </div>
              ) : (
                <p className="rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground" data-prueba="sugerencia-electrico">
                  Pon la potencia y te digo la sección que pide, por corriente y por caída de tensión.
                </p>
              )}
              <Avisos lista={sugEle.avisos} />
            </>
          )}

          <Campo label="Conexión de comunicaciones">
            <select value={connection.comm_type || ''}
              onChange={(e) => onUpdate({ comm_type: e.target.value })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
              <option value="">Sin comunicación</option>
              {BUSES_COMUNICACION.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Campo>
        </>
      )}

      <Campo label="Notas">
        <textarea value={connection.notes || ''} onChange={(e) => onUpdate({ notes: e.target.value })} rows={2}
          className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs resize-none" />
      </Campo>
    </div>
  );
}

/* ─── Equipo ────────────────────────────────────────────────────────────── */

function DetalleEquipo({ element, onUpdate, onDelete }) {
  const def = elementoDe(element.type || element.id);
  const datos = element.datos || {};
  const poner = (id, v) => onUpdate({ datos: { ...datos, [id]: v } });

  // La primera vez que se abre un equipo, los valores por defecto de su ficha:
  // un diferencial casi siempre es 30 mA clase A, y escribirlo cada vez sobra.
  useEffect(() => {
    if (Object.keys(datos).length === 0) {
      const d = valoresPorDefecto(element.type || element.id);
      if (Object.keys(d).length) onUpdate({ datos: d });
    }
  }, [element.id]);

  return (
    <div className="flex flex-col gap-2" data-prueba="detalle-equipo">
      <div className="flex items-center justify-between">
        <div className="tech-label" style={{ color: element.color }}>{def?.label || element.label}</div>
        <button onClick={onDelete} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <Campo label="Etiqueta">
        <input value={element.label || ''} onChange={(e) => onUpdate({ label: e.target.value })}
          data-prueba="etiqueta-equipo" placeholder="UC-1, Cámara 2…"
          className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Marca">
          <input value={element.brand || ''} onChange={(e) => onUpdate({ brand: e.target.value })}
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
        <Campo label="Modelo">
          <input value={element.model || ''} onChange={(e) => onUpdate({ model: e.target.value })}
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
      </div>

      {/* Lo que pide este equipo en concreto, según el catálogo. */}
      {(def?.campos || []).map((c) => (
        <Campo key={c.id} label={c.etiqueta}>
          {c.tipo === 'opcion' ? (
            <select value={datos[c.id] ?? c.porDefecto ?? ''} data-prueba={`campo-${c.id}`}
              onChange={(e) => poner(c.id, e.target.value)}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
              <option value="">—</option>
              {c.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
              value={datos[c.id] ?? ''} data-prueba={`campo-${c.id}`}
              onChange={(e) => poner(c.id, e.target.value)}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          )}
          {c.ayuda && <span className="text-[10px] text-muted-foreground">{c.ayuda}</span>}
        </Campo>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tamaño (m)">
          <div className="flex gap-1">
            <input type="number" step="0.1" value={element.w_m ?? ''} onChange={(e) => onUpdate({ w_m: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
            <input type="number" step="0.1" value={element.h_m ?? ''} onChange={(e) => onUpdate({ h_m: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </div>
        </Campo>
        <Campo label="Cantidad">
          <input type="number" min="1" value={element.qty ?? 1} onChange={(e) => onUpdate({ qty: parseInt(e.target.value, 10) || 1 })}
            data-prueba="cantidad-equipo"
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
      </div>

      {def?.nota && (
        <p className="flex gap-1 rounded-md px-2 py-1.5 text-[10px] leading-snug"
          style={{ background: '#E5484D15', color: '#b91c1c' }} data-prueba="nota-equipo">
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />{def.nota}
        </p>
      )}

      <Campo label="Notas">
        <textarea value={element.notes || ''} onChange={(e) => onUpdate({ notes: e.target.value })} rows={2}
          className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs resize-none" />
      </Campo>
    </div>
  );
}

function Avisos({ lista = [] }) {
  if (!lista.length) return null;
  return (
    <div className="flex flex-col gap-1">
      {lista.map((a, i) => (
        <p key={i} className="flex gap-1 text-[10px] leading-snug text-amber-600">
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />{a}
        </p>
      ))}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}