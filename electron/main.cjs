// Proceso principal de Electron para Gestión Pro Total (escritorio).
// Carga la aplicación web ya compilada (carpeta dist) en una ventana nativa.
const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const cadcraft = require('./cadcraft.cjs');

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

// ── Copias de seguridad en el disco ────────────────────────────────────────
//
// En el navegador la copia se "descarga" con un enlace y el sistema decide
// dónde la deja. En el ordenador eso no vale: el fichero acaba perdido entre
// las descargas y, cuando hace falta de verdad, no se encuentra. Aquí se
// escribe en una carpeta fija y conocida, y se devuelve la ruta exacta para
// poder enseñarla y abrirla.
//
// Dónde: junto al programa, en "Copias de seguridad". Si esa carpeta no se
// puede escribir (instalación para todos los usuarios en Archivos de
// programa, disco protegido, portable en un USB de solo lectura), se pasa a
// Documentos, que siempre se puede. Nunca se falla en silencio: la ruta que
// se devuelve es la de verdad.

/** Carpeta del programa: donde está el ejecutable, no los recursos internos. */
function carpetaDelPrograma() {
  try {
    // En producción, el .exe/.AppImage; en desarrollo, la raíz del proyecto.
    return app.isPackaged ? path.dirname(app.getPath('exe')) : path.join(__dirname, '..');
  } catch {
    return process.cwd();
  }
}

/** ¿Se puede escribir de verdad aquí? Se comprueba escribiendo, no adivinando. */
function sePuedeEscribir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const testigo = path.join(dir, `.escritura-${Date.now()}`);
    fs.writeFileSync(testigo, 'x');
    fs.unlinkSync(testigo);
    return true;
  } catch {
    return false;
  }
}

/**
 * La carpeta de copias que toque, ya creada y comprobada.
 *
 * Manda la que haya elegido el usuario. Si no ha elegido ninguna (o la que
 * eligió ya no vale: disco desconectado, carpeta borrada, USB fuera), se usa
 * la de junto al programa, y si esa tampoco admite escritura, Documentos.
 * Nunca se deja de guardar por no poder usar la carpeta preferida.
 */
function carpetaDeCopias(elegida) {
  if (elegida) {
    if (sePuedeEscribir(elegida)) return { ruta: elegida, alternativa: false, propia: true };
    // La eligió el usuario y ya no sirve: hay que decirlo, no cambiar a
    // escondidas y que se pase medio año haciendo copias en otro sitio.
    const respaldoPropio = path.join(carpetaDelPrograma(), 'Copias de seguridad');
    if (sePuedeEscribir(respaldoPropio)) {
      return { ruta: respaldoPropio, alternativa: true, perdida: elegida };
    }
  }

  const preferida = path.join(carpetaDelPrograma(), 'Copias de seguridad');
  if (sePuedeEscribir(preferida)) return { ruta: preferida, alternativa: false };

  const respaldo = path.join(app.getPath('documents'), 'Gestión Pro Total', 'Copias de seguridad');
  if (sePuedeEscribir(respaldo)) return { ruta: respaldo, alternativa: true };

  // Último recurso: los datos del usuario, que siempre son escribibles.
  const ultimo = path.join(app.getPath('userData'), 'Copias de seguridad');
  fs.mkdirSync(ultimo, { recursive: true });
  return { ruta: ultimo, alternativa: true };
}

// ── Puente para hablar con la IA libre (Ollama y OpenRouter) ────────────────
//
// La app instalada se abre como fichero local (file://). Desde ahí el
// navegador bloquea por seguridad las llamadas a Ollama, que escucha en
// localhost: es una petición "de otro origen" y Ollama la rechaza salvo que
// el usuario se ponga a configurar variables de entorno a mano. Yendo por el
// proceso principal de Electron no hay navegador de por medio, así que
// funciona tal cual, sin que haya que tocar nada.
//
// Solo se dejan pasar las direcciones de la IA: ni es un proxy abierto ni
// puede usarse para llegar a cualquier sitio desde la pantalla.
const DESTINOS_IA_PERMITIDOS = [
  /^https?:\/\/localhost(:\d+)?\//,
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//,
  /^https?:\/\/\[::1\](:\d+)?\//,
  // Ollama en otro equipo de la red de casa o del taller.
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?\//,
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\//,
  /^https:\/\/openrouter\.ai\//,
];

