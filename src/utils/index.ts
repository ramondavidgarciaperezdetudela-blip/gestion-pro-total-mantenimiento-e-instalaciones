export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

// Navegación segura para web y escritorio (Electron).
// En la web (BrowserRouter) usamos rutas normales; en la app de escritorio,
// servida con file://, usamos HashRouter, por lo que hay que navegar por el
// hash o se produciría un 404 (file:///Home no existe en disco).
export function navigateTo(pageName: string) {
    const path = pageName.startsWith('/') ? pageName : '/' + pageName.replace(/ /g, '-');
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        window.location.hash = path;
    } else {
        window.location.href = path;
    }
}