import React from 'react';
import { Trash2 } from 'lucide-react';
import { longitudConexion } from '@/lib/planoCalculo';

// Panel de detalles del elemento, pared o conexión seleccionada.
// Para las tuberías pide los diámetros de gas y líquido; para las conexiones
// eléctricas pide el tipo de conexión de potencia y de comunicaciones.

const GAS_OPTS = ['3/8"', '1/2"', '5/8"', '7/8"', '1 1/8"', '1 3/8"', '1 5/8"', '2 1/8"'];
const LIQ_OPTS = ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"'];
const POWER_OPTS = [
  'Manguera 3G1.5', 'Manguera 3G2.5', 'Manguera 5G6', 'Manguera 5G10', 'Manguera 7G16',
  'Barra omnibus', 'Cable H07RN-F 3G2.5', 'Toma industrial 16A', 'Toma industrial 32A', 'Directo a borne',
];
const COMM_OPTS = [
  'Sin comunicación', 'RS485 Modbus RTU', 'Ethernet TCP/IP', '0-10V', '4-20mA',
  'Wireless WiFi', 'KNX', 'BACnet MS/TP',
];

export default function PlanoEquipoDetalles({ element, wall, connection, elements, scale, onUpdate, onDelete }) {
  if (connection) {
    const a = elements.find((e) => e.id === connection.from_id);
    const b = elements.find((e) => e.id === connection.to_id);
    const L = longitudConexion(connection, elements, scale);
    const esRef = connection.type === 'refrigerante';
    const color = esRef ? '#00A0E9' : '#F5821F';
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="tech-label" style={{ color }}>{esRef ? 'Tubería refrigerante' : 'Conexión eléctrica'}</div>
          <button onClick={onDelete} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <div className="text-xs text-muted-foreground">
          {(a?.label) || '?'} → {(b?.label) || '?'}
        </div>
        <div className="text-sm">Longitud: <span className="font-mono font-bold">{L.toFixed(2)} m</span></div>

        {esRef ? (
          <>
            <Campo label="Diámetro línea de gas">
              <input list="pf-gas-opts" value={connection.gas_diameter || ''}
                onChange={(e) => onUpdate({ gas_diameter: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" placeholder="Ej. 5/8" />
              <datalist id="pf-gas-opts">{GAS_OPTS.map((o) => <option key={o} value={o} />)}</datalist>
            </Campo>
            <Campo label="Diámetro línea de líquido">
              <input list="pf-liq-opts" value={connection.liquid_diameter || ''}
                onChange={(e) => onUpdate({ liquid_diameter: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" placeholder="Ej. 3/8" />
              <datalist id="pf-liq-opts">{LIQ_OPTS.map((o) => <option key={o} value={o} />)}</datalist>
            </Campo>
          </>
        ) : (
          <>
            <Campo label="Conexión de potencia">
              <select value={connection.power_type || ''} onChange={(e) => onUpdate({ power_type: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                <option value="">— Selecciona —</option>
                {POWER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Campo>
            <Campo label="Conexión de comunicaciones">
              <select value={connection.comm_type || ''} onChange={(e) => onUpdate({ comm_type: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs">
                <option value="">— Selecciona —</option>
                {COMM_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
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

  if (wall) {
    const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
    return (
      <div className="flex flex-col gap-2">
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
      <div className="text-xs text-muted-foreground p-2">
        Selecciona un equipo, una pared o una conexión para ver sus datos.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="tech-label" style={{ color: element.color }}>{element.label}</div>
        <button onClick={onDelete} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <Campo label="Etiqueta">
        <input value={element.label || ''} onChange={(e) => onUpdate({ label: e.target.value })}
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
          <input type="number" min="1" value={element.qty ?? 1} onChange={(e) => onUpdate({ qty: parseInt(e.target.value) || 1 })}
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
      </div>
      <Campo label="Notas">
        <textarea value={element.notes || ''} onChange={(e) => onUpdate({ notes: e.target.value })} rows={2}
          className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs resize-none" />
      </Campo>
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