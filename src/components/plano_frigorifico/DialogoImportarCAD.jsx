import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileUp, Upload, AlertTriangle, Box } from 'lucide-react';
import { parsearDXF, capasSugeridas, dxfAParedes, UNIDADES_MANUALES } from '@/lib/planoDxfImport';
import { parsearDWG, esCabeceraDWG } from '@/lib/planoDwgImport';

/**
 * DialogoImportarCAD — importa un plano de AutoCAD (DXF) al editor: elige el
 * archivo, las capas que son muros y las unidades, mira la vista previa y
 * se convierte en paredes (con su vista 3D), vinculadas al plano y al cliente.
 */
export default function DialogoImportarCAD({ open, escala = 50, onImportar, onClose }) {
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [capas, setCapas] = useState([]);
  const [unidad, setUnidad] = useState('auto');
  const [alto, setAlto] = useState('2.6');
  const [leyendo, setLeyendo] = useState(false);

  const reiniciar = () => { setArchivo(null); setParsed(null); setError(''); setCapas([]); setUnidad('auto'); };
  const elegir = async (file) => {
    if (!file) return;
    reiniciar();
    const buffer = await file.arrayBuffer().catch(() => null);
    if (!buffer) { setError('No se pudo leer el archivo.'); return; }
    let p;
    if (/\.dwg$/i.test(file.name) || esCabeceraDWG(new Uint8Array(buffer, 0, Math.min(6, buffer.byteLength)))) {
      setLeyendo(true);
      try { p = await parsearDWG(buffer); }
      catch (e) { setLeyendo(false); setError(`No se pudo leer el DWG (${String(e?.message || e)}). Prueba a guardarlo desde AutoCAD en una versión anterior (2013 o 2018) o como DXF.`); return; }
      setLeyendo(false);
    } else {
      p = parsearDXF(new TextDecoder().decode(buffer));
    }
    if (!p.valido) { setError(p.error); return; }
    if (!p.segmentos.length) { setError('El DXF no tiene líneas ni polilíneas que convertir en paredes.'); return; }
    setArchivo(file); setParsed(p); setCapas(capasSugeridas(p.capas));
  };
  const altoM = parseFloat(String(alto).replace(',', '.'));
  const resultado = useMemo(() => (parsed ? dxfAParedes(parsed, { capas, unidad, escala, alto_m: altoM > 0 ? altoM : 2.6 }) : null), [parsed, capas, unidad, escala, altoM]);

  if (!open) return null;
  const alternar = (c) => setCapas((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));
  const vb = (() => {
    if (!resultado?.paredes.length) return '0 0 10 10';
    const xs = resultado.paredes.flatMap((w) => [w.x1, w.x2]); const ys = resultado.paredes.flatMap((w) => [w.y1, w.y2]);
    return `${Math.min(...xs) - 10} ${Math.min(...ys) - 10} ${Math.max(...xs) - Math.min(...xs) + 20} ${Math.max(...ys) - Math.min(...ys) + 20}`;
  })();
  const cerrar = () => { reiniciar(); onClose(); };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4" onClick={cerrar}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="dialogo-cad">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#0ea5e915' }}><FileUp className="h-4 w-4" style={{ color: '#0ea5e9' }} /></div>
          <div>
            <h3 className="text-sm font-bold">Importar plano de AutoCAD</h3>
            <p className="text-[11px] text-muted-foreground">Si tienes el plano en AutoCAD o similar, súbelo (DWG o DXF): se reconocen sus muros, se crea la vista 3D y queda vinculado a la ficha y al cliente.</p>
          </div>
        </div>

        <input ref={inputRef} type="file" accept=".dwg,.dxf" className="hidden" data-testid="cad-archivo" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-sm hover:bg-muted">
          <Upload className="h-4 w-4" />{leyendo ? 'Leyendo el DWG…' : archivo ? archivo.name : 'Elegir archivo DWG o DXF'}
        </button>
        {error && <p className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive" role="alert"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}

        {parsed && resultado && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Capas que son muros</div>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2" data-testid="cad-capas">
                {Object.entries(parsed.capas).filter(([, v]) => v.lineas > 0).map(([c, v]) => (
                  <label key={c} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={capas.includes(c)} onChange={() => alternar(c)} /><span className="flex-1 truncate">{c}</span><span className="font-mono text-muted-foreground">{v.lineas}</span></label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidades del dibujo</span>
                  <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="mt-0.5 w-full rounded-md border bg-input px-2 py-1.5 text-xs" data-testid="cad-unidad">{UNIDADES_MANUALES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Altura de muros (m)</span>
                  <input value={alto} onChange={(e) => setAlto(e.target.value)} inputMode="decimal" className="mt-0.5 w-full rounded-md border bg-input px-2 py-1.5 text-xs" /></label>
              </div>
              <p className="text-[11px] text-muted-foreground" data-testid="cad-resumen">
                {resultado.paredes.length} paredes{resultado.elementos?.length ? ` · ${resultado.elementos.length} equipos` : ''} · {resultado.ancho_m.toFixed(1)} × {resultado.alto_plano_m.toFixed(1)} m (leído en {resultado.unidad}).
                {resultado.recortado && ' Se han limitado a las primeras 4.000 líneas.'}
                {(parsed.resumen.bloques + parsed.resumen.textos + parsed.resumen.circulos + parsed.resumen.arcos) > 0 && ` No se convierten: ${parsed.resumen.bloques} bloques, ${parsed.resumen.textos} textos, ${parsed.resumen.circulos} círculos y ${parsed.resumen.arcos} arcos (el archivo original queda guardado).`}
              </p>
            </div>
            <div className="flex items-center justify-center rounded-md border bg-muted/30 p-1" style={{ minHeight: 190 }}>
              <svg viewBox={vb} className="h-48 w-full" data-testid="cad-vista">
                {resultado.paredes.map((w) => <line key={w.id} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#0ea5e9" strokeWidth={Math.max(1, escala / 25)} strokeLinecap="round" />)}
              </svg>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={cerrar} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">Cancelar</button>
          <button type="button" disabled={!resultado || !resultado.paredes.length} onClick={() => { onImportar({ ...resultado, archivo, unidad: resultado.unidad }); reiniciar(); }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50" data-testid="cad-importar">
            <Box className="h-3.5 w-3.5" />Importar y ver en 3D
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
