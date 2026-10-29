import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, Sparkles, Upload, Save, Trash2, Plus, Wand2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORIAS, CAT_COLOR, ELEMENTOS, elementosPorCategoria } from '@/lib/planoFrigorificoCatalogo';
import PlanoSimbolo from './PlanoSimbolo';

/**
 * GestorIconosPlano — gestor completo de los iconos del catálogo del plano.
 *
 * Dos apartados:
 *  - «Mis iconos»: los elementos que el usuario ha añadido (PlanoCatalogItem).
 *    De cada uno se ven las dos versiones (símbolo estándar e icono IA) y se
 *    puede regenerar el icono con IA, editarlo a mano (pegando una URL o
 *    subiendo una imagen) y guardar el cambio.
 *  - «Estándar»: el catálogo de fábrica. Cualquier símbolo se puede enviar a
 *    la IA para que cree una versión con icono (se guarda en «Iconos IA» y así
 *    aparece en la paleta para elegir la mejor al colocar).
 *
 * Los iconos subidos a mano se guardan en almacenamiento público (almacenados
 * de forma pública — cualquiera con el enlace puede abrirlos) porque tienen
 * que verse tanto en el lienzo como en los PDF exportados.
 */
const promptIA = (nombre, catLabel) =>
  `Icono técnico realista en vista superior (planta) de "${nombre}" (${catLabel}), para plano de instalación frigorífica y climatización. Render 3D colorido y detallado visto desde arriba, con materiales realistas (metal cepillado, plástico, cobre, goma), sombras suaves y reflejos, colores vivos que diferencian cada parte de la máquina, fondo blanco, sin texto ni letras, silueta nítida e inconfundible a primera vista, estilo catálogo de fabricante de equipamiento industrial.`;

