import React, { useMemo, useEffect } from 'react';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Trash2, AlertTriangle, Ruler, Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import SelectorColor from './SelectorColor';
import { NumberField } from '@/components/ui/number-field';
import { ALTURA_SUELO, ALTURA_CAMARA, altoEquipo, altoPared, cotaEquipo, techoEn, tieneCotaPropia } from '@/lib/planoVista3D';
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

export default function PlanoEquipoDetalles({
  element, wall, connection, elements, walls = [], scale, onUpdate, onDelete,
  onEditarSala, onBorrarSala, onEditarCamara, onBorrarCamara, onAltoRecinto, onAltoPared,
}) {
  if (connection) {
    return (
      <DetalleConexion
        connection={connection} elements={elements} scale={scale}
        onUpdate={onUpdate} onDelete={onDelete} />
    );
  }

  if (wall) {
    const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
    // Si la pared pertenece a una sala (habitáculo cuadrado/rectangular), se
    // ofrecen los controles de la sala: cambiar sus medidas redibuja las
    // cuatro paredes, y borrar la sala quita las cuatro a la vez.
    if (wall.room_id) {
      const camara = !!wall.camara;
      const color = camara ? (wall.tipo === 'negativa' ? '#ef4444' : '#3b82f6') : '#0ea5e9';
      const alto = altoPared(wall);
      return (
        <div className="flex flex-col gap-2" data-prueba={camara ? 'detalle-camara' : 'detalle-sala'}>
          <div className="tech-label" style={{ color }}>{camara ? `Cámara ${wall.tipo === 'negativa' ? 'negativa' : 'positiva'} seleccionada` : 'Sala seleccionada'}</div>
          <div className="rounded-md px-2 py-1.5 text-[11px]" style={{ background: color + '15', color }}>
            <b>Medidas:</b> {wall.room_w_m} × {wall.room_h_m} m · <b>alto</b> {String(alto).replace('.', ',')} m
            {camara && <><br /><b>Panel:</b> {wall.espesor_mm || 100} mm{wall.suelo ? ' · con suelo sanitario' : ''}</>}
            <br />
            <span className="text-[10px]">Cambia las medidas y el alto para redibujarla; el 3D usa este alto.</span>
          </div>
          <Campo label="Alto de las paredes (m)">
            <NumberField value={wall.alto_m ?? ''} data-prueba="alto-recinto"
              placeholder={String(camara ? ALTURA_CAMARA : ALTURA_SUELO).replace('.', ',')}
              onChange={(v) => onAltoRecinto && onAltoRecinto(wall.room_id, v)}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </Campo>
          <button onClick={() => (camara ? onEditarCamara : onEditarSala) && (camara ? onEditarCamara : onEditarSala)(wall.room_id)}
            className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-white hover:opacity-90"
            style={{ background: color }}>
            <Ruler className="w-3.5 h-3.5" /> {camara ? 'Editar cámara' : 'Cambiar medidas'}
          </button>
          <button onClick={() => (camara ? onBorrarCamara : onBorrarSala) && (camara ? onBorrarCamara : onBorrarSala)(wall.room_id)}
            className="flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" /> {camara ? 'Borrar cámara' : 'Borrar sala'}
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2" data-prueba="detalle-pared">
        <div className="tech-label">Pared seleccionada</div>
        <div className="text-sm">Longitud: <span className="font-mono font-bold">{(len / scale).toFixed(2)} m</span></div>
        <Campo label="Alto de la pared (m)">
          <NumberField value={wall.alto_m ?? ''} data-prueba="alto-pared"
            placeholder={String(ALTURA_SUELO).replace('.', ',')}
            onChange={(v) => onAltoPared && onAltoPared(wall.id, v)}
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
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

  return <DetalleEquipo element={element} walls={walls} onUpdate={onUpdate} onDelete={onDelete} scale={scale} />;
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

function DetalleEquipo({ element, walls = [], onUpdate, onDelete, scale }) {
  const def = elementoDe(element.type || element.id);
  const techo = techoEn(element, walls, scale || 50);
  const alto = altoEquipo(element);
  const cota = cotaEquipo(element, walls, scale || 50);
  const propia = tieneCotaPropia(element);
  const coma = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
  // Los botones cambian valores desde fuera: se vuelve a montar el campo para que los muestre.
  const [kb, setKb] = React.useState(0);
  const act = (patch) => { onUpdate(patch); setKb((n) => n + 1); };
  const datos = element.datos || {};
  const poner = (id, v) => onUpdate({ datos: { ...datos, [id]: v } });
  // Paso de movimiento fino: 0,1 m en píxeles del lienzo. Sirve para ajustar la
  // posición del equipo con flechas en móvil, donde arrastrar es incómodo.
  const paso = Math.max(2, 0.1 * (scale || 50));
  const mover = (dx, dy) => onUpdate({ x: (element.x || 0) + dx, y: (element.y || 0) + dy });

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
        <Campo label="Ancho × fondo (m)">
          <div className="flex gap-1">
            <NumberField value={element.w_m ?? ''} onChange={(v) => onUpdate({ w_m: v })} data-prueba="ancho-equipo"
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
            <NumberField value={element.h_m ?? ''} onChange={(v) => onUpdate({ h_m: v })} data-prueba="fondo-equipo"
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </div>
        </Campo>
        <Campo label="Cantidad">
          <input type="number" min="1" value={element.qty ?? 1} onChange={(e) => onUpdate({ qty: parseInt(e.target.value, 10) || 1 })}
            data-prueba="cantidad-equipo"
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
      </div>

      {/* Girar e invertir el icono (por ejemplo, una puerta que abre hacia fuera). */}
      <div className="flex flex-col gap-1.5 rounded-md border border-border p-2" data-prueba="girar-equipo">
        <span className="tech-label">Girar e invertir</span>
        <div className="flex flex-wrap gap-1">
          <button type="button" data-prueba="girar-izq" onClick={() => act({ rot: (((Number(element.rot) || 0) - 90) % 360 + 360) % 360 })}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-muted"><RotateCcw className="w-3 h-3" /> 90°</button>
          <button type="button" data-prueba="girar-der" onClick={() => act({ rot: ((Number(element.rot) || 0) + 90) % 360 })}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-muted"><RotateCw className="w-3 h-3" /> 90°</button>
          <button type="button" data-prueba="invertir-h" onClick={() => act({ flip_x: !element.flip_x })}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] hover:bg-muted ${element.flip_x ? 'border-primary text-primary' : 'border-border'}`}><FlipHorizontal className="w-3 h-3" /> Izq/Der</button>
          <button type="button" data-prueba="invertir-v" onClick={() => act({ flip_y: !element.flip_y })}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] hover:bg-muted ${element.flip_y ? 'border-primary text-primary' : 'border-border'}`}><FlipVertical className="w-3 h-3" /> Arriba/Abajo</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Ángulo (°)</span>
          <NumberField key={`rot${kb}`} value={element.rot ?? ''} onChange={(v) => onUpdate({ rot: ((v % 360) + 360) % 360 })} data-prueba="angulo-equipo"
            className="w-20 rounded-md border border-border bg-input px-2 py-1 text-xs" />
          <button type="button" onClick={() => act({ rot: 0, flip_x: false, flip_y: false })} className="text-[10px] underline text-muted-foreground">Restablecer</button>
        </div>
        {(element.type === 'puerta') && (
          <span className="text-[10px] text-muted-foreground">Puerta: elige «Apertura» arriba (derecha, izquierda…) y usa «Arriba/Abajo» para que abra hacia fuera o hacia dentro.</span>
        )}
      </div>

      {/* Alturas para la vista 3D: lo alto que es el equipo y a qué altura del suelo
          está colocado (por ejemplo, un evaporador colgado del techo de la cámara). */}
      <div className="flex flex-col gap-1.5 rounded-md border border-border p-2" data-prueba="alturas-equipo">
        <span className="tech-label">Alturas (vista 3D)</span>
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Alto del equipo (m)">
            <NumberField value={element.alto_m ?? ''} placeholder={coma(alturaDefecto(element))} data-prueba="alto-equipo"
              onChange={(v) => onUpdate({ alto_m: v > 0 ? v : undefined })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </Campo>
          <Campo label="Altura sobre el suelo (m)">
            <NumberField key={`z${kb}`} value={element.z_m ?? ''} placeholder={`auto ${coma(cota)}`} data-prueba="cota-equipo"
              onChange={(v) => onUpdate({ z_m: v })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </Campo>
        </div>
        <div className="flex flex-wrap gap-1">
          {[['Suelo', 0], ['0,5 m', 0.5], ['1 m', 1], ['1,5 m', 1.5], ['2 m', 2]].map(([t, v]) => (
            <button key={t} type="button" onClick={() => act({ z_m: v })} data-prueba={`cota-${v}`}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-muted">{t}</button>
          ))}
          {techo != null && (
            <button type="button" onClick={() => act({ z_m: Math.max(0, Math.round((techo - alto) * 100) / 100) })} data-prueba="cota-techo"
              className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-muted">Pegado al techo</button>
          )}
          <button type="button" onClick={() => act({ z_m: undefined })} data-prueba="cota-auto"
            className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-muted">{propia ? 'Automática' : 'Automática ✓'}</button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Parte baja a {coma(cota)} m del suelo y parte alta a {coma(cota + alto)} m.
          {techo != null && cota + alto > techo + 0.01 && (
            <b className="text-destructive"> Sobrepasa el techo ({coma(techo)} m).</b>
          )}
        </span>
      </div>

      {/* Mover el equipo con flechas (paso de 0,1 m): útil en móvil donde
          arrastrar con el dedo es difícil de afinar. */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Move className="w-3 h-3" /> Mover (0,1 m)
        </span>
        <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
          <span />
          <button onClick={() => mover(0, -paso)} title="Arriba"
            className="flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <span />
          <button onClick={() => mover(-paso, 0)} title="Izquierda"
            className="flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="flex items-center justify-center text-[9px] text-muted-foreground">0,1m</span>
          <button onClick={() => mover(paso, 0)} title="Derecha"
            className="flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <span />
          <button onClick={() => mover(0, paso)} title="Abajo"
            className="flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <span />
        </div>
      </div>

      {/* Color del elemento: para diferenciar partes de la instalación (una
          ampliación, un circuito distinto, etc.). El símbolo se repinta en el
          color elegido. */}
      <SelectorColor value={element.color || def?.color} onChange={(c) => onUpdate({ color: c })} label="Color del elemento" />

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

// Alto habitual del tipo de equipo (lo que se usa si no se ha escrito otro).
function alturaDefecto(el) {
  return altoEquipo({ ...el, alto_m: undefined });
}

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}