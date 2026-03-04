import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CameraCapture from './CameraCapture';

export default function PhotoInput({ onPhotoUrl, label = 'Foto', multiple = false, maxFiles = 10 }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState('');

  const uploadPhoto = async (blob) => {
    if (photos.length >= maxFiles && !multiple) {
      setError(`Máximo ${maxFiles} foto(s)`);
      return;
    }

    setUploading(true);
    setError('');
    
    try {
      const result = await base44.integrations.Core.UploadFile({ file: blob });
      const newPhoto = { url: result.file_url, id: Date.now() };
      
      const updatedPhotos = multiple ? [...photos, newPhoto] : [newPhoto];
      setPhotos(updatedPhotos);
      
      // Callback con URL(s)
      if (multiple) {
        onPhotoUrl(updatedPhotos.map(p => p.url));
      } else {
        onPhotoUrl(result.file_url);
        setShowCamera(false);
      }
    } catch (err) {
      setError('Error al subir foto');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        uploadPhoto(file);
      }
    });
  };

  const removePhoto = (id) => {
    const updatedPhotos = photos.filter(p => p.id !== id);
    setPhotos(updatedPhotos);
    if (multiple) {
      onPhotoUrl(updatedPhotos.map(p => p.url));
    } else if (updatedPhotos.length === 0) {
      onPhotoUrl(null);
    }
  };

  return (
    <div className="w-full space-y-3">
      {!showCamera ? (
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={handleFileSelect}
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
                Seleccionar {multiple ? 'fotos' : 'foto'}
              </span>
            </Button>
          </label>
          
          <Button
            type="button"
            onClick={() => setShowCamera(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            disabled={uploading || (!multiple && photos.length > 0)}
          >
            📷 Cámara
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <CameraCapture
            onCapture={async (blob) => {
              await uploadPhoto(blob);
              if (!multiple) setShowCamera(false);
            }}
            onCancel={() => setShowCamera(false)}
            label={`Capturar ${label.toLowerCase()}`}
          />
          <Button
            type="button"
            onClick={() => setShowCamera(false)}
            variant="outline"
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar cámara
          </Button>
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {uploading && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          Subiendo foto...
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
          onClick={() => {
            setPhotos([]);
            onPhotoUrl(null);
          }}
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