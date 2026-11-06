import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, Plus, X, FileText, Search, ExternalLink, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DIAMETROS, diametroDePulgadas, planDeMaterial, buscarMaterial } from '@/lib/tuberiaEquipos';
import { enlaceDeFicha, enlacesDeBusqueda } from '@/lib/fichasMaquinas';
import { guardarFicha, subirCopiaFicha, guardarCopiaDelEnlace, buscarFichaConIA } from '@/lib/fichasMaquinasDB';
import { sePuedeDescargar } from '@/lib/documentacionTecnica';
import { iaActivada } from '@/lib/modoSinIA';

const ORIGEN = {
  ficha: ['bg-emerald-100 text-emerald-800', 'Conexiones de la ficha técnica que tienes guardada'],
  ia: ['bg-amber-100 text-amber-800', 'Sugeridas por la IA al buscar la ficha: abre la ficha y compruébalas'],
  recordada: ['bg-emerald-100 text-emerald-800', 'Conexiones que guardaste para esta referencia'],
  descripcion: ['bg-emerald-100 text-emerald-800', 'Conexiones leídas de la descripción del equipo'],
  potencia: ['bg-amber-100 text-amber-800', 'Orientativas según la potencia: compruébalas en la ficha del fabricante'],
};

function Tarjeta({ equipo, propios, onAnadir, onDescartar, onFichaGuardada }) {
  const { item, analisis } = equipo;
  const [liq, setLiq] = useState(analisis.conexiones?.liquido?.pulg || '');
  const [asp, setAsp] = useState(analisis.conexiones?.aspiracion?.pulg || '');
  const [metros, setMetros] = useState(5);
  const [codos, setCodos] = useState(4);
  const [uniones, setUniones] = useState(2);
  const [ajustes, setAjustes] = useState({});
  const ficha = analisis.ficha;
  const [fab, setFab] = useState(ficha?.manufacturer || analisis.maquina?.fabricante || '');
  const [modelo, setModelo] = useState(ficha?.model || analisis.maquina?.modelo || '');
  const [url, setUrl] = useState(ficha?.url || '');
  const [archivo, setArchivo] = useState(null); // { file_url, file_name } subido a mano
  const [copiaPdf, setCopiaPdf] = useState(true);
  const [origenIA, setOrigenIA] = useState(false);
  const [trabajando, setTrabajando] = useState('');
  const [msgFicha, setMsgFicha] = useState('');

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
    onAnadir(lineas, item);
    const sinPrecio = lineas.filter((x) => !x.unit_price).length;
    toast.success(`Añadidas ${lineas.length} líneas de tubería${sinPrecio ? ` (${sinPrecio} sin precio: ponlo tú)` : ''}`);
  };

  const origen = origenIA ? ORIGEN.ia : analisis.origen ? ORIGEN[analisis.origen] : null;

  const buscarIA = async () => {
    setTrabajando('ia'); setMsgFicha('');
    try {
      const r = await buscarFichaConIA({ fabricante: fab, modelo, descripcion: item.description });
      if (r.fabricante && !fab) setFab(r.fabricante);
      if (r.modelo && !modelo) setModelo(r.modelo);
      if (r.url) setUrl(r.url);
      if (r.liquido && r.aspiracion) { setLiq(r.liquido.pulg); setAsp(r.aspiracion.pulg); setOrigenIA(true); }
      setMsgFicha(r.url || r.liquido
        ? 'La IA ha encontrado algo. Abre el enlace, comprueba que es la ficha de tu máquina y guárdala.'
        : 'La IA no ha encontrado esa ficha. Usa los enlaces de búsqueda o pega el enlace tú.');
    } catch (e) { setMsgFicha(String(e?.message || e)); }
    setTrabajando('');
  };

  const subirPdf = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setTrabajando('subir');
    try { setArchivo(await subirCopiaFicha(f)); setMsgFicha(`Adjuntado: ${f.name}`); } catch { setMsgFicha('No se ha podido subir el fichero.'); }
    setTrabajando('');
  };

  const guardarEnFichas = async () => {
    setTrabajando('guardar'); setMsgFicha('');
    try {
      let copia = archivo || {};
      let aviso = '';
      if (!copia.file_url && url && copiaPdf && sePuedeDescargar()) {
        const r = await guardarCopiaDelEnlace(url).catch((er) => ({ ok: false, error: String(er?.message || er) }));
        if (r.ok) copia = r; else aviso = ` (copia del PDF no guardada: ${r.error})`;
      }
      const guardada = await guardarFicha({
        manufacturer: fab, model: modelo, reference: item.reference, description: item.description,
        equipment_type: analisis.tipo, url, file_url: copia.file_url, file_name: copia.file_name,
        liquid_pipe: l?.pulg || '', suction_pipe: a?.pulg || '', source: origenIA ? 'ia' : 'presupuesto',
      }, ficha?.id);
      onFichaGuardada(guardada);
      toast.success('Ficha guardada en Fichas técnicas de máquinas' + aviso);
    } catch (e) { setMsgFicha(String(e?.message || e)); }
    setTrabajando('');
  };

  const enlaces = enlacesDeBusqueda({ fabricante: fab, modelo, descripcion: item.description });
  const abrir = ficha ? enlaceDeFicha(ficha) : '';
  const bloqueFicha = (
    <div className="md:w-64 shrink-0 border rounded-lg p-2 space-y-2 bg-slate-50 text-xs" data-prueba="ficha-tecnica">
      <p className="font-semibold text-slate-800 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Ficha técnica</p>
      {ficha ? (
        <>
          <p className="text-emerald-800">✔ Guardada: {[ficha.manufacturer, ficha.model].filter(Boolean).join(' ')}</p>
          {abrir
            ? <a href={abrir} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-emerald-600 text-white px-2 py-1 font-semibold"><ExternalLink className="w-3 h-3" />Abrir la ficha{ficha.file_url ? ' (copia guardada)' : ''}</a>
            : <p className="text-amber-700">La ficha está guardada pero sin enlace ni fichero. Añádelo en Fichas técnicas.</p>}
        </>
      ) : (
        <>
          <p className="text-slate-500">Esta máquina aún no está en Fichas técnicas.</p>
          <div className="flex gap-1">
            <input className="w-1/2 h-7 border rounded px-1 bg-white" placeholder="Fabricante" value={fab} onChange={(e) => setFab(e.target.value)} />
            <input className="w-1/2 h-7 border rounded px-1 bg-white" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1 h-7" onClick={buscarIA} disabled={!!trabajando || !iaActivada() || (!fab && !modelo)}>
            {trabajando === 'ia' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}Buscar la ficha con IA
          </Button>
          {!iaActivada() && <p className="text-slate-500">Para que la busque sola, enciende la ayuda con IA en Configuración.</p>}
          {enlaces.map((e) => (
            <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-700 underline"><ExternalLink className="w-3 h-3 shrink-0" />{e.etiqueta}</a>
          ))}
          <input className="w-full h-7 border rounded px-1 bg-white" placeholder="Pega aquí el enlace de la ficha" value={url} onChange={(e) => setUrl(e.target.value)} />
          <label className="flex items-center gap-1 cursor-pointer text-slate-700"><Upload className="w-3 h-3" />{archivo ? archivo.file_name : 'o sube el PDF de la ficha'}
            <input type="file" accept=".pdf,image/*" className="hidden" onChange={subirPdf} />
          </label>
          {url && sePuedeDescargar() && (
            <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" checked={copiaPdf} onChange={(e) => setCopiaPdf(e.target.checked)} /> Guardar también una copia del PDF</label>
          )}
          <Button size="sm" className="w-full h-7" onClick={guardarEnFichas} disabled={!!trabajando || (!modelo && !item.reference)}>
            {trabajando === 'guardar' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Guardar en Fichas técnicas
          </Button>
          <p className="text-slate-500">Se guardan también las conexiones de abajo, y la próxima vez saldrá la ficha guardada sin ir a internet.</p>
        </>
      )}
      {msgFicha && <p className="text-amber-800">{msgFicha}</p>}
    </div>
  );
  const selector = (valorActual, set, etiqueta) => (
    <label className="text-xs text-slate-600 flex items-center gap-1">{etiqueta}
      <select className="h-7 border rounded px-1 bg-white text-sm" value={valorActual} onChange={(e) => set(e.target.value)}>
        <option value="">— elige —</option>
        {DIAMETROS.map((d) => <option key={d.pulg} value={d.pulg}>{d.pulg} ({d.mm} mm)</option>)}
      </select>
    </label>
  );

  return (
    <div className="border border-sky-200 bg-white rounded-lg p-3 flex flex-col md:flex-row gap-3" data-prueba="tarjeta-tuberia">
      <div className="flex-1 min-w-0 space-y-2">
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
            <span />
            <Button size="sm" onClick={anadir} className="gap-1"><Plus className="w-3 h-3" />Añadir al presupuesto</Button>
          </div>
        </div>
      )}
      </div>
      {bloqueFicha}
    </div>
  );
}

/** Aviso con la tubería que lleva cada equipo frigorífico o de clima recién añadido y los accesorios que se pueden sumar. */
export default function TuberiasEquiposPanel({ equipos, propios, onAnadir, onDescartar, onFichaGuardada }) {
  if (!equipos?.length) return null;
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-2" data-prueba="aviso-tuberias">
      <p className="text-sm font-semibold text-sky-900 flex items-center gap-2"><Wrench className="w-4 h-4" /> Tubería de los equipos que has añadido</p>
      {equipos.map((e) => (
        <Tarjeta key={e.key} equipo={e} propios={propios} onAnadir={(lineas, item) => onAnadir(lineas, item, e.key)} onDescartar={() => onDescartar(e.key)} onFichaGuardada={onFichaGuardada} />
      ))}
    </div>
  );
}
