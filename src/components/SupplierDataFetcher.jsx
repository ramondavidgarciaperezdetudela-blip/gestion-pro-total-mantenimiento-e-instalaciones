import { base44 } from '@/api/base44Client';

export const fetchSupplierDataFromAPI = async (searchTerm, searchType = 'name') => {
  if (!searchTerm?.trim()) return null;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Busca información pública de la empresa/proveedor española "${searchTerm}" en bases de datos públicas españolas (AEAT, Registro Mercantil, datos abiertos).
      
      Devuelve SOLO un JSON con estos campos (si los encuentras):
      {
        "name": "nombre exacto de la empresa",
        "nif": "NIF/CIF de la empresa",
        "address": "dirección completa",
        "city": "ciudad",
        "province": "provincia",
        "postal_code": "código postal",
        "phone": "teléfono de contacto",
        "email": "email de contacto",
        "website": "sitio web si existe",
        "sector": "sector/categoría (clima/refrigeracion/electrico/solar/fontaneria/general)",
        "description": "descripción breve de la empresa",
        "is_distributor": true/false,
        "found": true/false
      }
      
      Si no encuentras la empresa, devuelve {"found": false}.
      IMPORTANTE: Devuelve SOLO el JSON, sin explicaciones.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nif: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postal_code: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          website: { type: 'string' },
          sector: { type: 'string' },
          description: { type: 'string' },
          is_distributor: { type: 'boolean' },
          found: { type: 'boolean' }
        }
      }
    });

    if (response?.found) {
      return response;
    }
    return null;
  } catch (error) {
    console.error('Error fetching supplier data:', error);
    return null;
  }
};

export const mapCategoryFromSector = (sector) => {
  const sectorLower = sector?.toLowerCase() || '';
  const categories = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general'];
  
  for (const cat of categories) {
    if (sectorLower.includes(cat)) return cat;
  }
  
  if (sectorLower.includes('hvac') || sectorLower.includes('aire')) return 'clima';
  if (sectorLower.includes('frío') || sectorLower.includes('refrigeración')) return 'refrigeracion';
  if (sectorLower.includes('electric') || sectorLower.includes('electrical')) return 'electrico';
  if (sectorLower.includes('solar') || sectorLower.includes('fotovoltaica')) return 'solar';
  if (sectorLower.includes('tuberias') || sectorLower.includes('fontaneria') || sectorLower.includes('agua')) return 'fontaneria';
  
  return 'general';
};