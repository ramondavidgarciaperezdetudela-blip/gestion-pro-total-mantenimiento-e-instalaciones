import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { printDocument } from '@/lib/printHelper';
import { htmlNotaFirmada, sincronizarDocumentos } from '@/lib/notasInformativas';
import FilaEnvio from '@/components/notas/FilaEnvio';
import FirmaNotaDialog from '@/components/notas/FirmaNotaDialog';

/**
 * Pestaña «Notas informativas» de la ficha del cliente: las que se le han
 * mandado, cuáles ha firmado y cuándo, con la opción de recuperarlas e imprimirlas.
 */
export default function NotasInformativasCliente({ contactId, onCambio }) {
  const [envios, setEnvios] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [firmando, setFirmando] = useState(null);

  const cargar = useCallback(async () => {
    if (!contactId) return;
    try {
      const [lista, cs] = await Promise.all([
        base44.entities.NotaEnvio.filter({ contact_id: contactId }),
        base44.entities.CompanySettings.list(),
      ]);
      setEmpresa(cs?.[0] || null);
      const nuevas = await sincronizarDocumentos(base44, lista);
      const porId = new Map(nuevas.map((n) => [n.id, n]));
      const completa = lista.map((e) => porId.get(e.id) || e)
        .sort((a, b) => String(b.signed_at || b.created_date || '').localeCompare(String(a.signed_at || a.created_date || '')));
      setEnvios(completa);
      if (nuevas.length) onCambio?.();
    } catch (e) { console.warn('[NotasInformativasCliente]', e); }
  }, [contactId, onCambio]);
  useEffect(() => { cargar(); }, [cargar]);

  const imprimir = (e) => printDocument(htmlNotaFirmada({ envio: e, empresa }), `Nota informativa - ${e.contact_name}`);

  return (
    <div className="mt-2 rounded-lg border bg-card" data-testid="notas-cliente">
      {envios.length === 0
        ? <p className="p-4 text-sm text-muted-foreground">A este cliente aún no se le ha preparado ninguna nota informativa. Se mandan desde Clientes → Notas informativas.</p>
        : envios.map((e) => <FilaEnvio key={e.id} envio={e} mostrarNota onFirmar={setFirmando} onImprimir={imprimir} />)}
      <FirmaNotaDialog envio={firmando} onCerrar={() => setFirmando(null)} onFirmada={cargar} />
    </div>
  );
}