export default function GestorIconosPlano({ open, onClose, onSaved }) {
  const [tab, setTab] = useState('mios');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [qStd, setQStd] = useState('');
  const [catFiltro, setCatFiltro] = useState('todos');
  const [editId, setEditId] = useState(null);
  const [manualUrl, setManualUrl] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [genStd, setGenStd] = useState({}); // id de elemento de fábrica -> generando

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.PlanoCatalogItem.filter({ is_active: true }, { limit: 300 });
      setItems(res?.items || []);
    } catch { /* sin catálogo */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) cargar(); }, [open]);

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const misItems = useMemo(() => {
    let out = items;
    if (catFiltro !== 'todos') out = out.filter((it) => it.cat === catFiltro);
    if (q.trim()) out = out.filter((it) => norm(it.name).includes(norm(q)));
    return out;
  }, [items, q, catFiltro]);

  const stdItems = useMemo(() => {
    const all = elementosPorCategoria();
    let flat = Object.values(all).flat();
    if (catFiltro !== 'todos') flat = all[catFiltro] || [];
    if (qStd.trim()) flat = flat.filter((e) => norm(e.label).includes(norm(qStd)));
    return flat;
  }, [qStd, catFiltro]);

  if (!open) return null;

  const regenerarIA = async (item) => {
    setBusyId(item.id);
    try {
      const catLabel = CATEGORIAS.find((c) => c.id === item.cat)?.label || item.cat;
      const res = await base44.integrations.Core.GenerateImage({ prompt: promptIA(item.name, catLabel) });
      const url = res?.url || '';
      if (url) {
        await base44.entities.PlanoCatalogItem.update(item.id, { image_url: url });
        setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, image_url: url } : x));
      }
    } catch (e) { alert('No se pudo generar el icono: ' + (e?.message || e)); }
    finally { setBusyId(null); }
  };

  const subirManual = async (item, file) => {
    if (!file) return;
    setBusyId(item.id);
    try {
      const up = await base44.integrations.Core.UploadPublicFile({ file });
      const url = up?.file_url || up?.url || '';
      if (url) {
        await base44.entities.PlanoCatalogItem.update(item.id, { image_url: url });
        setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, image_url: url } : x));
        setManualUrl('');
      }
    } catch (e) { alert('No se pudo subir la imagen: ' + (e?.message || e)); }
    finally { setBusyId(null); }
  };

  const pegarUrl = async (item) => {
    if (!manualUrl.trim()) return;
    setBusyId(item.id);
    try {
      await base44.entities.PlanoCatalogItem.update(item.id, { image_url: manualUrl.trim() });
      setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, image_url: manualUrl.trim() } : x));
      setManualUrl('');
    } catch (e) { alert('No se pudo guardar la URL: ' + (e?.message || e)); }
    finally { setBusyId(null); }
  };

  const borrar = async (item) => {
    if (!confirm(`¿Borrar «${item.name}» del catálogo?`)) return;
    try {
      await base44.entities.PlanoCatalogItem.delete(item.id);
      setItems((arr) => arr.filter((x) => x.id !== item.id));
      onSaved?.();
    } catch (e) { alert('No se pudo borrar: ' + (e?.message || e)); }
  };

  // Crea la versión IA de un símbolo de fábrica: lo guarda como PlanoCatalogItem
  // en el apartado «Iconos IA» para que aparezca en la paleta y se pueda elegir
  // al colocar.
  const crearVersionIAStd = async (el) => {
    setGenStd((s) => ({ ...s, [el.id]: true }));
    try {
      const catLabel = CATEGORIAS.find((c) => c.id === el.cat)?.label || el.cat;
      const res = await base44.integrations.Core.GenerateImage({ prompt: promptIA(el.label, catLabel) });
      const url = res?.url || '';
      if (url) {
        await base44.entities.PlanoCatalogItem.create({
          name: el.label, cat: 'ia', glyph: el.glyph || (el.label || '').slice(0, 3).toUpperCase(),
          w_m: el.w_m || 0.6, h_m: el.h_m || 0.6, precio: el.precio || 0,
          image_url: url, is_active: true,
        });
        await cargar();
        onSaved?.();
      }
    } catch (e) { alert('No se pudo generar: ' + (e?.message || e)); }
    finally { setGenStd((s) => ({ ...s, [el.id]: false })); }
  };

  const colorDe = (cat) => CAT_COLOR[cat] || '#888';

  const FichaItem = ({ it }) => {
    const color = colorDe(it.cat);
    const editando = editId === it.id;
    return (
      <div className="rounded-lg border border-border p-2.5" style={{ borderColor: color + '44' }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{it.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {CATEGORIAS.find((c) => c.id === it.cat)?.label || it.cat}
              {it.glyph ? ` · ${it.glyph}` : ''}
            </div>
          </div>
          <button onClick={() => borrar(it)} className="text-destructive/70 hover:text-destructive p-1" title="Borrar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Símbolo estándar */}
          <div className="rounded-md border border-border bg-muted/20 p-1.5 flex flex-col items-center gap-1">
            <svg viewBox="-40 -30 80 60" width="84" height="60" style={{ display: 'block' }}>
              <PlanoSimbolo
                el={{ id: 'g-' + it.id, type: 'custom_' + it.id, cat: it.cat, label: it.name,
                  glyph: it.glyph, color, w_m: it.w_m, h_m: it.h_m, datos: {} }}
                scale={48} mini />
            </svg>
            <span className="text-[10px] font-semibold" style={{ color }}>Estándar</span>
          </div>
          {/* Icono IA */}
          <div className="rounded-md border border-border bg-muted/20 p-1.5 flex flex-col items-center gap-1">
            {it.image_url
              ? <img src={it.image_url} alt="IA" className="w-[84px] h-[60px] object-contain" />
              : <div className="w-[84px] h-[60px] flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">Sin icono IA</div>}
            <span className="text-[10px] font-semibold" style={{ color: '#7C3AED' }}>IA</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <button onClick={() => regenerarIA(it)} disabled={busyId === it.id}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
            {busyId === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Regenerar IA
          </button>
          <button onClick={() => setEditId(editando ? null : it.id)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[11px] hover:bg-muted"
            style={editando ? { borderColor: color, color } : {}}>
            <Wand2 className="w-3.5 h-3.5" /> Editar manual
          </button>
        </div>

        {editando && (
          <div className="mt-2 rounded-md border border-border p-2 flex flex-col gap-1.5 bg-muted/10">
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground flex-shrink-0">URL</span>
              <input value={manualUrl} onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://…/icono.png"
                className="flex-1 rounded-md border border-border bg-input px-2 py-1 text-[11px]" />
              <button onClick={() => pegarUrl(it)} disabled={!manualUrl.trim() || busyId === it.id}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: color }}>
                <Save className="w-3 h-3" /> Pegar
              </button>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[10px] text-muted-foreground">o subir imagen</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => subirManual(it, e.target.files?.[0])} />
              <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted">
                <Upload className="w-3 h-3" /> Subir
              </span>
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#00D4FF22,#7C3AED22)' }}>
              <Wand2 className="w-4 h-4" style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold">Editar iconos del catálogo</h3>
              <p className="text-[11px] text-muted-foreground">Regenera con IA, edita a mano y elige la mejor versión al colocar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Pestañas */}
        <div className="flex gap-1 px-4 pt-2">
          {[
            { id: 'mios', label: 'Mis iconos' },
            { id: 'estandar', label: 'Estándar (catálogo)' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
              style={tab === t.id
                ? { background: 'linear-gradient(135deg,#00D4FF,#7C3AED)', color: '#000' }
                : { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-input px-2 py-1 flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={tab === 'mios' ? q : qStd}
              onChange={(e) => tab === 'mios' ? setQ(e.target.value) : setQStd(e.target.value)}
              placeholder="Buscar…" className="bg-transparent text-xs outline-none flex-1 min-w-0" />
            {(q || qStd) && <button onClick={() => { setQ(''); setQStd(''); }} className="text-[10px] text-muted-foreground">✕</button>}
          </div>
          <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}
            className="rounded-md border border-border bg-input px-2 py-1 text-xs">
            <option value="todos">Todos los apartados</option>
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 pt-1">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : tab === 'mios' ? (
            misItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No tienes iconos propios todavía. Usa «Añadir elemento» para crearlos o genera la versión IA de un símbolo estándar en la pestaña «Estándar».
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {misItems.map((it) => <FichaItem key={it.id} it={it} />)}
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stdItems.map((el) => {
                const color = colorDe(el.cat);
                const generando = genStd[el.id];
                return (
                  <div key={el.id} className="rounded-lg border border-border p-2 flex flex-col items-center gap-1.5"
                    style={{ borderColor: color + '55', borderTopColor: color, borderTopWidth: 2 }}>
                    <svg viewBox="-40 -30 80 60" width="76" height="56" style={{ display: 'block' }}>
                      <PlanoSimbolo
                        el={{ ...el, type: el.id, id: 'gs-' + el.id, datos: {}, color, w_m: el.w_m, h_m: el.h_m }}
                        scale={48} mini />
                    </svg>
                    <span className="text-[10px] font-medium text-center leading-tight w-full truncate">{el.label}</span>
                    <button onClick={() => crearVersionIAStd(el)} disabled={generando}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-white hover:opacity-90 disabled:opacity-50 w-full justify-center"
                      style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
                      {generando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {generando ? 'Generando…' : 'Crear versión IA'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end p-3 border-t border-border">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-1.5 text-xs hover:bg-muted">Cerrar</button>
        </div>
      </div>
    </div>
  );
}