import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { DIAMETROS, diametroDePulgadas, planDeMaterial, buscarMaterial, recordarConexiones } from '@/lib/tuberiaEquipos';

const ORIGEN = {
  recordada: ['bg-emerald-100 text-emerald-800', 'Conexiones que guardaste para esta referencia'],
  descripcion: ['bg-emerald-100 text-emerald-800', 'Conexiones leídas de la descripción del equipo'],
  potencia: ['bg-amber-100 text-amber-800', 'Orientativas según la potencia: compruébalas en la ficha del fabricante'],
};

function Tarjeta({ equipo, propios, onAnadir, onDescartar }) {
  const { item, analisis } = equipo;
  const [liq, setLiq] = useState(analisis.conexiones?.liquido?.pulg || '');
  const [asp, setAsp] = useState(analisis.conexiones?.aspiracion?.pulg || '');
  const [metros, setMetros] = useState(5);
  const [codos, setCodos] = useState(4);
  const [uniones, setUniones] = useState(2);
  const [ajustes, setAjustes] = useState({});
  const [recordar, setRecordar] = useState(!!item.reference);

  const l = diametroDePulgadas(liq), a = diametroDePulgadas(asp);
  const filas = useMemo(() => {
    if (!l || !a) return [];
    return planDeMaterial({ liquido: l, aspiracion: a, metros, codos, uniones, unidades: item.quantity || 1 }).map((f) => {
      const art = buscarMaterial(propios, f.busca);
      return { ...f, art };
    });
  }, [l, a, metros, codos, uniones, item.quantity, propios]);

  const valor = (f, campo) => {
    const aj = ajustes[f.clave]?.[campo];
    if (aj !== undefined) return aj;
    if (campo === 'marcado') return f.marcado;
    if (campo === 'cantidad') return f.cantidad;
    return f.art ? Number(f.art.unit_price) || 0 : 0;
  };
  const poner = (clave, campo, v) => setAjustes((p) => ({ ...p, [clave]: { ...p[clave], [campo]: v } }));

  const anadir = () => {
    const lineas = filas.filter((f) => valor(f, 'marcado')).map((f) => {
      const q = Number(valor(f, 'cantidad')) || 0, precio = Number(valor(f, 'precio')) || 0;
      return {
        description: f.art?.description || f.descripcion, reference: f.art?.reference || f.art?.supplier_ref || '', supplier_name: f.art?.supplier_name || '',
        quantity: q, unit_price: precio, discount: 0, total: Math.round(q * precio * 100) / 100,
      };
    }).filter((x) => x.quantity > 0);
    if (!lineas.length) { toast.error('No hay nada marcado para añadir'); return; }
    if (recordar && item.reference) recordarConexiones(item.reference, l, a);
    onAnadir(lineas, item);
    const sinPrecio = lineas.filter((x) => !x.unit_price).length;
    toast.success(`Añadidas ${lineas.length} líneas de tubería${sinPrecio ? ` (${sinPrecio} sin precio: ponlo tú)` : ''}`);
  };

  const origen = analisis.origen ? ORIGEN[analisis.origen] : null;
  const selector = (valorActual, set, etiqueta) => (
    <label className="text-xs text-slate-600 flex items-center gap-1">{etiqueta}
      <select className="h-7 border rounded px-1 bg-white text-sm" value={valorActual} onChange={(e) => set(e.target.value)}>
        <option value="">— elige —</option>
        {DIAMETROS.map((d) => <option key={d.pulg} value={d.pulg}>{d.pulg} ({d.mm} mm)</option>)}
      </select>
    </label>
  );

  return (
    <div className="border border-sky-200 bg-white rounded-lg p-3 space-y-2" data-prueba="tarjeta-tuberia">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-sky-900 min-w-0">
          <span className="block truncate">{item.description}</span>
          <span className="text-xs font-normal text-slate-500">{analisis.tipo === 'clima' ? 'Clima' : 'Refrigeración industrial'}{item.quantity > 1 ? ` · ${item.quantity} equipos` : ''}</span>
        </div>
        <button type="button" className="text-slate-400 hover:text-slate-700 shrink-0" title="Este equipo no necesita tubería" onClick={onDescartar}><X className="w-4 h-4" /></button>
      </div>
      {origen
        ? <p className={`text-xs rounded px-2 py-1 ${origen[0]}`}>{origen[1]}</p>
        : <p className="text-xs rounded px-2 py-1 bg-slate-100 text-slate-700">No he podido saber las conexiones de este equipo: elige tú los diámetros.</p>}
      {analisis.avisos.map((t) => <p key={t} className="text-xs text-amber-800">⚠ {t}</p>)}
      <div className="flex flex-wrap gap-3 items-center">
        {selector(liq, setLiq, 'Líquido')}
        {selector(asp, setAsp, 'Aspiración')}
        <label className="text-xs text-slate-600 flex items-center gap-1">Distancia (m)
          <input type="number" min="0" step="0.5" value={metros} onChange={(e) => setMetros(e.target.value)} className="w-16 h-7 border rounded px-1 text-sm" />
        </label>
        <label className="text-xs text-slate-600 flex items-center gap-1">Codos/línea
          <input type="number" min="0" value={codos} onChange={(e) => setCodos(e.target.value)} className="w-14 h-7 border rounded px-1 text-sm" />
        </label>
        <label className="text-xs text-slate-600 flex items-center gap-1">Uniones/línea
          <input type="number" min="0" value={uniones} onChange={(e) => setUniones(e.target.value)} className="w-14 h-7 border rounded px-1 text-sm" />
        </label>
      </div>
      {filas.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500">¿Qué quieres añadir? (la distancia es la de ida; se cuenta para líquido y aspiración)</p>
          {filas.map((f) => (
            <div key={f.clave} className="flex flex-wrap items-center gap-2 text-sm border-t pt-1">
              <input type="checkbox" checked={!!valor(f, 'marcado')} onChange={(e) => poner(f.clave, 'marcado', e.target.checked)} />
              <span className="flex-1 min-w-[10rem]">{f.art?.description || f.descripcion}{f.art && <span className="text-xs text-emerald-700"> · de tu base de datos</span>}</span>
              <input type="number" min="0" step="0.5" className="w-16 h-7 border rounded px-1 text-right" value={valor(f, 'cantidad')} onChange={(e) => poner(f.clave, 'cantidad', e.target.value)} />
              <span className="text-xs text-slate-500 w-6">{f.unidad}</span>
              <input type="number" min="0" step="0.01" className="w-20 h-7 border rounded px-1 text-right" value={valor(f, 'precio')} onChange={(e) => poner(f.clave, 'precio', e.target.value)} />
              <span className="text-xs text-slate-500">€{!f.art && !Number(valor(f, 'precio')) ? ' (sin precio)' : ''}</span>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {item.reference
              ? <label className="text-xs text-slate-600 flex items-center gap-1"><input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} /> Recordar estas conexiones para {item.reference}</label>
              : <span />}
            <Button size="sm" onClick={anadir} className="gap-1"><Plus className="w-3 h-3" />Añadir al presupuesto</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Aviso con la tubería que lleva cada equipo frigorífico o de clima recién añadido y los accesorios que se pueden sumar. */
export default function TuberiasEquiposPanel({ equipos, propios, onAnadir, onDescartar }) {
  if (!equipos?.length) return null;
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-2" data-prueba="aviso-tuberias">
      <p className="text-sm font-semibold text-sky-900 flex items-center gap-2"><Wrench className="w-4 h-4" /> Tubería de los equipos que has añadido</p>
      {equipos.map((e) => (
        <Tarjeta key={e.key} equipo={e} propios={propios} onAnadir={(lineas, item) => onAnadir(lineas, item, e.key)} onDescartar={() => onDescartar(e.key)} />
      ))}
    </div>
  );
}
