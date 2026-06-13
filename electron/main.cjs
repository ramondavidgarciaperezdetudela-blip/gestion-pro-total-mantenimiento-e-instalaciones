// Proceso principal de Electron para Gestión Pro Total (escritorio).
// Carga la aplicación web ya compilada (carpeta dist) en una ventana nativa.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// Buscar el HTML a cargar. Preferimos el build OFFLINE de un solo fichero
// (todo embebido), que funciona desde file:// dentro de Electron. Si no
// existe, caemos al index.html normal.
function resolveIndex() {
  const candidates = [
    path.join(__dirname, '..', 'dist-offline', 'Gestion-Pro-Total.html'),
    path.join(__dirname, '..', 'dist', 'Gestion-Pro-Total.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
  ];
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || candidates[candidates.length - 1];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e3a5f',
    title: 'Gestión Pro Total',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Cargar la app compilada (preferimos el fichero único offline).
  const indexHtml = resolveIndex();
  win.loadFile(indexHtml);

  // Si una recarga en una subruta falla (file://), volver al index y dejar que
  // el enrutador del lado del cliente gestione la navegación.
  win.webContents.on('did-fail-load', () => {
    win.loadFile(indexHtml);
  });

  // Abrir enlaces externos en el navegador del sistema, no en la app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
