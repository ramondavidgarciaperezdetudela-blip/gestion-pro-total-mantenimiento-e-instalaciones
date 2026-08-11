import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Búsqueda de códigos postales españoles.
// Fuente principal: Zippopotam (gratuita, fiable, con CORS) para código postal.
// La antigua api.codigospostales.es dejó de responder y provocaba errores 500.
// Esta versión NUNCA devuelve 500 por fallo de la fuente: si no hay datos,
// devuelve una lista vacía de forma controlada.

async function porCodigoPostal(cp: string) {
  const code = (cp || '').replace(/\D/g, '').slice(0, 5);
  if (code.length < 4) return [];
  try {
    const r = await fetch(`https://api.zippopotam.us/es/${code}`);
    if (!r.ok) return [];
    const d = await r.json();
    const places = Array.isArray(d?.places) ? d.places : [];
    return places.map((p: any) => ({
      postal_code: d['post code'] || code,
      city: p['place name'] || '',
      province: p['state'] || '',
      community: p['state'] || '',
    }));
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchType, searchValue } = await req.json();
    if (!searchValue || !searchType) {
      return Response.json({ success: true, results: [], count: 0 });
    }

    let results: any[] = [];
    // Caso principal: el usuario escribe un código postal para autocompletar
    // población y provincia.
    if (searchType === 'postal_code') {
      results = await porCodigoPostal(searchValue);
    } else {
      // Búsqueda por población/provincia: no hay fuente pública fiable gratuita
      // para el inverso; si el texto contiene dígitos, probamos como CP.
      const digits = String(searchValue).replace(/\D/g, '');
      if (digits.length >= 4) results = await porCodigoPostal(digits);
    }

    return Response.json({ success: true, results, count: results.length });
  } catch (error) {
    // Nunca 500 por esto: devolvemos vacío controlado.
    return Response.json({ success: true, results: [], count: 0, note: String(error?.message || error) });
  }
});
