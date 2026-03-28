import React, { useRef, useState } from 'react';
import { Camera, X, Plus, FolderOpen, Loader2, Pencil, Check } from "lucide-react";
import { base44 } from '@/api/base44Client';

/**
 * PhotoGallery — galería con subida y edición de nombre por foto.
 * Props:
 *   photos: string[]              — array de URLs
 *   onChange(urls): void          — cuando cambian las fotos
 *   photoNames: string[]          — (opcional) nombres para cada foto
 *   onNamesChange(names): void    — (opcional) cuando cambian los nombres
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
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  // nombres locales: si el padre no pasa onNamesChange, los mantenemos aquí
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

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = maxPhotos - photos.length;
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    setUploadProgress({ done: 0, total: toUpload.length });

    const results = await Promise.all(
      toUpload.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setUploadProgress(prev => ({ ...prev, done: prev.done + 1 }));
        return { url: file_url, name: file.name.replace(/\.[^.]+$/, '') };
      })
    );

    const newUrls = results.map(r => r.url);
    const newNames = results.map(r => r.name);

    onChange([...photos, ...newUrls]);
    setNames([...names, ...newNames]);
    setUploading(false);
    setUploadProgress({ done: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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
              <FolderOpen className="w-3 h-3" />{uploading ? `Subiendo ${uploadProgress.done}/${uploadProgress.total}...` : 'Archivo'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {photos.map((url, i) => (
          <div key={i} className="flex flex-col items-center gap-1" style={{ width: 88 }}>
            {/* Miniatura */}
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

            {/* Nombre editable */}
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
            <span className="text-[10px] text-blue-600 font-medium">{uploadProgress.done}/{uploadProgress.total}</span>
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