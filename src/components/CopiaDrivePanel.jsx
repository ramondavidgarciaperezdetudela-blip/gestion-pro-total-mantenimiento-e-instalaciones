import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, CheckCircle, AlertCircle, Copy, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import scriptDrive from '../../drive-copias/script-google-drive.gs?raw';
import {
  leerDrive, guardarDrive, normalizarEnlace, driveListo, probarDrive,
  listarCopiasDrive, descargarCopiaDrive,
} from '@/lib/copiaDrive';

const fmtMB = (b) => `${(b / 1048576).toFixed(b > 1048576 ? 1 : 2)} MB`;

/**
 * Configuración de la copia en Google Drive y, en la pestaña de restaurar,
 * lista de copias del Drive para recuperarlas desde cualquier equipo.
 *
 * @param {'copia'|'restaurar'} modo
 * @param {(nombre:string, texto:string)=>void} [onElegida] solo al restaurar
 */
export default function CopiaDrivePanel({ modo = 'copia', onElegida }) {
  const [cfg, setCfg] = useState(leerDrive);
  const [abierto, setAbierto] = useState(!driveListo(leerDrive()));
  const [guia, setGuia] = useState(false);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [copias, setCopias] = useState(null);
  const [pct, setPct] = useState(0);

  const cambiar = (parche) => setCfg((c) => ({ ...c, ...parche }));

  const guardar = async () => {
    const enlace = normalizarEnlace(cfg.enlace);
    if (!enlace) { setMsg('err:El enlace debe empezar por https://script.google.com/ y terminar en /exec.'); return; }
    if (!cfg.clave.trim()) { setMsg('err:Falta la clave.'); return; }
    setOcupado(true); setMsg('');
    try {
      const r = await probarDrive({ enlace, clave: cfg.clave.trim() });
      const nuevo = { ...cfg, enlace, clave: cfg.clave.trim() };
      guardarDrive(nuevo); setCfg(nuevo);
      setMsg(`ok:Conectado. Las copias se guardan en la carpeta «${r.carpeta}» de ese Drive.`);
    } catch (e) {
      setMsg(`err:${e.message}`);
    } finally { setOcupado(false); }
  };

  const desconectar = () => {
    const v = { enlace: '', clave: '', auto: false };
    guardarDrive(v); setCfg({ ...v, correo: '' }); setCopias(null); setMsg('');
  };

  const cambiarAuto = (auto) => { const n = { ...cfg, auto }; setCfg(n); guardarDrive(n); };

  const ver = async () => {
    setOcupado(true); setMsg('');
    try { setCopias(await listarCopiasDrive(cfg)); } catch (e) { setMsg(`err:${e.message}`); }
    setOcupado(false);
  };

  const usar = async (nombre) => {
    setOcupado(true); setPct(0); setMsg('');
    try {
      const texto = await descargarCopiaDrive(cfg, nombre, setPct);
      onElegida?.(nombre, texto);
    } catch (e) { setMsg(`err:${e.message}`); }
    setOcupado(false);
  };


  return (
    <Card className="border-2 border-blue-200">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"><Cloud className="w-5 h-5 text-white" /></div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Copia en Google Drive</h3>
            <p className="text-sm text-gray-600">
              {modo === 'copia'
                ? 'Además de guardarla en el aparato, la copia se sube al Drive del correo de TU empresa. Cada empresa pone su propio enlace.'
                : 'Recupera una copia guardada en el Drive de la empresa, desde cualquier equipo: basta con poner el mismo enlace y la misma clave.'}
            </p>
          </div>
          {driveListo(cfg) && (
            <button className="text-sm text-blue-700 underline" onClick={() => setAbierto(!abierto)}>
              {abierto ? 'Ocultar' : 'Ajustes'}
            </button>
          )}
        </div>

        {driveListo(cfg) && !abierto && (
          <p className="text-sm text-green-700 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Conectado a Google Drive</p>
        )}

        {abierto && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Enlace de tu Google Drive (termina en /exec)</label>
            <input data-prueba="drive-enlace" value={cfg.enlace} onChange={(e) => cambiar({ enlace: e.target.value })}
              placeholder="https://script.google.com/macros/s/…/exec" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <label className="block text-sm font-medium text-gray-700">Clave</label>
            <input data-prueba="drive-clave" type="password" value={cfg.clave} onChange={(e) => cambiar({ clave: e.target.value })}
              placeholder="La misma clave que pusiste en el script" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2 flex-wrap">
              <Button data-prueba="drive-guardar" onClick={guardar} disabled={ocupado}>{ocupado ? 'Comprobando…' : 'Probar y guardar'}</Button>
              {driveListo(cfg) && <Button variant="outline" onClick={desconectar}>Quitar enlace</Button>}
              <Button variant="outline" onClick={() => setGuia(!guia)}>
                {guia ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />} Cómo conseguir el enlace
              </Button>
            </div>
          </div>
        )}

        {guia && (
          <div className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3 space-y-2">
            <p className="font-semibold">Se hace una sola vez, con la cuenta de Google de la empresa:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Entra en <b>script.google.com</b> con el correo de la empresa y pulsa «Nuevo proyecto».</li>
              <li>Borra lo que haya, pega el código de abajo y <b>cambia CAMBIA-ESTA-CLAVE</b> por una clave larga inventada por ti.</li>
              <li>Pulsa <b>Implementar → Nueva implementación → Aplicación web</b>. «Ejecutar como»: <b>Yo</b>. «Quién tiene acceso»: <b>Cualquier usuario</b>. Autoriza los permisos que pide Google.</li>
              <li>Copia la dirección que termina en <b>/exec</b>, pégala arriba junto con la clave y pulsa «Probar y guardar».</li>
            </ol>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(scriptDrive); toast.success('Código copiado'); }}>
              <Copy className="w-4 h-4 mr-1" /> Copiar el código
            </Button>
            <p className="text-xs text-gray-600">Quien conozca el enlace Y la clave puede ver las copias: no los compartas. Mientras no se llene el Drive, no tiene coste.</p>
          </div>
        )}

        {modo === 'copia' && driveListo(cfg) && (
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input data-prueba="drive-auto" type="checkbox" checked={cfg.auto} onChange={(e) => cambiarAuto(e.target.checked)} />
            Subir a Google Drive cada copia que haga
          </label>
        )}

        {modo === 'restaurar' && driveListo(cfg) && (
          <div className="space-y-2">
            <Button data-prueba="drive-ver" variant="outline" onClick={ver} disabled={ocupado}>
              <RefreshCw className="w-4 h-4 mr-1" /> Ver copias del Drive
            </Button>
            {ocupado && pct > 0 && <p className="text-xs text-gray-600">Descargando… {pct}%</p>}
            {copias && copias.length === 0 && <p className="text-sm text-gray-600">No hay copias en ese Drive todavía.</p>}
            {copias && copias.length > 0 && (
              <ul className="divide-y border rounded-lg">
                {copias.map((c) => (
                  <li key={c.nombre} className="flex items-center justify-between gap-2 p-2 text-sm">
                    <span className="min-w-0 truncate">{c.nombre}<span className="text-gray-500"> · {fmtMB(c.bytes)} · {new Date(c.fecha).toLocaleString('es-ES')}</span></span>
                    <Button size="sm" disabled={ocupado} onClick={() => usar(c.nombre)}>Usar esta copia</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {msg && (
          <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${msg.startsWith('ok:') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {msg.startsWith('ok:') ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg.replace(/^(ok:|err:)/, '')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
