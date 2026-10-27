import React, { useState } from 'react';
import SignaturePad from '@/components/SignaturePad';

export default function DualSignaturePanel({
  firmaTecnico, setFirmaTecnico,
  firmaCliente, setFirmaCliente,
  fechaTecnico, fechaCliente,
  setFechaTecnico, setFechaCliente,
}) {
  const [activo, setActivo] = useState(null);

  const ahora = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Firma del técnico */}
      <div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Firma del técnico</span>
          {fechaTecnico && <span className="text-xs tabular" style={{ color: 'hsl(var(--muted-foreground))' }}>{fechaTecnico}</span>}
        </div>
        {activo === 'tec' ? (
          <SignaturePad
            value={firmaTecnico}
            label="Firma del técnico"
            onSave={(dataUrl, dt) => { setFirmaTecnico(dataUrl); setFechaTecnico(dt || ahora()); setActivo(null); }}
            onCancel={() => setActivo(null)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {firmaTecnico ? (
              <img src={firmaTecnico} alt="Firma técnico" className="max-h-24 w-full object-contain rounded border" style={{ borderColor: 'hsl(var(--border))' }} />
            ) : (
              <div className="h-24 w-full rounded border flex items-center justify-center text-xs" style={{ borderColor: 'hsl(var(--border)', color: 'hsl(var(--muted-foreground))' }}>Sin firma</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setActivo('tec')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>{firmaTecnico ? 'Refirmar' : 'Firmar'}</button>
              {firmaTecnico && <button type="button" onClick={() => { setFirmaTecnico(''); setFechaTecnico(''); }} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>Borrar</button>}
            </div>
          </div>
        )}
      </div>

      {/* Firma del cliente */}
      <div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Firma del cliente</span>
          {fechaCliente && <span className="text-xs tabular" style={{ color: 'hsl(var(--muted-foreground))' }}>{fechaCliente}</span>}
        </div>
        {activo === 'cli' ? (
          <SignaturePad
            value={firmaCliente}
            label="Firma del cliente"
            onSave={(dataUrl, dt) => { setFirmaCliente(dataUrl); setFechaCliente(dt || ahora()); setActivo(null); }}
            onCancel={() => setActivo(null)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {firmaCliente ? (
              <img src={firmaCliente} alt="Firma cliente" className="max-h-24 w-full object-contain rounded border" style={{ borderColor: 'hsl(var(--border))' }} />
            ) : (
              <div className="h-24 w-full rounded border flex items-center justify-center text-xs" style={{ borderColor: 'hsl(var(--border)', color: 'hsl(var(--muted-foreground))' }}>Sin firma</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setActivo('cli')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>{firmaCliente ? 'Refirmar' : 'Firmar'}</button>
              {firmaCliente && <button type="button" onClick={() => { setFirmaCliente(''); setFechaCliente(''); }} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>Borrar</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}