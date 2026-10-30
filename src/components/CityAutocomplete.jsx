import React, { useState, useRef, useEffect } from 'react';
import { buscarPorMunicipio } from '@/lib/codigosPostales';
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';

// Mapa básico de ciudades principales españolas → {provincia, cp}
const CITY_MAP = {
  'barcelona': { province: 'Barcelona', postal_code: '08001' },
  'madrid': { province: 'Madrid', postal_code: '28001' },
  'valencia': { province: 'Valencia', postal_code: '46001' },
  'sevilla': { province: 'Sevilla', postal_code: '41001' },
  'zaragoza': { province: 'Zaragoza', postal_code: '50001' },
  'málaga': { province: 'Málaga', postal_code: '29001' },
  'malaga': { province: 'Málaga', postal_code: '29001' },
  'murcia': { province: 'Murcia', postal_code: '30001' },
  'palma': { province: 'Palma de Mallorca', postal_code: '07001' },
  'las palmas': { province: 'Las Palmas', postal_code: '35001' },
  'bilbao': { province: 'Vizcaya', postal_code: '48001' },
  'alicante': { province: 'Alicante', postal_code: '03001' },
  'córdoba': { province: 'Córdoba', postal_code: '14001' },
  'cordoba': { province: 'Córdoba', postal_code: '14001' },
  'valladolid': { province: 'Valladolid', postal_code: '47001' },
  'vigo': { province: 'Pontevedra', postal_code: '36201' },
  'gijón': { province: 'Asturias', postal_code: '33201' },
  'gijon': { province: 'Asturias', postal_code: '33201' },
  'granada': { province: 'Granada', postal_code: '18001' },
  'tarragona': { province: 'Tarragona', postal_code: '43001' },
  'reus': { province: 'Tarragona', postal_code: '43201' },
  'perafort': { province: 'Tarragona', postal_code: '43152' },
  'lleida': { province: 'Lérida', postal_code: '25001' },
  'lérida': { province: 'Lérida', postal_code: '25001' },
  'girona': { province: 'Girona', postal_code: '17001' },
  'gerona': { province: 'Girona', postal_code: '17001' },
  'castellón': { province: 'Castellón', postal_code: '12001' },
  'castellon': { province: 'Castellón', postal_code: '12001' },
  'burgos': { province: 'Burgos', postal_code: '09001' },
  'salamanca': { province: 'Salamanca', postal_code: '37001' },
  'toledo': { province: 'Toledo', postal_code: '45001' },
  'albacete': { province: 'Albacete', postal_code: '02001' },
  'huelva': { province: 'Huelva', postal_code: '21001' },
  'badajoz': { province: 'Badajoz', postal_code: '06001' },
  'logroño': { province: 'La Rioja', postal_code: '26001' },
  'logro\u00f1o': { province: 'La Rioja', postal_code: '26001' },
  'santander': { province: 'Cantabria', postal_code: '39001' },
  'pamplona': { province: 'Navarra', postal_code: '31001' },
  'san sebastián': { province: 'Guipúzcoa', postal_code: '20001' },
  'donostia': { province: 'Guipúzcoa', postal_code: '20001' },
  'vitoria': { province: 'Álava', postal_code: '01001' },
  'vitoria-gasteiz': { province: 'Álava', postal_code: '01001' },
  'oviedo': { province: 'Asturias', postal_code: '33001' },
  'la coruña': { province: 'La Coruña', postal_code: '15001' },
  'coruña': { province: 'La Coruña', postal_code: '15001' },
  'santiago de compostela': { province: 'La Coruña', postal_code: '15701' },
  'pontevedra': { province: 'Pontevedra', postal_code: '36001' },
  'ourense': { province: 'Orense', postal_code: '32001' },
  'orense': { province: 'Orense', postal_code: '32001' },
  'lugo': { province: 'Lugo', postal_code: '27001' },
  'cáceres': { province: 'Cáceres', postal_code: '10001' },
  'caceres': { province: 'Cáceres', postal_code: '10001' },
  'cádiz': { province: 'Cádiz', postal_code: '11001' },
  'cadiz': { province: 'Cádiz', postal_code: '11001' },
  'jerez': { province: 'Cádiz', postal_code: '11401' },
  'almería': { province: 'Almería', postal_code: '04001' },
  'almeria': { province: 'Almería', postal_code: '04001' },
  'jaén': { province: 'Jaén', postal_code: '23001' },
  'jaen': { province: 'Jaén', postal_code: '23001' },
  'cuenca': { province: 'Cuenca', postal_code: '16001' },
  'guadalajara': { province: 'Guadalajara', postal_code: '19001' },
  'ávila': { province: 'Ávila', postal_code: '05001' },
  'avila': { province: 'Ávila', postal_code: '05001' },
  'segovia': { province: 'Segovia', postal_code: '40001' },
  'soria': { province: 'Soria', postal_code: '42001' },
  'palencia': { province: 'Palencia', postal_code: '34001' },
  'zamora': { province: 'Zamora', postal_code: '49001' },
  'huesca': { province: 'Huesca', postal_code: '22001' },
  'teruel': { province: 'Teruel', postal_code: '44001' },
  'ciudad real': { province: 'Ciudad Real', postal_code: '13001' },
  'mérida': { province: 'Badajoz', postal_code: '06800' },
  'merida': { province: 'Badajoz', postal_code: '06800' },
};

export default function CityAutocomplete({ city, province, postal_code, onChange, className = '' }) {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const lookupCity = async (cityValue) => {
    if (!cityValue || cityValue.length < 3) return;
    const key = cityValue.toLowerCase().trim();
    
    // Primero buscar en mapa local
    const local = CITY_MAP[key];
    if (local) {
      onChange({ city: cityValue, province: local.province, postal_code: local.postal_code });
      return;
    }

    // Si no está en la lista corta, se busca en el callejero completo que va
    // DENTRO del programa: los 8.000 municipios de España con sus códigos
    // postales. Antes esto preguntaba a la IA por cada nombre que no
    // estuviera en las 50 ciudades de arriba — y lo hacía solo, mientras se
    // escribía la ficha de un cliente. Cada tecleo podía costar créditos, sin
    // pedir permiso y sin decirlo, y encima no funcionaba sin cobertura, que
    // es justo cuando se rellena una ficha en la obra.
    setLoading(true);
    try {
      const encontrados = await buscarPorMunicipio(cityValue, 1);
      if (encontrados.length > 0) {
        const m = encontrados[0];
        onChange({ city: m.city, province: m.province, postal_code: m.postal_code || postal_code });
      }
    } catch (e) {
      console.error('[CityAutocomplete] no se pudo buscar el municipio:', e);
    }
    setLoading(false);
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    onChange({ city: val, province, postal_code });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => lookupCity(val), 800);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="relative">
      <Input
        placeholder="Ciudad"
        value={city || ''}
        onChange={handleCityChange}
        className={className}
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400" />
      )}
    </div>
  );
}