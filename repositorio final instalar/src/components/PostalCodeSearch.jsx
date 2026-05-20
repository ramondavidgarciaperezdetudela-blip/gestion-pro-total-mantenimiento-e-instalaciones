import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PostalCodeSearch({ onSelect, type = 'postal_code' }) {
  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (value) => {
    setError('');
    if (!value || value.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('getSpanishPostalCodes', {
        searchType: type,
        searchValue: value
      });

      if (response.data?.success && response.data.results) {
        setResults(response.data.results);
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(true);
      }
    } catch (err) {
      setError('Error al buscar: ' + err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const handleSearch = (value) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 600);
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
                {result.postal_code} - {result.city}
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