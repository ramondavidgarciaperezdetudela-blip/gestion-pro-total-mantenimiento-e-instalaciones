import { useEffect, useState } from 'react';
import VisorImagenes from '@/components/VisorImagenes';

// Cualquier imagen que salga dentro de un documento (hoja, informe, nota, firma…) se puede ampliar con un clic.
// - En las pantallas del programa: las imágenes dentro de un contenedor con `data-documento`.
// - En la vista previa de documentos (que se pinta en un marco aparte): el propio marco avisa con el evento «gpt-ampliar».
// Se monta una sola vez en el Layout. No toca nada de lo que se imprime o se guarda: solo reacciona al clic en pantalla.
const MIN = 24; // los iconitos y puntos de relleno no se amplían

export const imagenesDe = (raiz) => [...raiz.querySelectorAll('img')]
  .filter((i) => i.src && ((i.naturalWidth || i.width || 0) >= MIN || !i.complete))
  .map((i) => ({ url: i.currentSrc || i.src, etiqueta: i.alt || '' }));

export default function AmpliarImagenes() {
  const [visor, setVisor] = useState(null);
  useEffect(() => {
    const clic = (ev) => {
      const img = ev.target?.closest?.('img');
      if (!img) return;
      const doc = img.closest('[data-documento]');
      if (!doc || img.closest('[data-no-ampliar], [contenteditable="true"], button, a[href]')) return;
      const fotos = imagenesDe(doc);
      if (!fotos.length) return;
      const inicio = Math.max(0, fotos.findIndex((f) => f.url === (img.currentSrc || img.src)));
      ev.preventDefault(); ev.stopPropagation();
      setVisor({ fotos, inicio });
    };
    const aviso = (ev) => { if (ev.detail?.fotos?.length) setVisor({ fotos: ev.detail.fotos, inicio: ev.detail.inicio || 0 }); };
    document.addEventListener('click', clic, true);
    window.addEventListener('gpt-ampliar', aviso);
    return () => { document.removeEventListener('click', clic, true); window.removeEventListener('gpt-ampliar', aviso); };
  }, []);
  // Cursor de lupa en las imágenes ampliables
  useEffect(() => {
    const st = document.createElement('style');
    st.textContent = '[data-documento] img:not([data-no-ampliar]){cursor:zoom-in}@media print{[data-documento] img{cursor:auto}}';
    document.head.appendChild(st);
    return () => st.remove();
  }, []);
  if (!visor) return null;
  return <VisorImagenes fotos={visor.fotos} inicio={visor.inicio} titulo="Imagen del documento" onCerrar={() => setVisor(null)} />;
}

/** Para marcos aparte (iframe): activa el clic en sus imágenes y avisa a la pantalla principal. Devuelve la función que lo desactiva. */
export function activarEnMarco(marco) {
  const d = marco?.contentDocument; if (!d || !d.body) return () => {};
  const st = d.createElement('style');
  st.setAttribute('data-gpt-ampliar', '1');
  st.textContent = 'img{cursor:zoom-in}@media print{img{cursor:auto}}';
  d.head.appendChild(st);
  const clic = (ev) => {
    const img = ev.target?.closest?.('img'); if (!img) return;
    const fotos = imagenesDe(d); if (!fotos.length) return;
    const inicio = Math.max(0, fotos.findIndex((f) => f.url === (img.currentSrc || img.src)));
    ev.preventDefault();
    window.dispatchEvent(new CustomEvent('gpt-ampliar', { detail: { fotos, inicio } }));
  };
  d.addEventListener('click', clic, true);
  return () => { d.removeEventListener('click', clic, true); st.remove(); };
}
