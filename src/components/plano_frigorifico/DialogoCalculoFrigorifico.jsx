import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, X, Snowflake, PackageSearch } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { camarasDePlano, cargaFrigorifica, ajustesPorDefecto } from '@/lib/planoCargaFrigorifica';
import { buscarMaquinas } from '@/lib/planoBuscarPrecios';

const CLAVE_PROVEEDOR = 'plano_proveedor_elegido';
const aNum = (t) => parseFloat(String(t).replace(',', '.'));
const eur = (n) => `${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const lista = (r) => (Array.isArray(r) ? r : (r?.items || []));

/**
 * DialogoCalculoFrigorifico — carga frigorífica de cada cámara del plano y
 * máquinas que la cubren, con el precio sacado de las tarifas del proveedor
 * que se elija (entre los proveedores con los que se trabaja).
 */
export default function DialogoCalculoFrigorifico({ open, walls, onClose, onAnadir }) {
  const camaras = useMemo(() => camarasDePlano(walls || []), [walls]);
  const [sel, setSel] = useState(0);
  const [ajustes, setAjustes] = useState({});
  const [proveedores, setProveedores] = useState([]);
  const [proveedor, setProveedor] = useState(() => { try { return localStorage.getItem(CLAVE_PROVEEDOR) || ''; } catch { return ''; } });
  const [precios, setPrecios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [elegidas, setElegidas] = useState({}); // { evaporador: id, condensadora: id }

  const camara = camaras[Math.min(sel, camaras.length - 1)];
  const def = useMemo(() => (camara ? ajustesPorDefecto(camara) : {}), [camara]);
  const valores = useMemo(() => {
    const v = { ...def };
    for (const [k, t] of Object.entries(ajustes)) { const n = aNum(t); if (Number.isFinite(n)) v[k] = n; }
    return v;
  }, [def, ajustes]);
  const res = useMemo(() => (camara ? cargaFrigorifica(camara, valores) : null), [camara, valores]);

  useEffect(() => {
    if (!open) return;
    base44.entities.Supplier.list().then((r) => setProveedores(lista(r).filter((s) => s.is_active !== false))).catch(() => setProveedores([]));
  }, [open]);

  useEffect(() => {
    if (!open || !proveedor) { setPrecios([]); return undefined; }
    let vivo = true;
    setCargando(true);
    base44.entities.SupplierPrice.filter({ supplier_id: proveedor }, '-created_date', 5000)
      .then((r) => { if (vivo) setPrecios(lista(r)); })
      .catch(() => { if (vivo) setPrecios([]); })
      .finally(() => { if (vivo) setCargando(false); });
    try { localStorage.setItem(CLAVE_PROVEEDOR, proveedor); } catch { /* sin almacenamiento */ }
    return () => { vivo = false; };
  }, [open, proveedor]);

  useEffect(() => { setAjustes({}); setElegidas({}); }, [sel, open]);

  const evap = useMemo(() => (res ? buscarMaquinas(precios, { tipo: 'evaporador', kw: res.kw_equipo, camaraTipo: camara.tipo }) : []), [precios, res, camara]);
  const cond = useMemo(() => (res ? buscarMaquinas(precios, { tipo: 'condensadora', kw: res.kw_equipo, camaraTipo: camara.tipo }) : []), [precios, res, camara]);

  if (!open) return null;
  const nombreProv = proveedores.find((p) => String(p.id) === String(proveedor))?.name || '';

  const campo = (clave, etiqueta, unidad) => (
    <label className="text-[11px] text-muted-foreground flex flex-col gap-0.5">
      {etiqueta}
      <span className="flex items-center gap-1">
        <input className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
          inputMode="decimal" value={ajustes[clave] ?? String(def[clave] ?? '')}
          onChange={(e) => setAjustes({ ...ajustes, [clave]: e.target.value })} data-prueba={`calc-${clave}`} />
        <span className="shrink-0">{unidad}</span>
      </span>
    </label>
  );

  const fila = (tipo, m) => {
    const marcada = String(elegidas[tipo]) === String(m.id);
    return (
      <button key={m.id} type="button" onClick={() => setElegidas({ ...elegidas, [tipo]: m.id })}
        className={`w-full text-left rounded-md border px-2 py-1.5 text-xs ${marcada ? 'border-cyan-500 bg-cyan-500/10' : 'border-border hover:bg-muted'} ${m.insuficiente ? 'opacity-70' : ''}`}
        data-prueba={`maquina-${tipo}`}>
        <span className="font-medium">{m.nombre}</span>
        <span className="ml-2 text-muted-foreground">{m.capacidad_kw} kW{m.marca ? ` · ${m.marca}` : ''}</span>
        <span className="float-right font-semibold">{eur(m.precio)}</span>
        {m.insuficiente && <span className="block text-[10px] text-amber-600">No llega a la potencia necesaria: es la mayor de la tarifa.</span>}
      </button>
    );
  };

  const anadir = () => {
    const e = evap.find((m) => String(m.id) === String(elegidas.evaporador));
    const c = cond.find((m) => String(m.id) === String(elegidas.condensadora));
    if (!e && !c) return;
    onAnadir?.(camara, { evaporador: e && { ...e, proveedor: nombreProv || e.proveedor }, condensadora: c && { ...c, proveedor: nombreProv || c.proveedor }, kw: res.kw_equipo });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl bg-card border border-border p-4 shadow-2xl" onClick={(e) => e.stopPropagation()} data-prueba="dialogo-calculo-frio">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-5 h-5 text-cyan-600" />
          <h3 className="text-sm font-bold flex-1">Cálculo frigorífico y máquinas</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        {!camara ? (
          <p className="text-sm text-muted-foreground">Dibuja primero una cámara con el botón «Cámara»: el cálculo se hace sobre sus medidas.</p>
        ) : (
          <>
            {camaras.length > 1 && (
              <select className="mb-3 w-full rounded border border-border bg-background px-2 py-1 text-sm" value={sel} onChange={(e) => setSel(Number(e.target.value))}>
                {camaras.map((c, i) => <option key={c.room_id} value={i}>Cámara {i + 1} · {c.ancho}×{c.largo}×{c.alto} m · {c.tipo}</option>)}
              </select>
            )}
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Snowflake className="w-3.5 h-3.5" /> {camara.ancho}×{camara.largo}×{camara.alto} m · {res.volumen} m³ · panel {camara.espesor_mm} mm · {camara.tipo}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {campo('temp_int', 'Temp. interior', '°C')}
              {campo('temp_ext', 'Temp. exterior', '°C')}
              {campo('producto_kg_dia', 'Producto al día', 'kg')}
              {campo('temp_entrada', 'Entra a', '°C')}
              {campo('entradas_dia', 'Aperturas puerta/día', '')}
              {campo('horas_funcionamiento', 'Horas de marcha', 'h')}
              {campo('personas', 'Personas dentro', '')}
            </div>

            <div className="rounded-lg border border-border p-2 mb-3 text-xs" data-prueba="resultado-carga">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5">
                <span>Transmisión: <b>{res.desglose_w.transmision} W</b></span>
                <span>Producto: <b>{res.desglose_w.producto} W</b></span>
                <span>Aire/puertas: <b>{res.desglose_w.infiltracion} W</b></span>
                <span>Luz y personas: <b>{res.desglose_w.internas} W</b></span>
                <span>Ventiladores: <b>{res.desglose_w.ventiladores} W</b></span>
                <span>Desescarche: <b>{res.desglose_w.desescarche} W</b></span>
              </div>
              <p className="mt-2 text-sm">
                Carga <b>{res.kw_frio} kW</b> → equipo a {valores.horas_funcionamiento} h: <b data-prueba="kw-equipo">{res.kw_equipo} kW</b>
                {' '}→ máquina de <b className="text-cyan-700">{res.kw_comercial} kW</b> · evaporación {res.temp_evaporacion} °C
              </p>
              {res.avisos.map((a) => <p key={a} className="text-[11px] text-amber-600 mt-1">⚠️ {a}</p>)}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <PackageSearch className="w-4 h-4 text-cyan-600" />
              <label className="text-xs font-semibold" htmlFor="prov-calc">Precios del proveedor:</label>
              <select id="prov-calc" className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm" value={proveedor} onChange={(e) => setProveedor(e.target.value)} data-prueba="proveedor-calculo">
                <option value="">— elige proveedor —</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {!proveedor && <p className="text-xs text-muted-foreground">Elige el proveedor con el que trabajas y se buscarán en su tarifa los evaporadores y condensadoras que cubren {res.kw_equipo} kW.</p>}
            {proveedor && cargando && <p className="text-xs text-muted-foreground">Leyendo la tarifa…</p>}
            {proveedor && !cargando && (
              <div className="grid sm:grid-cols-2 gap-3">
                {[['evaporador', 'Evaporador', evap], ['condensadora', 'Unidad condensadora', cond]].map(([tipo, titulo, items]) => (
                  <div key={tipo}>
                    <p className="text-xs font-semibold mb-1">{titulo}</p>
                    {items.length ? <div className="space-y-1">{items.map((m) => fila(tipo, m))}</div>
                      : <p className="text-[11px] text-muted-foreground">No hay líneas en la tarifa de {nombreProv} con ese tipo y su potencia escrita (kW, W o kcal/h). Revisa la tarifa o pon el equipo a mano.</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-1.5 rounded-md border border-border text-sm" onClick={onClose}>Cerrar</button>
              <button className="px-3 py-1.5 rounded-md bg-cyan-600 text-white text-sm disabled:opacity-40" disabled={!elegidas.evaporador && !elegidas.condensadora}
                onClick={anadir} data-prueba="anadir-maquinas">Añadir al plano con su precio</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
