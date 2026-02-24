// Utility para descargar logos automáticamente
export const fetchCompanyLogo = async (website, companyName) => {
  try {
    if (!website && !companyName) return null;

    // Intentar con website primero
    if (website) {
      try {
        const domain = new URL(website).hostname.replace('www.', '');
        const url = `https://logo.clearbit.com/${domain}?size=400`;
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) return url;
      } catch (e) {
        // Continuar si falla
      }
    }

    // Intentar con nombre de empresa
    if (companyName) {
      const slugName = companyName.toLowerCase().replace(/\s+/g, '');
      const domains = ['.com', '.es', '.eu', '.net', '.org'];
      
      for (const domain of domains) {
        const testUrl = `https://logo.clearbit.com/${slugName}${domain}?size=400`;
        try {
          const response = await fetch(testUrl, { method: 'HEAD' });
          if (response.ok) return testUrl;
        } catch (e) {
          // Continuar
        }
      }
    }

    return null;
  } catch (e) {
    return null;
  }
};