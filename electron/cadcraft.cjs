// CADCraft (editor CAD libre, MIT/Apache) instalado junto con Gestión Pro Total.
// Se abre con el plano en DXF; al cerrarlo se devuelve el DXF si se ha guardado.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const REPO = 'ramondavidgarciaperezdetudela-blip/gestion-pro-total-mantenimiento-e-instalaciones';
const URL_BASE = `https://github.com/${REPO}/releases/download/cadcraft-latest`;

function carpetaCadcraft() {
  // Empaquetado: resources/cadcraft. En desarrollo: ./cadcraft-bin (si se ha compilado).
  const base = app.isPackaged ? path.join(process.resourcesPath, 'cadcraft') : path.join(__dirname, '..', 'cadcraft-bin');
  return base;
}

const nombreExe = () => (process.platform === 'win32' ? 'cadcraft.exe' : 'cadcraft');
// Versión descargada por la actualización automática (tiene prioridad sobre la incluida en el instalador).
const carpetaActualizada = () => path.join(app.getPath('userData'), 'cadcraft-app');
const datosCadcraft = () => path.join(app.getPath('userData'), 'cadcraft');

function ejecutable() {
  const actualizada = path.join(carpetaActualizada(), nombreExe());
  if (fs.existsSync(actualizada)) return actualizada;
  const ruta = path.join(carpetaCadcraft(), nombreExe());
  return fs.existsSync(ruta) ? ruta : null;
}

function disponible() { return !!ejecutable(); }

/** Copia las rutinas LISP (paredes y equipos) a la carpeta de soporte de CADCraft. */
function hash(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

/**
 * Copia nuestras rutinas LISP sin pisar nunca lo que haya cambiado el usuario:
 * si el archivo instalado ya no coincide con lo que instalamos la última vez, se deja el suyo
 * y la versión nueva se guarda al lado como «.nuevo».
 */
function instalarSoporte(configDir) {
  const destino = path.join(configDir, 'support');
  fs.mkdirSync(destino, { recursive: true });
  const registroRuta = path.join(configDir, 'support-instalado.json');
  let registro = {};
  try { registro = JSON.parse(fs.readFileSync(registroRuta, 'utf8')); } catch (_) { /* primera vez */ }
  const origenes = [path.join(carpetaActualizada(), 'support'), path.join(carpetaCadcraft(), 'support')].filter((o) => fs.existsSync(o));
  if (!origenes.length) return;
  const origen = origenes[0];
  for (const f of fs.readdirSync(origen)) {
    if (!/\.lsp$/i.test(f)) continue;
    const nuevo = fs.readFileSync(path.join(origen, f));
    const dest = path.join(destino, f);
    if (fs.existsSync(dest)) {
      const actual = hash(fs.readFileSync(dest));
      if (actual === hash(nuevo)) continue;
      if (registro[f] && actual !== registro[f]) { fs.writeFileSync(dest + '.nuevo', nuevo); continue; } // el usuario lo ha cambiado
    }
    fs.writeFileSync(dest, nuevo);
    registro[f] = hash(nuevo);
  }
  fs.writeFileSync(registroRuta, JSON.stringify(registro));
}

/** Abre CADCraft solo (para cualquier otro tipo de plano), sin ligarlo al plano frigorífico. */
function abrirLibre({ fichero } = {}) {
  try {
    const exe = ejecutable();
    if (!exe) return { ok: false, error: 'CADCraft no está instalado con esta versión del programa.' };
    const configDir = datosCadcraft();
    instalarSoporte(configDir);
    const args = fichero ? [fichero] : [];
    const hijo = spawn(exe, args, { env: { ...process.env, CADCRAFT_CONFIG_DIR: configDir }, stdio: 'ignore', detached: true });
    hijo.on('error', () => {});
    hijo.unref();
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

function marcaVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(carpetaActualizada(), 'version.json'), 'utf8')); } catch (_) { return null; }
}

