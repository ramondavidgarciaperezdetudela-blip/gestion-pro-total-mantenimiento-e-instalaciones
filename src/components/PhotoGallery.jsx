import React, { useRef, useState } from 'react';
import { Camera, X, Plus, FolderOpen, Loader2, Pencil, Check, AlertCircle, RotateCw } from "lucide-react";
import { uploadPhotosSequential } from '@/lib/uploadPhotosSequential';

/**
 * PhotoGallery — galería con subida SECUENCIAL de fotos y edición de nombre.
 *
 * - Subida en SERIE (for...of + await), nunca en paralelo.
 * - Si UploadFile falla (créditos agotados), usa Data URL comprimido como
 *   fallback para que la foto quede guardada igualmente.
 * - Incremental: llama `onChange` tras CADA foto, añadiendo la miniatura en
 *   cuanto está lista y avanzando el contador X/30 en vivo.
 * - Error por foto: continúa con las siguientes; al final, si hubo fallos
 *   muestra "N foto(s) no se pudieron subir" y un botón "Reintentar".
 * - Límite maxPhotos (30 por sección) y diseño de botones Cámara/Archivo.
 *
 * Props:
 *   photos: string[]              — array de URLs/DataURLs
 *   onChange(urls): void          — se llama tras cada foto (incremental)
 *   photoNames: string[]          — (opcional) nombres por foto
 *   onNamesChange(names): void    — (opcional)
 *   label, maxPhotos
 */
export default function PhotoGallery({
  photos = [],
  onChange,
  photoNames = [],
  onNamesChange,
  label = "Fotos",
  maxPhotos = 30,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ actual: 0, total: 0 });
  const [failedFiles, setFailedFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [localNames, setLocalNames] = useState(photoNames);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const names = onNamesChange ? photoNames : localNames;

  const setNames = (newNames) => {
    if (onNamesChange) {
      onNamesChange(newNames);
    } else {
      setLocalNames(newNames);
    }
  };

  const runUpload = async (files) => {
    if (!files.length) return;
    const remaining = maxPhotos - photos.length;
    const toUpload = files.slice(0, remaining);
    if (!toUpload.length) return;

    setUploading(true);
    setUploadError('');
    setFailedFiles([]);
    setProgress({ actual: 0, total: toUpload.length });

    const acc = [...photos];
    const accNames = [...names];

    const { failed } = await uploadPhotosSequential(toUpload, {
      onPhoto: async (url, file) => {
        acc.push(url);
        accNames.push(file.name.replace(/\.[^.]+$/, ''));
        onChange([...acc]);      // incremental: miniatura visible en cuanto está
        setNames([...accNames]);
      },
      onProgress: (actual, total) => setProgress({ actual, total }),
    });

    setUploading(false);
    setProgress({ actual: 0, total: 0 });
    if (failed.length) {
      setFailedFiles(failed);
      setUploadError(`${failed.length} foto(s) no se pudieron subir.`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) runUpload(files);
  };

  const handleRetry = () => {
    if (failedFiles.length) runUpload(failedFiles);
  };

  const handleRemove = (index) => {
    onChange(photos.filter((_, i) => i !== index));
    setNames(names.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(names[index] || `Foto ${index + 1}`);
  };

  const confirmEdit = (index) => {
    const updated = [...names];
    while (updated.length <= index) updated.push('');
    updated[index] = editingValue.trim() || `Foto ${index + 1}`;
    setNames(updated);
    setEditingIndex(null);
  };

  const canAdd = photos.length < maxPhotos;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label} ({photos.length}/{maxPhotos})</label>
        {canAdd && (
          <div className="flex gap-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-green-600 border border-green-300 rounded px-2 py-1 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-3 h-3" />Cámara
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-blue-600 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-3 h-3" />{uploading ? `Subiendo ${progress.actual}/${progress.total}...` : 'Archivo'}
            </button>
          </div>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Subiendo foto {progress.actual} de {progress.total}…
        </div>
      )}

      {uploadError && !uploading && (
        <div className="flex items-center justify-between gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{uploadError}</span>
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

      <div className="flex flex-wrap gap-3">
        {photos.map((url, i) => (
          <div key={i} className="flex flex-col items-center gap-1" style={{ width: 88 }}>
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-gray-100">
              <img src={url} alt={names[i] || `Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {editingIndex === i ? (
              <div className="flex items-center gap-0.5 w-full">
                <input
                  autoFocus
                  type="text"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmEdit(i);
                    if (e.key === 'Escape') setEditingIndex(null);
                  }}
                  className="flex-1 text-[10px] border border-blue-400 rounded px-1 py-0.5 outline-none min-w-0"
                  style={{ width: 60 }}
                />
                <button
                  type="button"
                  onClick={() => confirmEdit(i)}
                  className="text-green-600 hover:text-green-700 flex-shrink-0"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-blue-600 w-full justify-center group truncate max-w-full"
                title={names[i] || `Foto ${i + 1}`}
              >
                <span className="truncate">{names[i] || `Foto ${i + 1}`}</span>
                <Pencil className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
        ))}

        {uploading && (
          <div className="w-20 h-20 rounded-lg border-2 border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-[10px] text-blue-600 font-medium">{progress.actual}/{progress.total}</span>
          </div>
        )}

        {canAdd && !uploading && photos.length === 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 transition-colors"
          >
            <Plus className="w-6 h-6 text-gray-400" />
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
    </div>
  );
}