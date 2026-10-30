import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, MessageCircle, Check, Send } from 'lucide-react';

export default function ChangeOpinionAlerts() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await base44.entities.ChangeOpinionRequest.filter({ status: 'pendiente' }, '-created_date');
      setRequests(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      setLoading(false);
    }
  };

  const handleMarkAsAttended = async (id) => {
    try {
      await base44.entities.ChangeOpinionRequest.update(id, { status: 'atendido' });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error actualizando solicitud:', error);
    }
  };

  // Reenvía al cliente el enlace para volver a aceptar o rechazar su
  // presupuesto (y avisa al administrador). Es la función del programa que se
  // encarga de generar el enlace con token y de mandarlo; antes existía pero
  // ningún botón la llamaba.
  const [enviandoId, setEnviandoId] = useState(null);
  const handleSendLink = async (request) => {
    setEnviandoId(request.id);
    try {
      const res = await base44.functions.invoke('notifyChangeOpinionRequest', { doc_id: request.doc_id });
      const data = res?.data || {};
      if (data.ok) {
        alert(`Enlace enviado a ${request.contact_name}.`);
        await handleMarkAsAttended(request.id);
      } else {
        alert(data.aviso || data.error || 'No se pudo enviar el enlace.');
      }
    } catch (e) {
      alert('No se pudo enviar el enlace: ' + (e?.message || e));
    } finally {
      setEnviandoId(null);
    }
  };

  const handleContactClient = (contact_phone, contact_name, doc_number) => {
    if (!contact_phone) {
      alert('No hay teléfono disponible para este cliente');
      return;
    }
    const phone = contact_phone.replace(/\D/g, '');
    const phoneLink = phone.startsWith('34') ? phone : `34${phone}`;
    const message = encodeURIComponent(
      `Hola ${contact_name},\n\nVi que solicitaste cambiar tu decisión sobre el presupuesto Nº${doc_number}.\n\n¿Cuál es tu nueva decisión?\n\nQuedamos a tu disposición.`
    );
    window.open(`https://wa.me/${phoneLink}?text=${message}`, '_blank');
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-lg font-bold text-amber-700">
        <AlertCircle className="w-6 h-6" />
        Cambios de opinión solicitados ({requests.length})
      </div>
      <div className="space-y-2">
        {requests.map((request) => (
          <Card key={request.id} className="p-4 border-l-4 border-l-amber-400 bg-amber-50">
            <div className="space-y-3">
              <div>
                <p className="font-bold text-slate-800">{request.contact_name}</p>
                <p className="text-sm text-gray-600">
                  {request.doc_type.charAt(0).toUpperCase() + request.doc_type.slice(1)} Nº<strong>{request.doc_number}</strong> • {(request.total || 0).toFixed(2)} €
                </p>
                {request.request_datetime && (
                  <p className="text-xs text-gray-500 mt-1">📅 {request.request_datetime}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => handleContactClient(request.contact_phone, request.contact_name, request.doc_number)}
                >
                  <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  disabled={enviandoId === request.id}
                  onClick={() => handleSendLink(request)}
                >
                  <Send className="w-3 h-3 mr-1" /> {enviandoId === request.id ? 'Enviando…' : 'Enviar enlace'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-xs text-gray-500"
                  onClick={() => handleMarkAsAttended(request.id)}
                >
                  <Check className="w-3 h-3 mr-1" /> Atendido
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}