// ── La IA del ordenador, también para el móvil y la tablet ─────────────────
//
// Ollama solo escucha en el propio ordenador (127.0.0.1), así que desde el
// móvil no se llega. Y aunque escuchara, la app de Android se sirve por https
// y el sistema bloquea llamar a un http de la red local.
//
// Se resuelve aquí: el programa de escritorio levanta un puente pequeño que
// SÍ escucha en la red de casa o del taller y reenvía a Ollama. El móvil
// entra por ahí (con petición nativa, que no pasa por esas limitaciones) y
// usa la misma IA gratuita del ordenador, sin gastar créditos.
//
// Con llave: sin la contraseña que genera el propio programa no se atiende a
// nadie. Y solo se reenvía a Ollama, a nada más.
const os = require('os');
const http = require('http');
const crypto = require('crypto');

let puenteLan = null;

/** La dirección del ordenador dentro de la red local (no la de internet). */
function ipDeLaRedLocal() {
  const preferidas = [];
  for (const [nombre, direcciones] of Object.entries(os.networkInterfaces() || {})) {
    for (const d of direcciones || []) {
      if (d.family !== 'IPv4' || d.internal) continue;
      // Solo redes privadas: nunca se anuncia una dirección pública.
      if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(d.address)) continue;
      // El wifi y el cable van primero; las redes virtuales al final.
      const virtual = /vmnet|virtualbox|vbox|docker|veth|tailscale|zt/i.test(nombre);
      preferidas.push({ ip: d.address, virtual });
    }
  }
  preferidas.sort((a, b) => Number(a.virtual) - Number(b.virtual));
  return preferidas[0]?.ip || null;
}

/** La contraseña del puente, la misma entre reinicios. */
function llaveDelPuente() {
  const fichero = path.join(app.getPath('userData'), 'llave-ia-lan.txt');
  try {
    if (fs.existsSync(fichero)) {
      const guardada = fs.readFileSync(fichero, 'utf8').trim();
      if (guardada.length >= 32) return guardada;
    }
  } catch { /* se genera una nueva */ }
  const nueva = crypto.randomBytes(24).toString('hex');
  try { fs.writeFileSync(fichero, nueva, { mode: 0o600 }); } catch { /* en memoria */ }
  return nueva;
}

function arrancarPuenteLan(destinoOllama) {
  // La dirección se vuelve a mirar SIEMPRE, no se guarda: si se cambia de
  // wifi o se enchufa el cable, la de antes ya no vale y el móvil buscaría
  // donde no hay nadie.
  if (puenteLan) return { ...puenteLan.datos, ip: ipDeLaRedLocal() };
  const llave = llaveDelPuente();
  const base = String(destinoOllama || 'http://127.0.0.1:11434').replace(/\/$/, '');

  const servidor = http.createServer(async (req, res) => {
    const responder = (codigo, cuerpo) => {
      res.writeHead(codigo, { 'content-type': 'application/json' });
      res.end(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo));
    };
    if (req.headers['x-gpt-llave'] !== llave) return responder(401, { error: 'Llave incorrecta.' });
    if (!/^\/api\//.test(req.url || '')) return responder(404, { error: 'Solo se atiende a la IA.' });
    try {
      let cuerpo = '';
      for await (const trozo of req) cuerpo += trozo;
      const r = await fetch(base + req.url, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body: req.method === 'GET' ? undefined : (cuerpo || undefined),
        signal: AbortSignal.timeout(15 * 60 * 1000),
      });
      const texto = await r.text();
      res.writeHead(r.status, { 'content-type': 'application/json' });
      res.end(texto);
    } catch (err) {
      responder(502, { error: String(err?.message || err) });
    }
  });

  servidor.listen(11435, '0.0.0.0');
  const datos = { ip: ipDeLaRedLocal(), puerto: 11435, llave };
  puenteLan = { servidor, datos };
  return datos;
}

