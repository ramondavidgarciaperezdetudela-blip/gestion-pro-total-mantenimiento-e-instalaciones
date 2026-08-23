import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ImageIcon, X } from 'lucide-react';
import { getStorageConfig } from '@/lib/externalStorage';

/**
 * StorageSetupNotice — aviso informativo, una sola vez, sobre cómo guarda el
 * programa las fotos y los documentos.
 *
 * Por qué existe: las fotos se optimizan automáticamente para que quepan
 * dentro de la ficha (y así se guarden y se sincronicen sin depender de
 * ningún servicio externo ni de ningún crédito). El efecto visible es que la
 * foto no conserva la resolución original, y sin explicarlo el usuario lo
 * interpreta como un fallo del programa.
 *
 * No empuja a contratar ni configurar nada: el funcionamiento por defecto es
 * el previsto. Solo menciona que existe la opción de conectar almacenamiento
 * propio para quien necesite calidad completa.
 *
 * Se muestra una sola vez. Si ya hay almacén configurado, no aparece nunca.
 */

const DISMISSED_KEY = 'gpt_storage_notice_dismissed';

export default function StorageSetupNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        if (localStorage.getItem(DISMISSED_KEY) === 'true') return;
        const cfg = await getStorageConfig();
        const yaConfigurado = !!(cfg?.enabled && cfg?.cloud_name && cfg?.upload_preset);
        if (!cancelado && !yaConfigurado) setVisible(true);
      } catch {
        // Si no se puede comprobar, mejor no molestar con el aviso.
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const cerrar = () => {
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch { /* ignorar */ }
    setVisible(false);
  };

  // Este aviso no era un diálogo del sistema, sino una capa hecha a mano, así
  // que no se cerraba ni con Escape ni tocando fuera: solo con el botón. En el
  // móvil eso significa que el botón "atrás" tampoco lo quitaba.
  useEffect(() => {
    if (!visible) return undefined;
    const alPulsar = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={cerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800">Sobre las fotos y documentos</p>
              <p className="text-xs text-slate-500">Solo para que lo sepas: no hay que configurar nada</p>
            </div>
          </div>
          <button onClick={cerrar} className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-700">
          <p>
            Las fotos que añadas a los partes se <strong>optimizan automáticamente</strong> y
            se guardan dentro de la propia ficha. Así se conservan y se ven igual en el
            móvil, en el ordenador y en la web, sin depender de ningún servicio externo.
          </p>

          <div className="bg-slate-50 border rounded-lg p-3 space-y-1 text-xs text-slate-600">
            <p><strong>Qué significa en la práctica:</strong></p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>Las fotos se ven con buena calidad para documentar e imprimir un parte, pero no conservan la resolución original de la cámara.</li>
              <li>Cuantas más fotos lleve un parte, un poco más se ajusta cada una, para que siempre se pueda guardar.</li>
              <li>Un documento muy grande (un PDF de muchas páginas) puede no admitirse; el programa te avisará si ocurre.</li>
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            Si en algún momento necesitas guardar las fotos en su calidad original, puedes
            conectar tu propio almacenamiento en Configuración → Documentos. Es opcional:
            el programa funciona perfectamente sin ello.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={cerrar}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Entendido
            </button>
            <Link
              to={createPageUrl('CompanyConfig')}
              onClick={cerrar}
              className="flex-1 flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl transition-colors"
            >
              Ver opciones
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
