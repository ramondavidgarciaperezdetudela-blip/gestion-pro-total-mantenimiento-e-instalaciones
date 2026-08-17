import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ImageIcon, X, ArrowRight } from 'lucide-react';
import { getStorageConfig } from '@/lib/externalStorage';

/**
 * StorageSetupNotice — aviso de primera instalación sobre dónde se guardan
 * las fotos y los documentos.
 *
 * Por qué existe: recién instalado, el programa guarda las fotos DENTRO de
 * cada ficha, reducidas para que quepan. Funciona sin configurar nada, pero
 * la foto pierde calidad y un documento grande no se puede adjuntar. Quien
 * quiera calidad completa necesita una cuenta de almacenamiento (gratuita).
 *
 * Sin este aviso, el usuario no tenía forma de enterarse: veía fotos algo
 * borrosas sin saber por qué ni que se podía evitar.
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
        // Si ya está configurado y activo, no hay nada que avisar.
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

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800">Dónde se guardan tus fotos</p>
              <p className="text-xs text-slate-500">Puedes cambiarlo cuando quieras</p>
            </div>
          </div>
          <button onClick={cerrar} className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-700">
          <p>
            Ahora mismo, las fotos y los documentos se guardan <strong>dentro de cada ficha</strong>.
            Funciona sin configurar nada y se ven en el móvil, el ordenador y la web, pero:
          </p>
          <ul className="list-disc ml-5 space-y-1 text-slate-600">
            <li>Las fotos se reducen de tamaño, así que pierden algo de calidad.</li>
            <li>Un documento grande (un PDF de varias páginas) no se podrá adjuntar.</li>
          </ul>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-green-800">Para guardarlas en calidad completa</p>
            <p className="text-green-900 text-xs">
              Crea una cuenta <strong>gratuita</strong> en un servicio de almacenamiento
              (por ejemplo <strong>cloudinary.com</strong>) y añádela en la configuración.
              Es cosa de cinco minutos y solo se hace una vez: a partir de ahí las fotos
              se suben en calidad completa, sin límite de tamaño, y las fichas quedan ligeras.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link
              to={createPageUrl('CompanyConfig')}
              onClick={cerrar}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Configurarlo ahora <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={cerrar}
              className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl transition-colors"
            >
              Seguir así de momento
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Lo tienes en Configuración → Documentos → Almacén de fotos y documentos
          </p>
        </div>
      </div>
    </div>
  );
}
