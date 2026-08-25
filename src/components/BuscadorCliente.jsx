import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, User } from 'lucide-react';

/**
 * Elegir cliente ESCRIBIENDO el nombre, no buscándolo en una lista.
 *
 * Antes había un desplegable con todos los clientes, uno detrás de otro. Con
 * cuatro clientes va bien; con trescientos es inservible: hay que bajar por la
 * lista buscando a ojo, y en el móvil, con una mano y en casa de un cliente,
 * es un suplicio. Aquí se escriben tres letras y aparece.
 *
 * Busca por nombre, apellidos, empresa, NIF, teléfono, ciudad y correo,
 * ignorando tildes y mayúsculas: quien escribe "martinez" tiene que encontrar
 * a "Martínez", y quien busca por el móvil del cliente también.
 *
 * Se deja la misma forma de avisar que tenía el desplegable —onValueChange con
 * el identificador— para que las 28 pantallas que lo usan sigan funcionando
 * sin tocar su código.
 */

/** Sin tildes y en minúsculas, para que la búsqueda no falle por un acento. */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Cómo se llama el cliente en pantalla. */
export function nombreCompleto(c) {
  if (!c) return '';
  const persona = `${c.name || ''} ${c.surname || ''}`.trim();
  if (persona && c.company_name && normalizar(persona) !== normalizar(c.company_name)) {
    return `${persona} (${c.company_name})`;
  }
  return persona || c.company_name || '(sin nombre)';
}

/** Todo aquello por lo que se puede buscar a un cliente. */
function textoBuscable(c) {
  return normalizar([
    c.name, c.surname, c.company_name, c.nif, c.phone, c.mobile,
    c.email, c.city, c.address,
  ].filter(Boolean).join(' '));
}

/**
 * Los clientes que encajan con lo escrito.
 *
 * Se admiten varias palabras sueltas y en cualquier orden: "martinez utrera"
 * encuentra al Martínez de Utrera. Con el texto entero de una sola pieza no se
 * encontraría, porque en la ficha no van seguidos.
 */
export function filtrarClientes(clientes, texto, tope = 40) {
  const q = normalizar(texto);
  if (!q) return (clientes || []).slice(0, tope);
  const palabras = q.split(/\s+/).filter(Boolean);
  const conPeso = [];
  for (const c of clientes || []) {
    const donde = textoBuscable(c);
    if (!palabras.every((p) => donde.includes(p))) continue;
    // Quien empieza por lo escrito va primero: buscando "san" interesa antes
    // "Sánchez" que "Construcciones del Sander".
    const empieza = normalizar(nombreCompleto(c)).startsWith(palabras[0]);
    conPeso.push({ c, peso: empieza ? 0 : 1 });
  }
  return conPeso.sort((a, b) => a.peso - b.peso).slice(0, tope).map((x) => x.c);
}

export default function BuscadorCliente({
  contacts = [],
  value = '',
  onValueChange,
  placeholder = 'Escribe el nombre del cliente…',
  className = '',
  autoFocus = false,
  'data-prueba': prueba = 'buscador-cliente',
}) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef(null);

  const elegido = useMemo(
    () => (contacts || []).find((c) => c.id === value) || null,
    [contacts, value],
  );

  const encontrados = useMemo(
    () => filtrarClientes(contacts, texto),
    [contacts, texto],
  );

  // Cerrar al tocar fuera. Sin esto, la lista se queda abierta tapando lo de
  // debajo y en el móvil no hay forma cómoda de quitarla.
  useEffect(() => {
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('touchstart', fuera);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('touchstart', fuera);
    };
  }, []);

  const elegir = (c) => {
    onValueChange?.(c.id);
    setTexto('');
    setAbierto(false);
  };

  const quitar = () => {
    onValueChange?.('');
    setTexto('');
    setAbierto(false);
  };

  // Ya hay cliente puesto: se enseña quién es y se puede cambiar.
  if (elegido) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 ${className}`}
        data-prueba={prueba}
      >
        <User className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate text-sm" data-prueba="cliente-elegido">
          {nombreCompleto(elegido)}
        </span>
        <button
          type="button"
          onClick={quitar}
          aria-label="Cambiar de cliente"
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={caja} className={`relative ${className}`} data-prueba={prueba}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-blue-400">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={texto}
          autoFocus={autoFocus}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setResaltado(0); }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setResaltado((i) => Math.min(i + 1, encontrados.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setResaltado((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && encontrados[resaltado]) { e.preventDefault(); elegir(encontrados[resaltado]); }
            else if (e.key === 'Escape') setAbierto(false);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {abierto && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl"
          data-prueba="lista-clientes"
        >
          {encontrados.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">
              {texto
                ? `Ningún cliente con «${texto}». Prueba con el apellido, la empresa o el NIF.`
                : 'Todavía no hay clientes dados de alta.'}
            </p>
          ) : (
            encontrados.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegir(c)}
                onMouseEnter={() => setResaltado(i)}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${i === resaltado ? 'bg-blue-50' : ''}`}
              >
                <span className="text-sm font-medium text-slate-800">{nombreCompleto(c)}</span>
                {(c.city || c.phone || c.nif) && (
                  <span className="text-xs text-slate-500">
                    {[c.city, c.phone, c.nif].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
