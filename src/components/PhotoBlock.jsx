import React, { useRef, useState } from 'react';

export default function PhotoBlock({ label, photos = [], onChange, max = 30 }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const resize = (file) => new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1280;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    reader.readAsDataURL(file);
  });

  const handleFiles = async (files) => {
    setUploading(true);
    const arr = Array.from(files).slice(0, max - photos.length);
    const nuevas = [];
    for (let i = 0; i < arr.length; i++) {
      setProgress(`Subiendo foto ${i + 1} de ${arr.length}`);
      try {
        const dataUrl = await resize(arr[i]);
        nuevas.push(dataUrl);
      } catch (e) { /* ignore single failure */ }
    }
    onChange([...(photos || []), ...nuevas].slice(0, max));
    setUploading(false);
    setProgress('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const quitar = (i) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{(photos || []).length}/{max}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {(photos || []).map((p, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border" style={{ borderColor: 'hsl(var(--border))' }}>
            <img src={p} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => quitar(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>×</button>
          </div>
        ))}
        {(photos || []).length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-xs gap-1"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
            {uploading ? <><span className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }} /><span className="text-[10px] text-center px-1">{progress}</span></> : '+ Añadir'}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files?.length && handleFiles(e.target.files)} />
    </div>
  );
}