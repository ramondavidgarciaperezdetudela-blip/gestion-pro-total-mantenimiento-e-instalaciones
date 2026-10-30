import { useEffect } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { vincularTodo } from '@/lib/vincularAuto';

const CLAVE = 'gpt_vinculado_auto';
const CADA = 6 * 60 * 60 * 1000; // como mucho cada 6 horas

/** Sin pantalla: al abrir el programa une las fichas sueltas con su cliente. */
export default function VinculadorAutomatico() {
  useEffect(() => {
    try { if (Date.now() - Number(localStorage.getItem(CLAVE) || 0) < CADA) return undefined; } catch { /* sigue */ }
    const t = setTimeout(async () => {
      try {
        const n = await vincularTodo(base44);
        localStorage.setItem(CLAVE, String(Date.now()));
        if (n > 0) toast.success(`${n} documento${n === 1 ? '' : 's'} vinculado${n === 1 ? '' : 's'} con su cliente`);
      } catch { /* sin conexión o sin sesión: se reintenta otro día */ }
    }, 6000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
