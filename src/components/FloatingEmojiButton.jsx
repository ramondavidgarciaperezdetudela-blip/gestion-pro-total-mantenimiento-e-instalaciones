import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from './EmojiPicker';
import { Smile } from 'lucide-react';

/**
 * FloatingEmojiButton — botón flotante que abre EmojiPicker
 * Al seleccionar un emoji, lo inserta en el campo de texto activo
 * o llama onSelect si se provee.
 * 
 * USO: Añadir <FloatingEmojiButton/> en cualquier página/formulario
 */
export default function FloatingEmojiButton({ onSelect, position = 'fixed', className = '' }) {
  const [open, setOpen]   = useState(false);
  const btnRef = useRef(null);
  const pickerRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const h = (e) => {
      if (!btnRef.current?.contains(e.target) && !pickerRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (emoji) => {
    if (onSelect) {
      onSelect(emoji);
      setOpen(false);
      return;
    }

    // Insertar en el campo de texto activo del documento
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      const start = active.selectionStart ?? active.value.length;
      const end   = active.selectionEnd   ?? active.value.length;
      const val   = active.value;
      const newVal = val.slice(0, start) + emoji + val.slice(end);

      // Disparar evento nativo para que React lo detecte
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        active.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(active, newVal);
        active.dispatchEvent(new Event('input', { bubbles: true }));
        active.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        active.value = newVal;
        active.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Restaurar posición del cursor
      const newPos = start + emoji.length;
      setTimeout(() => {
        try { active.setSelectionRange(newPos, newPos); active.focus(); } catch {}
      }, 0);
    } else {
      // Sin campo activo: copiar al portapapeles
      navigator.clipboard.writeText(emoji).catch(() => {});
    }
  };

  return (
    <div style={{ position: position === 'fixed' ? 'fixed' : 'relative' }}
      className={position === 'fixed' ? `bottom-4 right-4 z-[200] ${className}` : `inline-block ${className}`}>

      {/* Botón toggle */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        title="Insertar emoji o símbolo"
        className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all
          ${open
            ? 'bg-blue-600 text-white shadow-blue-200 scale-110'
            : 'bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 hover:scale-110'
          }`}>
        <Smile className="w-5 h-5"/>
      </button>

      {/* Picker flotante */}
      {open && (
        <div
          ref={pickerRef}
          style={{
            position: 'absolute',
            bottom: position === 'fixed' ? '48px' : '44px',
            right: 0,
            zIndex: 9999,
          }}>
          <EmojiPicker
            onSelect={(e) => { handleSelect(e); }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
