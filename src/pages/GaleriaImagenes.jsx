import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import NavBar from '@/components/NavBar';
import VisorImagenes from '@/components/VisorImagenes';
import { Input } from '@/components/ui/input';
import { Folder, FolderOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { ORIGENES, construirCarpetas, filtrarCarpetas } from '@/lib/galeria';
import { iniciarTarea, cederHilo } from '@/lib/descargas';

const ENTIDADES = { sat: 'SATOrder', mantenimiento: 'MaintenanceSheet', aseguradora: 'InsuranceReport', averias: 'EquipmentFailure', notas: 'Note', documentos: 'ClientDocument' };

export default function GaleriaImagenes() {
  const [datos, setDatos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [origen, setOrigen] = useState('');
  const [abierta, setAbierta] = useState(() => new URLSearchParams(window.location.search).get('carpeta'));
  const [visor, setVisor] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const tarea = iniciarTarea('Cargando galería', { total: ORIGENES.length });
      const acum = {};
      for (let k = 0; k < ORIGENES.length; k++) {
        const o = ORIGENES[k];
        try { acum[o.id] = await base44.entities[ENTIDADES[o.id]].list('-created_date', 300); } catch { acum[o.id] = []; }
        tarea.progreso(k + 1, ORIGENES.length, o.etiqueta);
        if (vivo) setDatos({ ...acum });
        await cederHilo();
      }
      tarea.terminar();
      if (vivo) setCargando(false);
    })();
    return () => { vivo = false; };
  }, []);

  const carpetas = useMemo(() => construirCarpetas(datos), [datos]);
  const visibles = useMemo(() => filtrarCarpetas(carpetas, { texto, origen }), [carpetas, texto, origen]);
  const carpeta = carpetas.find((c) => c.id === abierta);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Galería de imágenes" />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        {carpeta ? (
          <>
            <button className="flex items-center gap-1 text-sm text-blue-700" onClick={() => setAbierta(null)}><ArrowLeft className="w-4 h-4" />Todas las carpetas</button>
            <div className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-slate-800">{carpeta.nombre}</h2>
              <span className="text-sm text-slate-500">{carpeta.cliente}</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {carpeta.fotos.map((f, i) => (
                <button key={i} className="bg-white rounded-lg border overflow-hidden text-left" onClick={() => setVisor({ fotos: carpeta.fotos, i, titulo: carpeta.nombre })}>
                  <img src={f.url} alt={f.etiqueta} loading="lazy" className="w-full h-36 object-cover" />
                  <span className="block text-xs text-slate-500 px-2 py-1">{f.etiqueta}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Buscar por documento o cliente…" value={texto} onChange={(e) => setTexto(e.target.value)} className="max-w-xs bg-white" />
              <select value={origen} onChange={(e) => setOrigen(e.target.value)} className="border rounded-md px-2 text-sm bg-white">
                <option value="">Todos los documentos</option>
                {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
              </select>
              {cargando && <span className="flex items-center gap-1 text-xs text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Cargando…</span>}
            </div>
            {!cargando && !visibles.length && <p className="text-sm text-slate-500">No hay imágenes guardadas en documentos.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" data-testid="carpetas">
              {visibles.map((c) => (
                <button key={c.id} className="bg-white rounded-xl border p-2 text-left hover:shadow" onClick={() => setAbierta(c.id)}>
                  <div className="relative h-28 rounded-lg overflow-hidden bg-slate-100">
                    <img src={c.fotos[0].url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs rounded px-1.5">{c.fotos.length}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm font-medium text-slate-800"><Folder className="w-4 h-4 text-amber-500 shrink-0" /><span className="truncate">{c.nombre}</span></div>
                  <p className="text-xs text-slate-500 truncate">{c.cliente || c.origenEtiqueta}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {visor && <VisorImagenes fotos={visor.fotos} inicio={visor.i} titulo={visor.titulo} onCerrar={() => setVisor(null)} />}
    </div>
  );
}
