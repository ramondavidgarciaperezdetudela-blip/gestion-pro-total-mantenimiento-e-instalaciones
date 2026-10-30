/**
 * Búsqueda de imágenes de productos usando IAs gratuitas (sin API key propia)
 * Cascada: DuckDuckGo AI → Pollinations → Bing scraping → DuckDuckGo search
 * 
 * TODAS son gratuitas, sin límite de créditos y sin API key propia.
 * Se pueden añadir claves opcionales (Gemini, Groq, DeepSeek) en .env.local
 * para mayor calidad y velocidad.
 */

const TIMEOUT = 6000;

async function tryFetch(url, opts = {}) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), ...opts });
    return r.ok ? r : null;
  } catch { return null; }
}

// ── 1. DuckDuckGo AI Chat (gratuito, sin key, usa GPT-4o-mini/Llama/Mixtral) ──
async function searchWithDDGAI(query) {
  try {
    // Obtener token VQD (necesario para la sesión)
    const statusR = await tryFetch('https://duckduckgo.com/duckchat/v1/status', {
      headers: { 'x-vqd-accept': '1' }
    });
    if (!statusR) return null;
    const vqd = statusR.headers.get('x-vqd-4');
    if (!vqd) return null;

    const payload = {
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Busca la URL de imagen de producto para: "${query}". 
        Devuelve SOLO una URL directa a imagen JPG/PNG/WebP del producto.
        Busca en tiendas online, catálogos de fabricante, Amazon, etc.
        Si no encuentras nada concreto, devuelve: null`
      }]
    };

    const chatR = await tryFetch('https://duckduckgo.com/duckchat/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vqd-4': vqd,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify(payload),
    });
    if (!chatR) return null;

    // DDG devuelve SSE (Server-Sent Events), leer el texto
    const text = await chatR.text();
    const lines = text.split('\n').filter(l => l.startsWith('data:'));
    let response = '';
    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(5));
        if (data.message) response += data.message;
      } catch {}
    }

    // Extraer URL de la respuesta
    const urlMatch = response.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)[^\s"'<>]*/i);
    if (urlMatch?.[0]) return urlMatch[0];
  } catch {}
  return null;
}

// ── 2. Pollinations.ai Text API (gratuito, sin key, usa Mistral/Llama) ────────
async function searchWithPollinations(query) {
  try {
    const prompt = encodeURIComponent(
      `Find a direct image URL (JPG/PNG/WebP) for product: "${query}". ` +
      `Search in manufacturer websites, online stores, catalogs. ` +
      `Reply with ONLY the URL, nothing else. If not found, reply: null`
    );
    const r = await tryFetch(`https://text.pollinations.ai/${prompt}`, {
      headers: { 'Accept': 'text/plain' }
    });
    if (!r) return null;
    const text = (await r.text()).trim();
    if (text && text !== 'null' && text.startsWith('http')) {
      // Verificar que es una imagen válida
      const imgR = await tryFetch(text, { method: 'HEAD' });
      const ct = imgR?.headers.get('content-type') || '';
      if (ct.startsWith('image/')) return text;
    }
  } catch {}
  return null;
}

// ── 3. Gemini Flash gratuito (opcional, con API key del usuario) ───────────────
async function searchWithGemini(query, apiKey) {
  if (!apiKey) return null;
  try {
    const r = await tryFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text:
            `Busca la URL de imagen del producto: "${query}". Responde SOLO con la URL directa (JPG/PNG/WebP). Si no encuentras: null`
          }] }]
        })
      }
    );
    if (!r) return null;
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text && text !== 'null' && text.startsWith('http')) return text;
  } catch {}
  return null;
}

// ── 4. DeepSeek API gratuita (con clave propia, generosa en free tier) ─────────
async function searchWithDeepSeek(query, apiKey) {
  if (!apiKey) return null;
  try {
    const r = await tryFetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content:
          `URL imagen producto "${query}". Solo URL directa JPG/PNG/WebP o null.`
        }],
        max_tokens: 200
      })
    });
    if (!r) return null;
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (text && text !== 'null' && text.startsWith('http')) return text;
  } catch {}
  return null;
}

// ── 5. Groq (Llama 3.3 70B, 6000 tokens/min gratis con API key) ───────────────
async function searchWithGroq(query, apiKey) {
  if (!apiKey) return null;
  try {
    const r = await tryFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content:
          `Direct image URL for product "${query}". Reply ONLY with URL (JPG/PNG/WebP) or null.`
        }],
        max_tokens: 150
      })
    });
    if (!r) return null;
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (text && text !== 'null' && text.startsWith('http')) return text;
  } catch {}
  return null;
}

// ── 6. Web del proveedor + Bing scraping (siempre, sin IA) ────────────────────
async function searchInWeb(query, supplierWebsite = '') {
  // Web del proveedor
  if (supplierWebsite) {
    const base = supplierWebsite.startsWith('http')
      ? supplierWebsite.replace(/\/+$/, '') : 'https://' + supplierWebsite;
    try {
      const r = await tryFetch(`${base}/search?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 GestionPro/1.0' } });
      if (r) {
        const html = await r.text();
        const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
                || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];
        if (og?.startsWith('http')) return og;
      }
    } catch {}
  }

  // Bing scraping
  try {
    const r = await tryFetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' producto')}&first=1`,
      { headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    );
    if (r) {
      const html = await r.text();
      const m = html.match(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
  } catch {}

  // DuckDuckGo Instant Answer
  try {
    const r = await tryFetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    if (r) {
      const data = await r.json();
      if (data.Image?.startsWith('http')) return data.Image;
      const t = data.RelatedTopics?.find(t => t.Icon?.URL?.startsWith('http'));
      if (t?.Icon?.URL) return t.Icon.URL;
    }
  } catch {}

  return null;
}

// ── Función principal: cascada de IAs gratuitas ────────────────────────────────
export async function searchProductImage(query, options = {}) {
  const {
    supplierWebsite = '',
    geminiKey   = import.meta.env?.VITE_GEMINI_API_KEY   || '',
    deepseekKey = import.meta.env?.VITE_DEEPSEEK_API_KEY || '',
    groqKey     = import.meta.env?.VITE_GROQ_API_KEY     || '',
    onProgress  = () => {},
  } = options;

  const steps = [
    { name: 'Web proveedor / Bing',  fn: () => searchInWeb(query, supplierWebsite) },
    { name: 'DuckDuckGo AI',         fn: () => searchWithDDGAI(query) },
    { name: 'Pollinations AI',       fn: () => searchWithPollinations(query) },
    { name: 'Gemini Flash',          fn: () => searchWithGemini(query, geminiKey),   skip: !geminiKey },
    { name: 'DeepSeek',              fn: () => searchWithDeepSeek(query, deepseekKey), skip: !deepseekKey },
    { name: 'Groq (Llama 3.3)',      fn: () => searchWithGroq(query, groqKey),       skip: !groqKey },
  ];

  for (const step of steps) {
    if (step.skip) continue;
    onProgress(`Buscando con ${step.name}...`);
    const result = await step.fn();
    if (result && result.startsWith('http')) {
      onProgress(`¡Imagen encontrada con ${step.name}!`);
      return { url: result, source: step.name };
    }
  }

  onProgress('');
  return null;
}

// ── Función compatible con el código existente ──────────────────────────────────
export async function fetchProductImageNoCredits(query, supplierWebsite = '') {
  const result = await searchProductImage(query, { supplierWebsite });
  return result?.url || null;
}
