// Proceso principal de Electron para Gestión Pro Total (escritorio).
// Carga la aplicación web ya compilada (carpeta dist) en una ventana nativa.
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// Auto-actualización (opcional). Comprueba si hay una versión nueva publicada
// en las Releases de GitHub y la instala. Solo se ejecuta en la app empaquetada
// y nunca interrumpe si no hay conexión o el canal no está disponible.
// NOTA: si el repositorio de releases es privado, el equipo del cliente no
// puede descargar la actualización sin credenciales; en ese caso publica las
// releases en un repositorio público o un servidor propio (provider en
// electron-builder.yml). Mientras tanto, esto simplemente no hace nada.
function initAutoUpdate() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;     // instala al cerrar, sin borrar nada
    autoUpdater.on('error', () => {});           // silencioso: nunca molesta al usuario
    // Cuando la nueva versión está descargada, ofrecer instalar YA (sin perder datos).
    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox({
        type: 'info',
        buttons: ['Reiniciar e instalar ahora', 'Más tarde'],
        defaultId: 0,
        title: 'Actualización disponible',
        message: `Hay una versión nueva (${info?.version || ''}) lista para instalar.`,
        detail: 'Se instalará ENCIMA de la actual, sin desinstalar y sin perder ninguno de tus datos. ¿Reiniciar e instalar ahora?',
      }).then((res) => {
        if (res.response === 0) autoUpdater.quitAndInstall(false, true);
      }).catch(() => {});
    });
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    // Re-comprobar cada 6 horas por si sale una versión nueva con la app abierta.
    setInterval(() => { try { autoUpdater.checkForUpdates().catch(() => {}); } catch { /* ignore */ } }, 6 * 60 * 60 * 1000);
  } catch {
    /* electron-updater no disponible: se ignora */
  }
}

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
  initAutoUpdate();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
