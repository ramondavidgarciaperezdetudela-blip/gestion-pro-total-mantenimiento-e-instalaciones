// Proceso principal de Electron para Gestión Pro Total (escritorio).
// Carga la aplicación web ya compilada (carpeta dist) en una ventana nativa.
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// Auto-actualización (opcional). Comprueba si hay una versión nueva publicada
// en las Releases de GitHub y la descarga sola. El progreso y el botón
// "Instalar actualización" se muestran dentro de la propia app (ver
// preload.cjs + UpdateChecker.jsx) en vez de depender de avisos nativos del
// sistema operativo. Nunca interrumpe si no hay conexión o el canal no está
// disponible.
// NOTA: si el repositorio de releases es privado, el equipo del cliente no
// puede descargar la actualización sin credenciales; en ese caso publica las
// releases en un repositorio público o un servidor propio (provider en
// electron-builder.yml). Mientras tanto, esto simplemente no hace nada.
let mainWindow = null;
let autoUpdaterRef = null;

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function initAutoUpdate() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdaterRef = autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;     // instala al cerrar, sin borrar nada

    autoUpdater.on('checking-for-update', () => sendToRenderer('gpt-update-checking'));
    autoUpdater.on('update-available', (info) => sendToRenderer('gpt-update-available', { version: info?.version }));
    autoUpdater.on('update-not-available', (info) => sendToRenderer('gpt-update-not-available', { version: info?.version }));
    autoUpdater.on('download-progress', (p) => sendToRenderer('gpt-update-download-progress', { percent: Math.round(p?.percent || 0) }));
    autoUpdater.on('error', (err) => sendToRenderer('gpt-update-error', { message: err?.message || 'Error desconocido' }));
    // Cuando la nueva versión está descargada, avisar a la pantalla para que
    // muestre el botón "Instalar actualización" (se instala ENCIMA de la
    // actual, sin desinstalar y sin perder ninguno de tus datos).
    autoUpdater.on('update-downloaded', (info) => {
      sendToRenderer('gpt-update-downloaded', { version: info?.version });
    });

    autoUpdater.checkForUpdates().catch(() => {});
    // Re-comprobar cada 6 horas por si sale una versión nueva con la app abierta.
    setInterval(() => { try { autoUpdater.checkForUpdates().catch(() => {}); } catch { /* ignore */ } }, 6 * 60 * 60 * 1000);
  } catch {
    /* electron-updater no disponible: se ignora */
  }
}

// La pantalla pide comprobar/instalar actualizaciones a través del puente de
// preload.cjs; aquí se atienden esas peticiones usando electron-updater.
ipcMain.on('gpt-check-for-updates', () => {
  if (!autoUpdaterRef) { sendToRenderer('gpt-update-error', { message: 'Auto-actualización no disponible en esta build (modo desarrollo).' }); return; }
  autoUpdaterRef.checkForUpdates().catch((err) => sendToRenderer('gpt-update-error', { message: err?.message || 'Error desconocido' }));
});

ipcMain.on('gpt-install-update', () => {
  if (!autoUpdaterRef) return;
  autoUpdaterRef.quitAndInstall(false, true);
});

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
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  mainWindow = win;

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
  initAutoUpdate();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
