import React, { useRef, useState } from 'react';
import { Camera, X, Plus, FolderOpen, Loader2 } from "lucide-react";
import { base44 } from '@/api/base44Client';

export default function PhotoGallery({ photos = [], onChange, label = "Fotos", maxPhotos = 30 }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = maxPhotos - photos.length;
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    setUploadProgress({ done: 0, total: toUpload.length });

    // Subir todas en paralelo
    const results = await Promise.all(
      toUpload.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setUploadProgress(prev => ({ ...prev, done: prev.done + 1 }));
        return file_url;
      })
    );

    onChange([...photos, ...results]);
    setUploading(false);
    setUploadProgress({ done: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemove = (index) => {
    onChange(photos.filter((_, i) => i !== index));
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
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button 
              onClick={() => handleRemove(i)} 
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
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
      {/* Input archivo normal */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      {/* Input cámara */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}