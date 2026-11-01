import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, ExternalLink } from 'lucide-react';
import { totalDocumentos } from '@/lib/arbolDocumentos';

/**
 * Documentación del cliente en árbol: menús → submenús → ficheros.
 * Pulsar un fichero abre su enlace si lo tiene, o lleva a la pestaña donde se gestiona.
 */
export default function ArbolDocumentos({ arbol, onAbrir }) {
  // Cada menú con contenido está abierto salvo que el usuario lo cierre (los datos llegan después de montar).
  const [invertidos, setInvertidos] = useState(() => new Set());
  const alternar = (id) => setInvertidos((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const total = totalDocumentos(arbol);

  return (
    <div className="mt-2 space-y-2" data-testid="arbol-documentos">
      <p className="text-xs text-muted-foreground">{total === 0 ? 'Este cliente aún no tiene documentos vinculados.' : `${total} documento${total === 1 ? '' : 's'} vinculado${total === 1 ? '' : 's'} a este cliente, ordenados por menús y submenús.`}</p>
      {arbol.map((m) => {
        const abierto = (m.total > 0) !== invertidos.has(m.id);
        return (
          <section key={m.id} className="rounded-lg border bg-card" data-menu={m.id}>
            <button type="button" onClick={() => alternar(m.id)} aria-expanded={abierto} className="flex w-full items-center gap-2 px-3 py-2 text-left">
              {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {abierto ? <FolderOpen className="h-4 w-4 text-amber-500" /> : <Folder className="h-4 w-4 text-amber-500" />}
              <span className="flex-1 text-sm font-semibold">{m.titulo}</span>
              <span className="rounded-full border px-2 font-mono text-[11px] tabular-nums text-muted-foreground">{m.total}</span>
            </button>
            {abierto && (
              <div className="border-t px-3 py-2 space-y-2">
                {m.hijos.map((h) => (
                  <div key={h.id} data-submenu={h.id}>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Folder className="h-3 w-3" /><span className="flex-1">{h.titulo}</span><span className="font-mono tabular-nums">{h.archivos.length}</span>
                    </div>
                    {h.archivos.length === 0 ? (
                      <button type="button" onClick={() => onAbrir({ tab: h.tab })} className="ml-5 mt-0.5 text-xs text-muted-foreground underline-offset-2 hover:underline">Vacío · ir a la sección</button>
                    ) : (
                      <ul className="ml-5 mt-0.5 divide-y rounded-md border">
                        {h.archivos.map((a) => (
                          <li key={a.id}>
                            <button type="button" onClick={() => onAbrir(a)} data-archivo={a.id} className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent">
                              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">{a.titulo}</span>
                                {a.detalle && <span className="block truncate text-[11px] text-muted-foreground">{a.detalle}</span>}
                              </span>
                              {a.fecha && <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{a.fecha.split('-').reverse().join('/')}</span>}
                              {a.url && <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
