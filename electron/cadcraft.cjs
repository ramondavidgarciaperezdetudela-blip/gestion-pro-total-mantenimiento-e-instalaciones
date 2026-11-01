// CADCraft (editor CAD libre, MIT/Apache) instalado junto con Gestión Pro Total.
// Se abre con el plano en DXF; al cerrarlo se devuelve el DXF si se ha guardado.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function carpetaCadcraft() {
  // Empaquetado: resources/cadcraft. En desarrollo: ./cadcraft-bin (si se ha compilado).
  const base = app.isPackaged ? path.join(process.resourcesPath, 'cadcraft') : path.join(__dirname, '..', 'cadcraft-bin');
  return base;
}

function ejecutable() {
  const nombre = process.platform === 'win32' ? 'cadcraft.exe' : 'cadcraft';
  const ruta = path.join(carpetaCadcraft(), nombre);
  return fs.existsSync(ruta) ? ruta : null;
}

function disponible() { return !!ejecutable(); }

/** Copia las rutinas LISP (paredes y equipos) a la carpeta de soporte de CADCraft. */
function instalarSoporte(configDir) {
  const origen = path.join(carpetaCadcraft(), 'support');
  const destino = path.join(configDir, 'support');
  fs.mkdirSync(destino, { recursive: true });
  if (!fs.existsSync(origen)) return;
  for (const f of fs.readdirSync(origen)) {
    if (/\.lsp$/i.test(f)) fs.copyFileSync(path.join(origen, f), path.join(destino, f));
  }
}

/**
 * @returns {Promise<{ok:boolean, error?:string, cambiado?:boolean, dxf?:string}>}
 */
function abrir({ nombre, dxf }) {
  return new Promise((resolve) => {
    try {
      const exe = ejecutable();
      if (!exe) { resolve({ ok: false, error: 'CADCraft no está instalado con esta versión del programa.' }); return; }
      const configDir = path.join(app.getPath('userData'), 'cadcraft');
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

module.exports = { disponible, abrir };
