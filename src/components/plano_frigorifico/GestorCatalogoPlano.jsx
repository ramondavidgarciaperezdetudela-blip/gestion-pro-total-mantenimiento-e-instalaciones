import React, { useState } from 'react';
import { Plus, Search, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORIAS, CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';

/**
 * GestorCatalogoPlano — diálogo para añadir un elemento o maquinaria propia
 * al catálogo del plano. Se elige el apartado (categoría), el nombre, el
 * tamaño y el precio; el icono se BUSCA SOLO con la IA (GenerateImage) a
 * partir del nombre, para que el símbolo quede como el de cualquier equipo
 * de fábrica. Lo que se guarda queda en su apartado para usarlo luego.
 *
 * El elemento se guarda en la entidad PlanoCatalogItem y aparece en la paleta
 * (y en los menús a pantalla completa) dentro de la categoría elegida.
 */
export default function GestorCatalogoPlano({ open, onClose, onSaved, existentes = [] }) {
  const [name, setName] = useState('');
  const [cat, setCat] = useState('refrigeracion');
  const [w_m, setW] = useState(0.6);
  const [h_m, setH] = useState(0.6);
  const [precio, setPrecio] = useState('');
  const [image_url, setImageUrl] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  const glyph = (name || '').trim().slice(0, 3).toUpperCase() || 'XX';

  const buscarIcono = async () => {
    if (!name.trim()) return;
    setBuscando(true);
    try {
      const catLabel = CATEGORIAS.find((c) => c.id === cat)?.label || cat;
      const prompt = `Icono técnico realista en vista superior de "${name.trim()}" (${catLabel}), símbolo para un plano de instalación frigorífica/climatización, estilo vectorial limpio, centrado sobre fondo blanco, sin texto, nítido, claramente reconocible como la pieza o maquinaria que es`;
      const res = await base44.integrations.Core.GenerateImage({ prompt });
      if (res?.url) setImageUrl(res.url);
    } catch (e) {
      console.error(e);
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async () => {
    if (!name.trim() || !cat) return;
    setGuardando(true);
    try {
      await base44.entities.PlanoCatalogItem.create({
        name: name.trim(), cat, glyph,
        w_m: Number(w_m) || 0.6, h_m: Number(h_m) || 0.6,
        precio: Number(precio) || 0,
        image_url: image_url || '',
        is_active: true,
      });
      // Limpia el formulario por si se quiere añadir otro.
      setName(''); setPrecio(''); setImageUrl(''); setW(0.6); setH(0.6);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      alert('No se pudo guardar el elemento: ' + (e?.message || e));
    } finally {
      setGuardando(false);
    }
  };

  const color = CAT_COLOR[cat];

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
            <Plus className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Añadir elemento al catálogo</h3>
            <p className="text-[11px] text-muted-foreground">Se guarda en el apartado que elijas para usarlo siempre que quieras</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Nombre del elemento / maquinaria</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Enfriador de leche"
              className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Apartado (categoría)</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Ancho (m)</span>
              <input type="number" step="0.1" value={w_m} onChange={(e) => setW(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Alto (m)</span>
              <input type="number" step="0.1" value={h_m} onChange={(e) => setH(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Precio (€)</span>
              <input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)}
                placeholder="orientativo"
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
            </label>
          </div>

          {/* Icono buscado automáticamente por IA */}
          <div className="rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">Icono del símbolo</span>
              <button onClick={buscarIcono} disabled={buscando || !name.trim()}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
                {buscando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {buscando ? 'Buscando…' : 'Buscar icono (IA)'}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-16 h-12 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                {image_url
                  ? <img src={image_url} alt="icono" className="w-full h-full object-contain" />
                  : <Search className="w-5 h-5 text-muted-foreground" />}
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground">
                La IA busca un icono realista a partir del nombre. Si no lo generas, el elemento usa un símbolo genérico con su código «{glyph}».
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancelar</button>
          <button onClick={guardar} disabled={guardando || !name.trim()}
            className="rounded-md px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: color }}>
            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Guardar en el apartado
          </button>
        </div>
      </div>
    </div>
  );
}