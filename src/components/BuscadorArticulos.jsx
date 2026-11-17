import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buscarIndexado } from '@/lib/buscarArticulos';
import { cargarIndiceArticulos } from '@/lib/articulosProveedores';

const CAMPOS = [
  { id: 'todo', texto: 'Todo' },
  { id: 'nombre', texto: 'Nombre / descripción' },
  { id: 'ref', texto: 'Referencia' },
  { id: 'extra', texto: 'Marca / categoría' },
];

/** Foto pequeña del artículo para reconocerlo de un vistazo (o un icono si aún no tiene). */
export function Miniatura({ src, tam = 'w-10 h-10' }) {
  const [fallo, setFallo] = useState(false);
  return (
    <div className={`${tam} flex-shrink-0 rounded border bg-gray-50 flex items-center justify-center overflow-hidden`}>
      {src && !fallo
        ? <img src={src} alt="" loading="lazy" className="w-full h-full object-contain" onError={() => setFallo(true)} />
        : <ImageIcon className="w-4 h-4 text-gray-300" />}
    </div>
  );
}

/**
 * Buscador de artículos de todos los proveedores y de «Mi base de datos».
 * Se puede buscar por nombre, descripción, referencia o palabras sueltas, y se puede
 * limitar a un proveedor. Al lado de cada resultado se ve en qué proveedor está.
 *   onSelect(articulo)  → { ref, nombre, proveedor, precio, unidad, plazo, origen }
 */
export default function BuscadorArticulos({ onSelect, autoFocus = true }) {
  const [indice, setIndice] = useState(null);
  const [texto, setTexto] = useState('');
  const [consulta, setConsulta] = useState('');
  const [campo, setCampo] = useState('todo');
  const [proveedor, setProveedor] = useState('');
  const [error, setError] = useState(false);
  const temporizador = useRef(null);

  const cargar = (forzar = false) => {
    setError(false); if (forzar) setIndice(null);
    cargarIndiceArticulos(forzar).then(setIndice).catch(() => setError(true));
  };
  useEffect(() => { cargar(); }, []);

  // Se espera un instante tras la última tecla para no buscar en cada letra.
  useEffect(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setConsulta(texto), 120);
    return () => clearTimeout(temporizador.current);
  }, [texto]);

  const res = useMemo(() => (indice ? buscarIndexado(indice, consulta, { campo, proveedor, max: 60 }) : null), [indice, consulta, campo, proveedor]);
  // Para el filtro: los proveedores que tienen coincidencias (se conserva el elegido aunque no tenga).
  const provs = res?.proveedores || [];
  const buscando = consulta.trim().length >= 2;
  const hayLista = buscando || !!proveedor; // con un proveedor elegido se ven sus artículos aunque no se escriba nada

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" autoFocus={autoFocus} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre, descripción, referencia o palabras…" data-prueba="buscador-articulos" />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {CAMPOS.map((c) => (
          <button key={c.id} type="button" onClick={() => setCampo(c.id)}
            className={`text-[11px] px-2 py-1 rounded-full border ${campo === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {c.texto}
          </button>
        ))}
        <select value={proveedor} onChange={(e) => setProveedor(e.target.value)} data-prueba="filtro-proveedor"
          className="ml-auto h-7 text-xs border border-input rounded-md px-2 max-w-[55%]">
          <option value="">{provs.length ? `Todos los proveedores (${provs.length})` : 'Todos los proveedores'}</option>
          {provs.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre} ({p.n})</option>)}
          {proveedor && !provs.some((p) => p.nombre === proveedor) && <option value={proveedor}>{proveedor} (0)</option>}
        </select>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1" data-prueba="resultados-articulos">
        {!indice && !error && <p className="text-center text-sm text-gray-400 py-6 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Cargando artículos…</p>}
        {error && (
          <p className="text-center text-sm text-red-500 py-4">No se han podido cargar los artículos.{' '}
            <button className="underline" onClick={() => cargar(true)}>Reintentar</button></p>
        )}
        {indice && !hayLista && <p className="text-center text-xs text-gray-400 py-6">Escribe al menos 2 letras, o elige un proveedor para ver sus artículos. Hay {indice.length.toLocaleString('es-ES')} artículos en total.</p>}
        {res?.parcial && res.items.length > 0 && <p className="text-center text-[11px] text-amber-600 py-1">Ninguno tiene todas las palabras. Estos tienen alguna (los de más coincidencias, primero).</p>}
        {res && hayLista && res.items.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">
            Nada con «{consulta}»{proveedor ? ` en ${proveedor}` : ''}.{proveedor && <> <button className="underline" onClick={() => setProveedor('')}>Buscar en todos los proveedores</button></>}
          </p>
        )}
        {res?.items.map((a, i) => (
          <button key={`${a.origen}-${a.id || i}-${i}`} type="button" onClick={() => onSelect?.(a)}
            className="w-full text-left flex items-center gap-2 p-2 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50">
            <Miniatura src={a.imagen} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{a.nombre || '(sin descripción)'}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.proveedor ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{a.proveedor || 'Sin proveedor'}</span>
                {a.ref && <span className="text-[10px] text-gray-500 font-mono">Ref: {a.ref}</span>}
                <span className="text-[10px] text-gray-400">{a.origen}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-sm font-bold text-emerald-700">{(a.precio || 0).toFixed(2)} €</span>
              <span className="text-[10px] text-gray-400">/{a.unidad || 'ud'}</span>
            </div>
          </button>
        ))}
        {res && res.total > res.items.length && <p className="text-center text-[11px] text-gray-400 py-1">Se muestran {res.items.length} de {res.total}. Escribe más palabras o elige un proveedor para afinar.</p>}
      </div>
      {indice && <button type="button" onClick={() => cargar(true)} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"><RefreshCw className="w-3 h-3" />Recargar artículos</button>}
    </div>
  );
}

/** Botón que abre el buscador en una ventana. */
export function BuscarEnProveedores({ onSelect, trigger }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {trigger ? <span onClick={() => setAbierto(true)} className="cursor-pointer">{trigger}</span> : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(true)} data-prueba="abrir-buscador-proveedores"
          className="gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50">
          <Search className="w-3 h-3" />Buscar en proveedores
        </Button>
      )}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Search className="w-4 h-4 text-emerald-600" />Buscar en proveedores</DialogTitle></DialogHeader>
          {abierto && <BuscadorArticulos onSelect={(a) => { onSelect?.(a); setAbierto(false); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
