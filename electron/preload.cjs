// Puente seguro entre el proceso principal de Electron (autoUpdater) y la
// pantalla de la app (renderer). Expone solo lo necesario para que el botón
// "Instalar actualización" de UpdateChecker.jsx funcione dentro de la propia
// interfaz, en vez de depender del aviso nativo del sistema operativo.
const { contextBridge, ipcRenderer } = require('electron');

const EVENTS = [
  'gpt-update-checking',
  'gpt-update-available',
  'gpt-update-not-available',
  'gpt-update-download-progress',
  'gpt-update-downloaded',
  'gpt-update-error',
];

// Copias de seguridad en disco. La pantalla no toca el sistema de ficheros:
// pide "guarda esto" y recibe la ruta real donde ha quedado.
contextBridge.exposeInMainWorld('gptCopias', {
  disponible: true,
  guardar: (nombre, contenido, carpeta) =>
    ipcRenderer.invoke('gpt-guardar-copia', { nombre, contenido, carpeta }),
  carpeta: (elegida) => ipcRenderer.invoke('gpt-carpeta-copias', elegida),
  abrirCarpeta: (elegida) => ipcRenderer.invoke('gpt-abrir-carpeta-copias', elegida),
  elegirCarpeta: () => ipcRenderer.invoke('gpt-elegir-carpeta-copias'),
});

contextBridge.exposeInMainWorld('gptUpdater', {
  check: () => ipcRenderer.send('gpt-check-for-updates'),
  install: () => ipcRenderer.send('gpt-install-update'),
  on: (event, callback) => {
    if (!EVENTS.includes(event)) return () => {};
    const listener = (_evt, payload) => callback(payload);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  },
});
