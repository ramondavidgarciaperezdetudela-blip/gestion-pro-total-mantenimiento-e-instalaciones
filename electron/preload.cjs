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
  // Copia escrita por partes, para que no haya que tenerla entera en memoria.
  abrirPorPartes: (nombre, carpeta) => ipcRenderer.invoke('gpt-copia-abrir', { nombre, carpeta }),
  anadirParte: (trozo) => ipcRenderer.invoke('gpt-copia-anadir', trozo),
  cerrarPorPartes: () => ipcRenderer.invoke('gpt-copia-cerrar'),
});

// La IA libre (Ollama en el propio ordenador, OpenRouter). Va por aquí para
// esquivar el bloqueo del navegador al abrirse la app como fichero local.
contextBridge.exposeInMainWorld('gptIA', {
  disponible: true,
  fetch: (peticion) => ipcRenderer.invoke('gpt-ia-fetch', peticion),
  abrir: (url) => ipcRenderer.invoke('gpt-ia-abrir', url),
  // Compartir la IA del ordenador con el móvil y la tablet por el wifi.
  compartirEncender: (destino) => ipcRenderer.invoke('gpt-ia-lan-encender', destino),
  compartirApagar: () => ipcRenderer.invoke('gpt-ia-lan-apagar'),
  compartirEstado: () => ipcRenderer.invoke('gpt-ia-lan-estado'),
});

// Descargar documentación técnica de los fabricantes. Aparte del puente de
// la IA a propósito: aquel solo llega a tu ordenador y a OpenRouter.
contextBridge.exposeInMainWorld('gptDocs', {
  disponible: true,
  descargar: (url) => ipcRenderer.invoke('gpt-doc-descargar', url),
});

// Impresoras del ordenador: listarlas y mandar a imprimir a la elegida.
contextBridge.exposeInMainWorld('gptImpresion', {
  disponible: true,
  listar: () => ipcRenderer.invoke('gpt-impresoras'),
  imprimir: (opciones) => ipcRenderer.invoke('gpt-imprimir', opciones),
});

// CADCraft: editor CAD libre que se instala junto con el programa.
contextBridge.exposeInMainWorld('gptCadcraft', {
  disponible: () => ipcRenderer.invoke('gpt-cadcraft-disponible'),
  abrir: (datos) => ipcRenderer.invoke('gpt-cadcraft-abrir', datos),
  abrirLibre: (datos) => ipcRenderer.invoke('gpt-cadcraft-abrir-libre', datos),
  comprobar: () => ipcRenderer.invoke('gpt-cadcraft-comprobar'),
  actualizar: () => ipcRenderer.invoke('gpt-cadcraft-actualizar'),
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
