import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Trash2, ImageIcon, SwitchCamera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uploadPhotosSequential } from '@/lib/uploadPhotosSequential';

/**
 * Foto de una ficha (cliente, equipo, proveedor, técnico, instrumento…).
 * Dos formas de ponerla: «Hacer foto» (cámara del móvil, tableta u ordenador)
 * o «Subir imagen» (archivo). Se puede quitar o cambiar. Si no hay cámara o no
 * hay permiso, «Hacer foto» abre la cámara del sistema (móvil) o avisa.
 *
 * `value` url de la foto; `onChange(url|'')`.
 */
export default function FotoFicha({ value, onChange, etiqueta = 'Foto', icono: Icono = ImageIcon, className = '', tamano = 'h-28 w-28' }) {
  const archivoRef = useRef(null);
  const sistemaRef = useRef(null);
  const videoRef = useRef(null);
  const flujoRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [camara, setCamara] = useState(false);
  const [error, setError] = useState('');
  const [trasera, setTrasera] = useState(true);

  const parar = () => { flujoRef.current?.getTracks().forEach((t) => t.stop()); flujoRef.current = null; };
  useEffect(() => parar, []);

  const subir = async (file) => {
    if (!file) return;
    setSubiendo(true); setError('');
    const { failed } = await uploadPhotosSequential([file], { onPhoto: (url) => onChange(url) });
    setSubiendo(false);
    if (failed.length) setError('No se pudo guardar la imagen. Prueba con otra.');
  };

  const encender = async (traseraAhora) => {
    parar(); setError('');
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: traseraAhora ? 'environment' : 'user', width: { ideal: 1280 } }, audio: false });
      flujoRef.current = flujo;
      if (videoRef.current) { videoRef.current.srcObject = flujo; await videoRef.current.play().catch(() => {}); }
    } catch (e) {
      setCamara(false);
      if (sistemaRef.current && /Android|iPhone|iPad/i.test(navigator.userAgent)) sistemaRef.current.click();
      else setError(e?.name === 'NotAllowedError' ? 'Permiso de cámara denegado: actívalo en el navegador o sube una imagen.' : 'No se encontró cámara: sube una imagen.');
    }
  };
  const abrirCamara = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { if (sistemaRef.current) sistemaRef.current.click(); else setError('Este dispositivo no permite cámara: sube una imagen.'); return; }
    setCamara(true); setTimeout(() => encender(trasera), 50);
  };
  const cerrar = () => { parar(); setCamara(false); };
  const disparar = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((b) => { cerrar(); if (b) subir(new File([b], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })); }, 'image/jpeg', 0.9);
  };
  const cambiarCamara = () => { const t = !trasera; setTrasera(t); encender(t); };

  return (
    <div className={`flex items-start gap-3 ${className}`} data-testid="foto-ficha">
      <div className={`${tamano} flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground`}>
        {value ? <img src={value} alt={etiqueta} className="h-full w-full object-cover" data-testid="foto-ficha-imagen" /> : <span className="flex flex-col items-center gap-1 text-[11px]"><Icono className="h-6 w-6" />{subiendo ? 'Subiendo…' : 'Sin foto'}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</span>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={abrirCamara} disabled={subiendo} data-testid="foto-hacer"><Camera className="mr-1 h-3.5 w-3.5" />Hacer foto</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => archivoRef.current?.click()} disabled={subiendo} data-testid="foto-subir"><Upload className="mr-1 h-3.5 w-3.5" />Subir imagen</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')} data-testid="foto-quitar"><Trash2 className="mr-1 h-3.5 w-3.5" />Quitar</Button>}
        </div>
        {error && <span className="max-w-xs text-[11px] text-destructive" role="alert">{error}</span>}
      </div>
      <input ref={archivoRef} type="file" accept="image/*" className="hidden" data-testid="foto-archivo" onChange={(e) => { subir(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={sistemaRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { subir(e.target.files?.[0]); e.target.value = ''; }} />
      <Dialog open={camara} onOpenChange={(o) => { if (!o) cerrar(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Hacer foto</DialogTitle></DialogHeader>
          <video ref={videoRef} playsInline muted className="aspect-video w-full rounded-md bg-black object-cover" />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cambiarCamara}><SwitchCamera className="mr-1 h-4 w-4" />Cambiar cámara</Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cerrar}><X className="mr-1 h-4 w-4" />Cancelar</Button>
              <Button type="button" size="sm" onClick={disparar} data-testid="foto-disparar"><Camera className="mr-1 h-4 w-4" />Capturar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