/** Mira si hay una versión nueva de CADCraft publicada. */
async function comprobarActualizacion() {
  try {
    const r = await fetch(`${URL_BASE}/version.json`, { redirect: 'follow' });
    if (!r.ok) return { ok: true, hayNueva: false, sinPublicar: true };
    const remota = await r.json();
    const local = marcaVersion();
    return { ok: true, hayNueva: !local || local.upstream !== remota.upstream, remota, local };
  } catch (e) { return { ok: false, error: `No se pudo comprobar: ${e.message}` }; }
}

function ejecutar(cmd, args) {
  return new Promise((res, rej) => execFile(cmd, args, { windowsHide: true }, (e) => (e ? rej(e) : res())));
}

/** Descarga la última versión y la deja lista. Tus dibujos, ajustes y comandos propios no se tocan. */
async function actualizar() {
  try {
    const c = await comprobarActualizacion();
    if (!c.ok) return c;
    if (!c.hayNueva) return { ok: true, actualizado: false };
    const win = process.platform === 'win32';
    const archivo = win ? 'cadcraft-windows.zip' : 'cadcraft-linux.tar.gz';
    const r = await fetch(`${URL_BASE}/${archivo}`, { redirect: 'follow' });
    if (!r.ok) return { ok: false, error: `No se pudo descargar CADCraft (${r.status}).` };
    const tmp = path.join(app.getPath('temp'), `cadcraft-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    const zip = path.join(tmp, archivo);
    fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    const nueva = path.join(tmp, 'nueva');
    fs.mkdirSync(nueva);
    if (win) await ejecutar('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${nueva}'`]);
    else await ejecutar('tar', ['-xzf', zip, '-C', nueva]);
    if (!fs.existsSync(path.join(nueva, nombreExe()))) return { ok: false, error: 'El paquete descargado no contiene CADCraft.' };
    if (!win) fs.chmodSync(path.join(nueva, nombreExe()), 0o755);
    fs.writeFileSync(path.join(nueva, 'version.json'), JSON.stringify(c.remota));
    const destino = carpetaActualizada();
    const vieja = destino + '.anterior';
    fs.rmSync(vieja, { recursive: true, force: true });
    if (fs.existsSync(destino)) fs.renameSync(destino, vieja);
    fs.cpSync(nueva, destino, { recursive: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    return { ok: true, actualizado: true, version: c.remota };
  } catch (e) { return { ok: false, error: e.message }; }
}

/**
 * @returns {Promise<{ok:boolean, error?:string, cambiado?:boolean, dxf?:string}>}
 */
function abrir({ nombre, dxf }) {
  return new Promise((resolve) => {
    try {
      const exe = ejecutable();
      if (!exe) { resolve({ ok: false, error: 'CADCraft no está instalado con esta versión del programa.' }); return; }
      const configDir = datosCadcraft();
      instalarSoporte(configDir);
      const trabajo = path.join(configDir, 'trabajo');
      fs.mkdirSync(trabajo, { recursive: true });
      const fichero = path.join(trabajo, String(nombre || 'plano').replace(/[^\w.-]+/g, '_').replace(/\.dxf$/i, '') + '.dxf');
      fs.writeFileSync(fichero, dxf, 'utf8');
      const antes = fs.statSync(fichero).mtimeMs;
      const hijo = spawn(exe, [fichero], { env: { ...process.env, CADCRAFT_CONFIG_DIR: configDir }, stdio: 'ignore' });
      hijo.on('error', (e) => resolve({ ok: false, error: `No se pudo abrir CADCraft: ${e.message}` }));
      hijo.on('exit', () => {
        try {
          const despues = fs.statSync(fichero).mtimeMs;
          resolve({ ok: true, cambiado: despues !== antes, dxf: despues !== antes ? fs.readFileSync(fichero, 'utf8') : undefined });
        } catch (e) { resolve({ ok: false, error: e.message }); }
      });
    } catch (e) { resolve({ ok: false, error: e.message }); }
  });
}

module.exports = { disponible, abrir, abrirLibre, comprobarActualizacion, actualizar };
