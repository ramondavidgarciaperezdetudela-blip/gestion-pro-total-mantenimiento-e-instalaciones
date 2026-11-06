import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Search, ExternalLink, Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DIAMETROS } from '@/lib/tuberiaEquipos';
import { enlaceDeFicha, enlacesDeBusqueda } from '@/lib/fichasMaquinas';
import { cargarFichas, guardarFicha, borrarFicha, subirCopiaFicha } from '@/lib/fichasMaquinasDB';

const VACIA = { manufacturer: '', model: '', reference: '', description: '', equipment_type: 'industrial', url: '', file_url: '', file_name: '', liquid_pipe: '', suction_pipe: '', notes: '' };

export default function FichasMaquinas() {
  const [fichas, setFichas] = useState(null);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [edit, setEdit] = useState(null); // { id?, ...campos }
  const [trabajando, setTrabajando] = useState(false);

  const cargar = () => cargarFichas().then(setFichas);
  useEffect(() => { cargar(); }, []);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (fichas || [])
      .filter((f) => (!tipo || f.equipment_type === tipo) && (!t || [f.manufacturer, f.model, f.reference, f.description, f.notes].join(' ').toLowerCase().includes(t)))
      .sort((a, b) => `${a.manufacturer} ${a.model}`.localeCompare(`${b.manufacturer} ${b.model}`));
  }, [fichas, q, tipo]);

  const guardar = async () => {
    setTrabajando(true);
    try {
      const { id, ...datos } = edit;
      await guardarFicha(datos, id);
      setEdit(null); toast.success('Ficha guardada'); await cargar();
    } catch (e) { toast.error(String(e?.message || e)); }
    setTrabajando(false);
  };

  const quitar = async (f) => {
    if (!window.confirm(`¿Eliminar la ficha de ${f.manufacturer} ${f.model}?`)) return;
    await borrarFicha(f.id); setFichas((p) => p.filter((x) => x.id !== f.id)); toast.success('Ficha eliminada');
  };

  const subir = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setTrabajando(true);
    try { const r = await subirCopiaFicha(file); setEdit((p) => ({ ...p, ...r })); } catch { toast.error('No se ha podido subir el fichero'); }
    setTrabajando(false);
  };

  const campo = (k, ph, extra = {}) => (
    <Input placeholder={ph} value={edit[k] || ''} onChange={(e) => setEdit((p) => ({ ...p, [k]: e.target.value }))} {...extra} />
  );
  const selector = (k, etiqueta) => (
    <label className="text-xs text-slate-600 flex items-center gap-1">{etiqueta}
      <select className="h-9 border rounded px-1 bg-white text-sm" value={edit[k] || ''} onChange={(e) => setEdit((p) => ({ ...p, [k]: e.target.value }))}>
        <option value="">—</option>
        {DIAMETROS.map((d) => <option key={d.pulg} value={d.pulg}>{d.pulg} ({d.mm} mm)</option>)}
      </select>
    </label>
  );

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4" data-prueba="fichas-maquinas">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> Fichas técnicas de máquinas</h1>
        <Button onClick={() => setEdit({ ...VACIA })} className="gap-1"><Plus className="w-4 h-4" />Nueva ficha</Button>
      </div>
      <p className="text-sm text-slate-600">Aquí quedan guardadas las fichas de las máquinas que presupuestas. Al añadir una máquina que ya está aquí, el presupuesto te enseña la ficha guardada y sus conexiones de tubería, sin ir a internet.</p>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
          <Input className="pl-8" placeholder="Buscar por fabricante, modelo o referencia…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-9 border rounded px-2 bg-white text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todas</option><option value="clima">Clima</option><option value="industrial">Refrigeración industrial</option>
        </select>
      </div>

      {fichas === null && <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Cargando…</p>}
      {fichas && !lista.length && <p className="text-sm text-slate-500">{fichas.length ? 'Ninguna ficha coincide con la búsqueda.' : 'Todavía no hay fichas. Se guardan desde el presupuesto al añadir una máquina, o con «Nueva ficha».'}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {lista.map((f) => {
          const enlace = enlaceDeFicha(f);
          return (
            <Card key={f.id}><CardContent className="p-3 space-y-1">
              <p className="font-semibold">{f.manufacturer} {f.model}</p>
              {f.description && <p className="text-xs text-slate-500 line-clamp-2">{f.description}</p>}
              <p className="text-xs text-slate-600">
                {f.equipment_type === 'clima' ? 'Clima' : f.equipment_type === 'industrial' ? 'Refrigeración industrial' : ''}
                {f.liquid_pipe && f.suction_pipe ? ` · Líquido ${f.liquid_pipe} · Aspiración ${f.suction_pipe}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {enlace
                  ? <a href={enlace} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-teal-600 text-white px-2 py-1 text-xs font-semibold"><ExternalLink className="w-3 h-3" />Abrir ficha{f.file_url ? ' (copia guardada)' : ''}</a>
                  : <span className="text-xs text-amber-700">Sin enlace ni fichero</span>}
                {f.file_url && f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline self-center">Enlace original</a>}
                <button className="text-xs text-slate-600 inline-flex items-center gap-1" onClick={() => setEdit({ ...VACIA, ...f })}><Pencil className="w-3 h-3" />Editar</button>
                <button className="text-xs text-red-600 inline-flex items-center gap-1" onClick={() => quitar(f)}><Trash2 className="w-3 h-3" />Eliminar</button>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? 'Editar ficha' : 'Nueva ficha técnica'}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">{campo('manufacturer', 'Fabricante (Zanotti, Intarcon…)')}{campo('model', 'Modelo')}</div>
              {campo('reference', 'Referencia / código del artículo')}
              {campo('description', 'Descripción')}
              <select className="h-9 border rounded px-2 bg-white text-sm w-full" value={edit.equipment_type || ''} onChange={(e) => setEdit((p) => ({ ...p, equipment_type: e.target.value }))}>
                <option value="industrial">Refrigeración industrial</option><option value="clima">Clima</option>
              </select>
              <div className="flex flex-wrap gap-3">{selector('liquid_pipe', 'Líquido')}{selector('suction_pipe', 'Aspiración')}</div>
              {campo('url', 'Enlace de la ficha (https://…)')}
              {edit.url || edit.manufacturer || edit.model
                ? <div className="flex flex-wrap gap-2 text-xs">{enlacesDeBusqueda({ fabricante: edit.manufacturer, modelo: edit.model, descripcion: edit.description }).map((e) => <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{e.etiqueta}</a>)}</div> : null}
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Upload className="w-4 h-4" />{edit.file_name || 'Subir el PDF de la ficha'}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={subir} />
              </label>
              {campo('notes', 'Notas')}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button onClick={guardar} disabled={trabajando}>{trabajando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
