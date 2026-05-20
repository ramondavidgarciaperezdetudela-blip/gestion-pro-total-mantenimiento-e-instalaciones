import { base44 } from '@/api/base44Client';

// Utility para descargar logos automáticamente usando IA
export const fetchCompanyLogo = async (website, companyName) => {
  try {
    if (!website && !companyName) return null;

    // Primero intentar con Clearbit si hay dominio
    if (website) {
      try {
        const domain = new URL(website).hostname.replace('www.', '');
        const clearbitUrl = `https://logo.clearbit.com/${domain}?size=400`;
        // Verificar que responde
        const res = await fetch(clearbitUrl, { method: 'HEAD' });
        if (res.ok) return clearbitUrl;
      } catch (e) {
        // continuar
      }
    }

    // Si no hay web o falló, usar IA para buscar la URL del logo
    const query = website
      ? `Find the official logo image URL for the company with website: ${website}. Company name: ${companyName || ''}. Return only a direct image URL (ending in .png, .jpg, .svg, or similar) that points to their logo. If not found, return null.`
      : `Find the official logo image URL for the company named: "${companyName}". Search for "${companyName} logo" and return only a direct image URL. If not found, return null.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: query,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          logo_url: { type: 'string', description: 'Direct URL to the company logo image, or empty string if not found' }
        }
      }
    });

    if (result?.logo_url && result.logo_url.startsWith('http')) {
      return result.logo_url;
    }

    // Fallback: Google Favicon como último recurso
    if (website) {
      try {
        const domain = new URL(website).hostname.replace('www.', '');
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
      } catch (e) {}
    }

    return null;
  } catch (e) {
    return null;
  }
};