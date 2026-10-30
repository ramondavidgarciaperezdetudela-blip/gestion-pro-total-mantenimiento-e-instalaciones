import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';

/**
 * Dónde se configura la verificación de documentos.
 *
 * El programa ya imprimía un QR en cada presupuesto, factura y recibo, y ese
 * QR abre una página pública donde el cliente —o quien reciba el papel—
 * comprueba que el documento es auténtico y sigue vigente. Lo que faltaba era
 * poder llegar a eso desde algún sitio: la dirección pública no se podía
 * escribir en ninguna pantalla y el ajuste de validez estaba escondido al
 * final de la ventana de ver un documento.
 *
 * Y sin la dirección pública, el QR no vale de nada fuera del propio aparato:
 * se genera con la dirección desde la que se está usando el programa, que en
 * el móvil es "https://localhost" y en el ordenador instalado es un fichero
 * local. El cliente escanea y no le abre nada.
 */
export default function VerificacionDocumentos({ form, setForm, onGuardar }) {
  const [probando, setProbando] = useState(false);

  const direccion = String(form?.public_app_url || '').trim().replace(/\/$/, '');
  const enElNavegador = typeof window !== 'undefined'
    && /^https?:/.test(window.location.origin)
    && !/localhost|127\.0\.0\.1/.test(window.location.origin);

  const abrirPagina = () => {
    const base = direccion || (enElNavegador ? window.location.origin : '');
    if (!base) return;
    setProbando(true);
    window.open(`${base}/verificar-documento`, '_blank', 'noopener');
    setTimeout(() => setProbando(false), 1500);
  };

  return (
    <div className="space-y-3" data-prueba="verificacion-documentos">
      <div>
        <p className="flex items-center gap-2 border-b pb-1 text-sm font-semibold text-slate-700">
          <ShieldCheck className="h-4 w-4" /> Verificación de documentos (el QR del PDF)
        </p>
        <p className="mt-1 text-xs text-slate-500">
          En cada presupuesto, factura y recibo se imprime un QR. Quien lo escanea abre una
          página que dice si el documento es auténtico, de qué fecha es y por cuánto tiempo
          sigue siendo verificable. Es lo que da respaldo a un papel firmado.
        </p>
      </div>

      <label className="block text-xs font-medium text-slate-700">
        Dirección pública del programa
        <Input
          className="mt-1 font-mono text-sm"
          placeholder="https://mi-empresa.base44.app"
          value={form?.public_app_url || ''}
          onChange={(e) => setForm((f) => ({ ...f, public_app_url: e.target.value }))}
          aria-label="Dirección pública del programa"
          data-prueba="direccion-publica"
        />
        <span className="mt-1 block font-normal text-slate-500">
          Es la dirección con la que entras al programa desde el navegador. Cópiala de la barra
          de direcciones, sin nada detrás.
        </span>
      </label>

      {!direccion && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Sin esto, el QR no le sirve a nadie.</strong> Se genera con la dirección desde
            la que estés usando el programa: en el móvil es <span className="font-mono">https://localhost</span> y
            en el ordenador instalado es un fichero de tu disco. El cliente escanea y no le abre
            nada. Con la dirección puesta, el QR apunta siempre al sitio correcto, lo imprimas
            desde donde lo imprimas.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onGuardar} className="bg-blue-600 hover:bg-blue-700">
          Guardar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={abrirPagina}
          disabled={!direccion && !enElNavegador}
          data-prueba="abrir-verificacion"
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {probando ? 'Abriendo…' : 'Ver la página de verificación'}
        </Button>
      </div>

      {direccion && (
        <p className="break-all text-[11px] text-slate-400">
          El QR llevará a: <span className="font-mono">{direccion}/verificar-documento?id=…</span>
        </p>
      )}

      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
        <p className="font-semibold">Cuánto tiempo vale la verificación</p>
        <p>
          Se elige documento a documento, en la ventana de ver el documento, abajo del todo:
          90 días, 6 meses, 1 año o sin caducidad. Lo que pongas aquí es lo que se usará al
          crear documentos nuevos.
        </p>
        <label className="mt-1 flex flex-wrap items-center gap-2">
          <span>Por defecto en documentos nuevos:</span>
          <select
            className="rounded-lg border p-1.5 text-xs"
            value={String(form?.verify_default_days ?? 365)}
            onChange={(e) => setForm((f) => ({ ...f, verify_default_days: Number(e.target.value) }))}
            aria-label="Validez por defecto de la verificación"
            data-prueba="validez-por-defecto"
          >
            <option value="90">90 días</option>
            <option value="182">6 meses</option>
            <option value="365">1 año</option>
            <option value="0">Sin caducidad</option>
          </select>
        </label>
      </div>

      <p className="text-[11px] text-slate-400">
        La comprobación la hace una función del servidor llamada
        <span className="font-mono"> verificarDocumento</span>. Si al abrir la página sale
        «No se pudo verificar», es que esa función todavía no está publicada en tu panel de
        Base44: publícala desde allí y funcionará.
      </p>
    </div>
  );
}
