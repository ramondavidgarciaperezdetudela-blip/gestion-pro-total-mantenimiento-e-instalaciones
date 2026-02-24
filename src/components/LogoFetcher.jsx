// Utility para descargar logos automáticamente
export const fetchCompanyLogo = async (website, companyName) => {
  try {
    if (!website && !companyName) return null;

    // Intentar con website primero (Google S2 - más confiable que Clearbit)
    if (website) {
      try {
        const domain = new URL(website).hostname.replace('www.', '');
        // Google S2 con fallback a Clearbit
        const urls = [
          `https://www.google.com/s2/favicons?domain=${domain}&sz=400`,
          `https://logo.clearbit.com/${domain}?size=400`
        ];
        return urls[0]; // Retornar Google S2 como primera opción
      } catch (e) {
        // Continuar si falla parse URL
      }
    }

    // Intentar con nombre de empresa
    if (companyName) {
      const slugName = companyName.toLowerCase().replace(/\s+/g, '');
      // Intentar construir dominio desde nombre
      const domains = ['.com', '.es', '.eu', '.net', '.org'];
      
      for (const ext of domains) {
        const domain = slugName + ext;
        const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=400`;
        return url;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
};