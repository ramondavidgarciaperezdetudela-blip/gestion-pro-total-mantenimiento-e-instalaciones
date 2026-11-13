import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PenLine, Upload, Loader2 } from 'lucide-react';
import FirmaPantallaCompleta from '@/components/FirmaPantallaCompleta';
import { registrarFirma } from '@/lib/notasInformativas';

/**
 * Recoger la firma de una nota aquí, sin esperar al enlace: el cliente firma en
 * la pantalla (tableta o móvil del técnico) o se sube el papel firmado.
 */
export default function FirmaNotaDialog({ envio, onCerrar, onFirmada }) {
  const [firmando, setFirmando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const fichero = useRef(null);
  if (!envio) return null;

  const guardar = async (datos) => {
    try {
      const hecha = await registrarFirma(base44, envio, datos);
      onFirmada?.(hecha);
      onCerrar();
    } catch (e) { setError(e?.message || 'No se pudo guardar la firma.'); throw e; }
  };

  const subirPapel = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setSubiendo(true); setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await guardar({ signed_file_url: file_url, via: 'papel' });
    } catch (e) { setError(e?.message || 'No se pudo subir el documento.'); }
    finally { setSubiendo(false); ev.target.value = ''; }
  };

  return (
    <>
      <Dialog open={!firmando} onOpenChange={(o) => { if (!o) onCerrar(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Firma de {envio.contact_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">«{envio.nota_title}»</p>
          <div className="space-y-2">
            <Button className="w-full gap-2" onClick={() => setFirmando(true)} data-testid="firmar-pantalla"><PenLine className="h-4 w-4" />Que firme ahora en esta pantalla</Button>
            <Button variant="outline" className="w-full gap-2" disabled={subiendo} onClick={() => fichero.current?.click()} data-testid="subir-papel">
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Subir el papel firmado (foto o PDF)
            </Button>
            <input ref={fichero} type="file" accept="image/*,application/pdf" className="hidden" onChange={subirPapel} />
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
      <FirmaPantallaCompleta abierto={firmando} titulo={`Firma de ${envio.contact_name}`} subtitulo="Declaro haber leído la nota informativa"
        onCancelar={() => setFirmando(false)}
        onConfirmar={async (dataUrl) => { await guardar({ signature: dataUrl, via: 'pantalla' }); setFirmando(false); }} />
    </>
  );
}
