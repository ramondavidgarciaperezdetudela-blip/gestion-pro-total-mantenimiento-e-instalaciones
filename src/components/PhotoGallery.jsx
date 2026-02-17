import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, X, Plus } from "lucide-react";
import { base44 } from '@/api/base44Client';

export default function PhotoGallery({ photos = [], onChange, label = "Fotos", maxPhotos = 30 }) {
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    const remaining = maxPhotos - photos.length;
    const toUpload = files.slice(0, remaining);
    
    const newUrls = [];
    for (const file of toUpload) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(file_url);
    }
    onChange([...photos, ...newUrls]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (index) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">{label} ({photos.length}/{maxPhotos})</label>
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
        {photos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 transition-colors"
          >
            <Plus className="w-6 h-6 text-gray-400" />
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}