ipcMain.handle('gpt-ia-lan-encender', async (_evt, destino) => {
  try {
    // El puente se levanta aunque ahora mismo no haya wifi: así, en cuanto se
    // conecte, ya está funcionando. Antes se devolvía un error y no se
    // arrancaba nada, y había que acordarse de volver a darle.
    const datos = arrancarPuenteLan(destino);
    if (!datos.ip) {
      return {
        ok: false,
        puerto: datos.puerto,
        llave: datos.llave,
        error: 'El puente está listo, pero este ordenador no está en ninguna red local ahora mismo. Conéctalo al wifi de casa o del taller y el móvil lo encontrará solo.',
      };
    }
    return { ok: true, ...datos };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('gpt-ia-lan-apagar', async () => {
  try { puenteLan?.servidor?.close(); } catch { /* ya cerrado */ }
  puenteLan = null;
  return { ok: true };
});

ipcMain.handle('gpt-ia-lan-estado', async () => ({
  encendido: !!puenteLan,
  ...(puenteLan ? puenteLan.datos : {}),
}));

app.on('before-quit', () => { try { puenteLan?.servidor?.close(); } catch { /* nada */ } });

// ── Descargar documentación técnica de los fabricantes ─────────────────────
//
// Va por el proceso principal porque desde la pantalla el navegador bloquea
// las descargas de otros sitios (CORS) y ningún fabricante permite que su PDF
// se baje desde una aplicación ajena.
//
// Es un puente DISTINTO del de la IA, y a propósito: el de la IA solo puede
// hablar con el ordenador de casa y con OpenRouter, y ampliarlo para esto
// habría abierto esa puerta de par en par. Aquí las reglas son otras:
//
//   - Solo https. Nada de http, ni de ficheros locales.
//   - NUNCA direcciones de la red interna. Sin esto, una dirección como
//     http://192.168.1.1/ convertiría el programa en una forma de curiosear
//     el router de casa desde fuera.
//   - Tope de tamaño: un PDF de fabricante no pasa de unas decenas de megas,
//     y sin tope una descarga tonta podría llenar la memoria.
const MAXIMO_DOCUMENTO = 60 * 1024 * 1024;

function direccionDeDocumentoValida(url) {
  let u;
  try { u = new URL(String(url || '')); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) return false;
  // Direcciones de la red interna, en cualquiera de sus formas.
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host === '::1' || host === '[::1]') return false;
  return true;
}

ipcMain.handle('gpt-doc-descargar', async (_evt, url) => {
  try {
    if (!direccionDeDocumentoValida(url)) {
      return { ok: false, error: 'Esa dirección no vale. Tiene que empezar por https:// y ser de internet, no de tu red.' };
    }
    const resp = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120000) });
    if (!resp.ok) return { ok: false, status: resp.status, error: `El fabricante ha respondido ${resp.status}.` };

    const tipo = (resp.headers.get('content-type') || '').toLowerCase();
    const largo = Number(resp.headers.get('content-length') || 0);
    if (largo && largo > MAXIMO_DOCUMENTO) {
      return { ok: false, error: 'El documento pesa demasiado (más de 60 MB).' };
    }
    const datos = Buffer.from(await resp.arrayBuffer());
    if (datos.length > MAXIMO_DOCUMENTO) {
      return { ok: false, error: 'El documento pesa demasiado (más de 60 MB).' };
    }
    // Que sea un PDF de verdad y no la página de "no encontrado" del
    // fabricante: se mira la firma del propio fichero, no lo que diga la
    // cabecera. Guardar un HTML de error como si fuera el manual sería peor
    // que no guardar nada, porque se descubre el día que hace falta.
    const esPdf = datos.slice(0, 5).toString('latin1') === '%PDF-';
    if (!esPdf && !/pdf/.test(tipo)) {
      return { ok: false, error: 'Eso no es un PDF. Puede que el enlace lleve a una página, no al documento.' };
    }
    if (!esPdf) {
      return { ok: false, error: 'El fichero dice ser un PDF pero no lo es. No se guarda.' };
    }
    return {
      ok: true,
      tipo: 'application/pdf',
      bytes: datos.length,
      base64: datos.toString('base64'),
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('gpt-ia-abrir', async (_evt, url) => {
  // Solo la página oficial de descarga: esto no abre cualquier cosa.
  if (String(url || '') !== 'https://ollama.com/download') return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('gpt-ia-fetch', async (_evt, { url, method, headers, body, tiempoMaximo }) => {
  try {
    const destino = String(url || '');
    if (!DESTINOS_IA_PERMITIDOS.some((re) => re.test(destino))) {
      return { ok: false, status: null, error: 'Esa dirección no está permitida para la IA.' };
    }
    // Descargar un modelo son varios GB: sin darle tiempo de sobra, se cortaría
    // a media descarga y parecería que ha fallado.
    const corte = AbortSignal.timeout(Number(tiempoMaximo) > 0 ? Number(tiempoMaximo) : 120000);
    const resp = await fetch(destino, {
      method: method || 'GET',
      headers: headers || {},
      body: body || undefined,
      signal: corte,
    });
    const cuerpo = await resp.text();
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: cuerpo.slice(0, 500) };
    }
    return { ok: true, status: resp.status, cuerpo };
  } catch (err) {
    return { ok: false, status: null, error: String(err?.message || err) };
  }
});

// ── Impresoras del ordenador ───────────────────────────────────────────────
//
// En el navegador no se puede saber qué impresoras hay: el diálogo lo enseña
// el propio navegador y ya está. En el programa instalado sí se puede, y hace
// falta: quien trabaja con una impresora de etiquetas y otra de papel quiere
// elegir de una vez cuál usa para los documentos, y no tener que acordarse en
// cada impresión.

ipcMain.handle('gpt-impresoras', async () => {
  try {
    const win = mainWindow || BrowserWindow.getAllWindows()[0];
    if (!win) return { ok: false, error: 'No hay ventana' };
    const lista = await win.webContents.getPrintersAsync();
    return {
      ok: true,
      impresoras: (lista || []).map((i) => ({
        nombre: i.name,
        descripcion: i.displayName || i.description || '',
        pordefecto: !!i.isDefault,
        estado: i.status,
      })),
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

/**
 * Imprime un HTML en la impresora elegida.
 *
 * Se pinta en una ventana oculta y se imprime desde ahí: así el documento sale
 * tal cual, sin la interfaz del programa alrededor. Si no se dice impresora, o
 * si se pide expresamente, sale el diálogo del sistema para elegirla.
 */
ipcMain.handle('gpt-imprimir', async (_evt, { html, impresora, silencioso, margenes, tamanoPapel }) => {
  let oculta = null;
  try {
    oculta = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, javascript: false },
    });
    await oculta.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(String(html || '')));
    // Un respiro para que carguen las imágenes (logo, firmas, fotos).
    await new Promise((r) => setTimeout(r, 400));

    const opciones = {
      silent: !!silencioso && !!impresora,
      printBackground: true,
      deviceName: impresora || undefined,
      margins: margenes ? { marginType: 'custom', ...margenes } : { marginType: 'default' },
    };
    if (tamanoPapel) opciones.pageSize = tamanoPapel;

    const resultado = await new Promise((resolve) => {
      oculta.webContents.print(opciones, (exito, motivo) => resolve({ exito, motivo }));
    });
    return { ok: !!resultado.exito, motivo: resultado.motivo || '' };
  } catch (err) {
    return { ok: false, motivo: String(err && err.message ? err.message : err) };
  } finally {
    if (oculta) { try { oculta.destroy(); } catch { /* ya cerrada */ } }
  }
});

ipcMain.handle('gpt-cadcraft-disponible', async () => cadcraft.disponible());
ipcMain.handle('gpt-cadcraft-abrir', async (_evt, datos) => cadcraft.abrir(datos || {}));

ipcMain.handle('gpt-guardar-copia', async (_evt, { nombre, contenido, carpeta }) => {
  try {
    const { ruta, alternativa, perdida } = carpetaDeCopias(carpeta);
    const fichero = path.join(ruta, String(nombre || 'copia.json').replace(/[/\\]/g, '_'));
    fs.writeFileSync(fichero, contenido, 'utf8');
    const { size } = fs.statSync(fichero);
    return { ok: true, ruta: fichero, carpeta: ruta, bytes: size, alternativa, perdida };
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo escribir el fichero' };
  }
});

/**
 * Abre el selector de carpetas del sistema para elegir dónde van las copias.
 * Se comprueba que se pueda escribir ANTES de darla por buena: no vale
 * descubrirlo el día que haga falta la copia.
 */
ipcMain.handle('gpt-elegir-carpeta-copias', async () => {
  try {
    const ventana = BrowserWindow.getAllWindows()[0];
    const r = await dialog.showOpenDialog(ventana, {
      title: 'Elige dónde guardar las copias de seguridad',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Guardar aquí las copias',
    });
    if (r.canceled || !r.filePaths?.length) return { ok: false, cancelado: true };
    const elegida = r.filePaths[0];
    if (!sePuedeEscribir(elegida)) {
      return { ok: false, error: 'En esa carpeta no se puede escribir. Elige otra o cámbiale los permisos.' };
    }
    return { ok: true, carpeta: elegida };
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo abrir el selector de carpetas' };
  }
});

/**
 * Copia escrita POR PARTES.
 *
 * Con muchos clientes, fotos y documentos, la copia entera no cabe de una
 * pieza en memoria: se monta el fichero sección a sección. Aquí se guarda el
 * descriptor abierto entre llamada y llamada.
 */
let copiaEnCurso = null;

ipcMain.handle('gpt-copia-abrir', async (_evt, { nombre, carpeta }) => {
  try {
    if (copiaEnCurso) { try { fs.closeSync(copiaEnCurso.fd); } catch { /* ya cerrado */ } }
    const { ruta, alternativa, perdida } = carpetaDeCopias(carpeta);
    const fichero = path.join(ruta, String(nombre || 'copia.json').replace(/[/\\]/g, '_'));
    copiaEnCurso = { fd: fs.openSync(fichero, 'w'), fichero, carpeta: ruta, alternativa, perdida };
    return { ok: true, ruta: fichero, carpeta: ruta, alternativa, perdida };
  } catch (err) {
    copiaEnCurso = null;
    return { ok: false, error: err?.message || 'No se pudo crear el fichero' };
  }
});

ipcMain.handle('gpt-copia-anadir', async (_evt, trozo) => {
  try {
    if (!copiaEnCurso) return { ok: false, error: 'No hay ninguna copia abierta' };
    fs.writeSync(copiaEnCurso.fd, trozo, null, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo escribir en el fichero' };
  }
});

ipcMain.handle('gpt-copia-cerrar', async () => {
  try {
    if (!copiaEnCurso) return { ok: false, error: 'No hay ninguna copia abierta' };
    const { fd, fichero, carpeta, alternativa, perdida } = copiaEnCurso;
    fs.closeSync(fd);
    copiaEnCurso = null;
    const { size } = fs.statSync(fichero);
    return { ok: true, ruta: fichero, carpeta, bytes: size, alternativa, perdida };
  } catch (err) {
    copiaEnCurso = null;
    return { ok: false, error: err?.message || 'No se pudo cerrar el fichero' };
  }
});

/** Dónde van a ir las copias, para poder enseñarlo antes de hacer ninguna. */
ipcMain.handle('gpt-carpeta-copias', async (_evt, elegida) => {
  try {
    const { ruta, alternativa, propia, perdida } = carpetaDeCopias(elegida);
    let copias = [];
    try {
      copias = fs.readdirSync(ruta)
        .filter(n => n.toLowerCase().endsWith('.json'))
        .map(n => {
          const st = fs.statSync(path.join(ruta, n));
          return { nombre: n, bytes: st.size, fecha: st.mtime.toISOString() };
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
    } catch { /* carpeta recién creada */ }
    return { ok: true, carpeta: ruta, alternativa, propia, perdida, copias };
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo leer la carpeta' };
  }
});

/** Abre la carpeta de copias en el explorador de archivos del sistema. */
ipcMain.handle('gpt-abrir-carpeta-copias', async (_evt, elegida) => {
  try {
    const { ruta } = carpetaDeCopias(elegida);
    await shell.openPath(ruta);
    return { ok: true, carpeta: ruta };
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo abrir la carpeta' };
  }
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
