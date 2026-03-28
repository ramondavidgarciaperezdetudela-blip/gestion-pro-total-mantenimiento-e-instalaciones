import React, { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';

/**
 * PhotosWithNames — muestra un array de fotos ya guardadas con nombre editable.
 * 
 * Props:
 *   photos: string[]           — URLs de las fotos
 *   photoNames: string[]       — nombres actuales (puede ser [])
 *   onNamesChange(names): void — se llama cuando el usuario cambia un nombre
 *   readOnly?: boolean         — si true, solo muestra sin editar
 */
export default function PhotosWithNames({ photos = [], photoNames = [], onNamesChange, readOnly = false }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  if (!photos.length) return null;

  const getName = (i) => photoNames[i] || `Foto ${i + 1}`;

  const startEdit = (i) => {
    setEditingIndex(i);
    setEditingValue(getName(i));
  };

  const confirmEdit = (i) => {
    const updated = [...photoNames];
    while (updated.length <= i) updated.push('');
    updated[i] = editingValue.trim() || `Foto ${i + 1}`;
    onNamesChange?.(updated);
    setEditingIndex(null);
  };

  const cancelEdit = () => setEditingIndex(null);

  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {photos.map((url, i) => (
        <div key={i} className="flex flex-col items-center gap-1" style={{ width: 88 }}>
          <img
            src={url}
            alt={getName(i)}
            className="w-20 h-20 object-cover rounded-lg border"
            title={getName(i)}
          />
          {!readOnly && (
            editingIndex === i ? (
              <div className="flex items-center gap-0.5 w-full">
                <input
                  autoFocus
                  type="text"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmEdit(i);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="flex-1 text-[10px] border border-blue-400 rounded px-1 py-0.5 outline-none min-w-0"
                  style={{ width: 60 }}
                />
                <button type="button" onClick={() => confirmEdit(i)} className="text-green-600 hover:text-green-700 flex-shrink-0">
                  <Check className="w-3 h-3" />
                </button>
                <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-blue-600 w-full justify-center group truncate max-w-full"
                title={getName(i)}
              >
                <span className="truncate">{getName(i)}</span>
                <Pencil className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            )
          )}
          {readOnly && (
            <span className="text-[10px] text-gray-400 truncate w-full text-center">{getName(i)}</span>
          )}
        </div>
      ))}
    </div>
  );
}