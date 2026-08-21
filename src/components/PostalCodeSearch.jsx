import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  buscarPorPrefijo, buscarPorMunicipio, buscarPorProvincia, precargar,
} from '@/lib/codigosPostales';

/**
 * PostalCodeSearch — buscador de códigos postales de España.
 *
 * Antes preguntaba al servidor y en la obra, sin cobertura, no salía nada.
 * Ahora los datos van dentro de la aplicación: 10.866 códigos postales con su
 * municipio y su provincia, de las 52 provincias. Funciona sin conexión y sin
 * esperar, así que tampoco hace falta el retardo de antes al teclear.
 */
export default function PostalCodeSearch({ onSelect, type = 'postal_code' }) {
  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);

  // Los datos se cargan al abrir el cuadro, no al escribir: así la primera
  // búsqueda ya sale instantánea.
  useEffect(() => { precargar(); }, []);

  const doSearch = useCallback(async (value) => {
    setError('');
    // Con dos cifras ya se puede ir enseñando: "28" son los de Madrid.
    const minimo = type === 'postal_code' ? 2 : 2;
    if (!value || value.trim().length < minimo) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const encontrados = type === 'postal_code' ? await buscarPorPrefijo(value)
        : type === 'city' ? await buscarPorMunicipio(value)
          : await buscarPorProvincia(value);
      setResults(encontrados);
      setShowResults(true);
    } catch (err) {
      setError('No se pudieron cargar los códigos postales.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const handleSearch = (value) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // 120 ms en vez de 600: ya no se llama a ningún servidor, solo hace falta
    // no buscar en cada tecla.
    debounceRef.current = setTimeout(() => doSearch(value), 120);
  };

  const handleSelect = (result) => {
    onSelect(result);
    setSearchValue('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-1">
        <Input
          type="text"
          placeholder={
            type === 'postal_code' ? 'Código postal (ej: 28001)' :
            type === 'city' ? 'Población/Municipio' :
            'Provincia'
          }
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 my-auto mr-2" />}
      </div>

      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
            >
              <div className="font-medium text-gray-900">
                {result.postal_code} · {result.city}
              </div>
              <div className="text-xs text-gray-500">
                {result.province}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !loading && searchValue && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 text-sm text-gray-500 text-center">
          No se encontraron resultados
        </div>
      )}
    </div>
  );
}