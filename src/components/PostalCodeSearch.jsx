import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';
import {
  buscarPorPrefijo, buscarPorMunicipio, buscarPorProvincia, precargar,
} from '@/lib/codigosPostales';

/**
 * PostalCodeSearch — el campo de población, provincia o código postal.
 *
 * Ojo, esto ES el campo, no un buscador aparte. Escribes dentro, sale la lista
 * debajo, eliges y se quedan puestos los tres datos: población, provincia y
 * código postal. Y lo que elegiste SE VE en el cuadro.
 *
 * Eso último es el fallo que tenía antes: al elegir de la lista se hacía
 * setSearchValue('') y el cuadro se quedaba en blanco. El dato se guardaba por
 * dentro, pero en pantalla no aparecía nada, así que parecía que no funcionaba
 * y la gente lo volvía a intentar. Un campo que borra lo que acabas de elegir
 * no sirve, aunque por debajo esté haciendo lo correcto.
 *
 * También se puede escribir a mano y quedarse sin elegir nada de la lista: hay
 * pedanías y polígonos que no están en el listado y el papel tiene que poder
 * llevar lo que hay de verdad.
 *
 * Los 10.866 códigos postales van dentro del programa: funciona en la
 * furgoneta sin cobertura.
 *
 * @param {string}   [value]      lo que se ve en el cuadro (campo controlado)
 * @param {Function} [onChange]   al escribir a mano: recibe el texto
 * @param {Function} onSelect     al elegir de la lista: { postal_code, city, province }
 * @param {string}   [type]       'postal_code' | 'city' | 'province'
 */
export default function PostalCodeSearch({
  onSelect,
  type = 'postal_code',
  value,
  onChange,
  placeholder,
  className = '',
  autoFocus = false,
  'data-prueba': prueba,
}) {
  const controlado = value !== undefined;
  const [texto, setTexto] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [resaltado, setResaltado] = useState(-1);
  const debounceRef = useRef(null);
  const caja = useRef(null);

  const enPantalla = controlado ? (value ?? '') : texto;

  // Los datos se cargan al abrir el cuadro, no al escribir: así la primera
  // búsqueda ya sale instantánea.
  useEffect(() => { precargar(); }, []);

  // Cerrar la lista al pinchar fuera o al pulsar Escape.
  useEffect(() => {
    if (!showResults) return undefined;
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setShowResults(false); };
    const escape = (e) => { if (e.key === 'Escape') setShowResults(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [showResults]);

  const doSearch = useCallback(async (v) => {
    setError('');
    if (!v || v.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    try {
      const encontrados = type === 'postal_code' ? await buscarPorPrefijo(v)
        : type === 'city' ? await buscarPorMunicipio(v)
          : await buscarPorProvincia(v);
      setResults(encontrados);
      setShowResults(true);
      setResaltado(encontrados.length ? 0 : -1);
    } catch {
      setError('No se han podido cargar los códigos postales.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const escribir = (v) => {
    if (controlado) onChange?.(v); else setTexto(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // 120 ms: ya no se llama a ningún servidor, solo hace falta no buscar en
    // cada tecla.
    debounceRef.current = setTimeout(() => doSearch(v), 120);
  };

  const elegir = (result) => {
    // Lo que se queda escrito es lo que le toca a ESTE campo; los otros dos
    // los coloca quien nos usa, con onSelect.
    const propio = type === 'postal_code' ? result.postal_code
      : type === 'city' ? result.city
        : result.province;
    if (controlado) onChange?.(propio); else setTexto(propio);
    onSelect?.(result);
    setResults([]);
    setShowResults(false);
    setResaltado(-1);
  };

  const teclas = (e) => {
    if (!showResults || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setResaltado((i) => (i + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setResaltado((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === 'Enter' && resaltado >= 0) { e.preventDefault(); elegir(results[resaltado]); }
  };

  const porDefecto = type === 'postal_code' ? 'Código postal (ej: 28001)'
    : type === 'city' ? 'Población / Municipio'
      : 'Provincia';

  return (
    <div className="relative" ref={caja}>
      <div className="flex gap-1 items-center">
        <Input
          type="text"
          data-prueba={prueba}
          placeholder={placeholder || porDefecto}
          value={enPantalla}
          autoFocus={autoFocus}
          onChange={(e) => escribir(e.target.value)}
          onFocus={() => { if (results.length) setShowResults(true); }}
          onKeyDown={teclas}
          className={`flex-1 ${className}`}
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />}
      </div>

      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div
          data-prueba={prueba ? `${prueba}-lista` : undefined}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {results.map((result, idx) => (
            <button
              key={`${result.postal_code}-${result.city}-${idx}`}
              type="button"
              // onMouseDown y no onClick: con onClick, el campo pierde el foco
              // antes y en algunos casos la lista se cerraba sin llegar a
              // registrar el clic.
              onMouseDown={(e) => { e.preventDefault(); elegir(result); }}
              onMouseEnter={() => setResaltado(idx)}
              className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-sm ${
                idx === resaltado ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="font-medium text-gray-900 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                {result.postal_code} · {result.city}
              </div>
              <div className="text-xs text-gray-500 pl-4.5">{result.province}</div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !loading && enPantalla.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 text-xs text-gray-500 text-center">
          No sale en el listado. Puedes dejarlo escrito a mano.
        </div>
      )}
    </div>
  );
}
