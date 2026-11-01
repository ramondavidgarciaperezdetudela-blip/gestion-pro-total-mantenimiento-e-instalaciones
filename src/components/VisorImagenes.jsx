import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

// Visor a pantalla completa: flechas/teclado para pasar, lupa para ampliar.
export default function VisorImagenes({ fotos = [], inicio = 0, titulo = '', onCerrar }) {
  const [i, setI] = useState(Math.min(Math.max(inicio, 0), Math.max(fotos.length - 1, 0)));
  const [zoom, setZoom] = useState(1);
  const n = fotos.length;
  const ir = (d) => { setI((x) => (x + d + n) % n); setZoom(1); };

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowRight' && n > 1) ir(1);
      else if (e.key === 'ArrowLeft' && n > 1) ir(-1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  if (!n) return null;
  const f = fotos[i];
  const url = typeof f === 'string' ? f : f.url;
  const pie = typeof f === 'string' ? '' : f.etiqueta;
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col" role="dialog" aria-label="Visor de imágenes" data-testid="visor-imagenes">
      <div className="flex items-center gap-2 text-white p-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{titulo}</p>
          <p className="text-xs text-white/70">{i + 1} de {n}{pie ? ` · ${pie}` : ''}</p>
        </div>
        <button aria-label="Reducir" className="p-2" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}><ZoomOut className="w-5 h-5" /></button>
        <button aria-label="Ampliar" className="p-2" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}><ZoomIn className="w-5 h-5" /></button>
        <a aria-label="Descargar" className="p-2" href={url} download target="_blank" rel="noreferrer"><Download className="w-5 h-5" /></a>
        <button aria-label="Cerrar" className="p-2" onClick={onCerrar}><X className="w-6 h-6" /></button>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center relative" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
        <img src={url} alt={pie || titulo} style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : 'none', maxHeight: zoom === 1 ? '100%' : 'none', objectFit: 'contain' }} />
        {n > 1 && <>
          <button aria-label="Anterior" className="fixed left-2 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2" onClick={() => ir(-1)}><ChevronLeft className="w-6 h-6" /></button>
          <button aria-label="Siguiente" className="fixed right-2 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2" onClick={() => ir(1)}><ChevronRight className="w-6 h-6" /></button>
        </>}
      </div>
    </div>
  );
}
