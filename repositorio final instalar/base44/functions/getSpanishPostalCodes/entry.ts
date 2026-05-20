import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchType, searchValue } = await req.json();

    if (!searchValue || !searchType) {
      return Response.json({ error: 'searchType and searchValue required' }, { status: 400 });
    }

    let results = [];

    try {
      // Usar API de códigos postales españoles (codigospostales.com o similar)
      if (searchType === 'postal_code') {
        // Buscar por código postal
        const response = await fetch(`https://api.codigospostales.es/?json&cod=${searchValue.trim()}`);
        const data = await response.json();

        if (data && Array.isArray(data) && data.length > 0) {
          results = data.map(item => ({
            postal_code: item.codigo_postal,
            city: item.municipio,
            province: item.provincia,
            community: item.comunidad_autonoma
          }));
        }
      } else if (searchType === 'city') {
        // Buscar por ciudad/población
        const response = await fetch(`https://api.codigospostales.es/?json&municipio=${encodeURIComponent(searchValue.trim())}`);
        const data = await response.json();

        if (data && Array.isArray(data) && data.length > 0) {
          results = data.map(item => ({
            postal_code: item.codigo_postal,
            city: item.municipio,
            province: item.provincia,
            community: item.comunidad_autonoma
          }));

          // Eliminar duplicados
          results = results.filter((item, index, self) =>
            index === self.findIndex(t => t.postal_code === item.postal_code)
          );
        }
      } else if (searchType === 'province') {
        // Buscar por provincia
        const response = await fetch(`https://api.codigospostales.es/?json&provincia=${encodeURIComponent(searchValue.trim())}`);
        const data = await response.json();

        if (data && Array.isArray(data) && data.length > 0) {
          results = data.map(item => ({
            postal_code: item.codigo_postal,
            city: item.municipio,
            province: item.provincia,
            community: item.comunidad_autonoma
          }));

          results = results.filter((item, index, self) =>
            index === self.findIndex(t => t.postal_code === item.postal_code)
          ).slice(0, 50); // Limitar resultados para no saturar
        }
      }
    } catch (apiError) {
      console.log('API error:', apiError.message);
      // Si falla la API externa, devolver error controlado
      return Response.json({
        error: 'No se pudo obtener información de códigos postales',
        details: apiError.message
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      results: results.length > 0 ? results : [],
      count: results.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});