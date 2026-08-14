import React, { useRef, useState } from 'react';
import { Upload, X, Loader, Camera, RotateCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadPhotosSequential } from '@/lib/uploadPhotosSequential';

/**
 * PhotoInput — subida SECUENCIAL de fotos (una o varias).
 *
 * - Subida en SERIE (for...of + await), nunca en paralelo.
 * - Si UploadFile falla (créditos agotados), usa Data URL comprimido como
 *   fallback para que la foto quede guardada igualmente.
 * - Incremental: llama `onPhotoUrl` tras CADA foto.
 * - Error por foto: continúa con las siguientes; botón "Reintentar" las
 *   fallidas.
 * - Límite maxFiles y botones Cámara/Archivo.
 *
 * Props:
 *   onPhotoUrl(url|string[]) — string si !multiple, string[] si multiple
 *   label, multiple, maxFiles
 */
export default function PhotoInput({ onPhotoUrl, label = 'Foto', multiple = false, maxFiles = 10 }) {
  const fileInputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ actual: 0, total: 0 });
  const [failedFiles, setFailedFiles] = useState([]);
  const [error, setError] = useState('');

  const emitChange = (updated) => {
    if (multiple) {
      onPhotoUrl(updated.map(p => p.url));
    } else if (updated[0]) {
      onPhotoUrl(updated[0].url);
    } else {
      onPhotoUrl(null);
    }
  };

  const runUpload = async (files) => {
    const remaining = multiple ? maxFiles - photos.length : (photos.length > 0 ? 0 : 1);
    const toUpload = files.slice(0, remaining);
    if (!toUpload.length) return;

    setUploading(true);
    setError('');
    setFailedFiles([]);
    setProgress({ actual: 0, total: toUpload.length });

    const acc = [...photos];

    const { failed } = await uploadPhotosSequential(toUpload, {
      onPhoto: async (url) => {
        const newPhoto = { url, id: Date.now() + Math.random() };
        acc.push(newPhoto);
        const updated = multiple ? acc : (acc[0] ? [acc[acc.length - 1]] : []);
        // En modo simple, nos quedamos solo con la última
        const finalList = multiple ? acc : (updated.length ? [updated[updated.length - 1]] : []);
        setPhotos(finalList);
        emitChange(finalList);
      },
      onProgress: (actual, total) => setProgress({ actual, total }),
    });

    setUploading(false);
    setProgress({ actual: 0, total: 0 });
    if (failed.length) {
      setFailedFiles(failed);
      setError(`${failed.length} foto(s) no se pudieron subir.`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRetry = () => {
    if (failedFiles.length) runUpload(failedFiles);
  };

  const removePhoto = (id) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    emitChange(updated);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2">
        <label className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={e => { const f = Array.from(e.target.files || []); if (f.length) runUpload(f); }}
            disabled={uploading || (!multiple && photos.length > 0)}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 cursor-pointer"
            disabled={uploading || (!multiple && photos.length > 0)}
            asChild
          >
            <span>
              <Upload className="w-4 h-4" />
              {uploading ? `Subiendo ${progress.actual}/${progress.total}…` : `Seleccionar ${multiple ? 'fotos' : 'foto'}`}
            </span>
          </Button>
        </label>

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          disabled={uploading || (!multiple && photos.length > 0)}
        >
          <Camera className="w-4 h-4" />
          Cámara
        </Button>
      </div>

      {uploading && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          Subiendo foto {progress.actual} de {progress.total}…
        </div>
      )}

      {error && !uploading && (
        <div className="flex items-center justify-between gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1 text-red-700 bg-white border border-red-300 rounded px-2 py-0.5 hover:bg-red-100 flex-shrink-0 font-medium"
          >
            <RotateCw className="w-3 h-3" />Reintentar
          </button>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.url}
                alt="Captura"
                className="w-full aspect-square rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!multiple && photos.length > 0 && (
        <Button
          type="button"
          onClick={() => { setPhotos([]); onPhotoUrl(null); }}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Cambiar foto
        </Button>
      )}
    </div>
  );
}