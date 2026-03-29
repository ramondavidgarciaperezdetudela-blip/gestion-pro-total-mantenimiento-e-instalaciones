import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Image, X, Wrench, ChevronRight, Loader2, Camera } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SATChat() {
  const [satOrders, setSatOrders] = useState([]);
  const [selectedSAT, setSelectedSAT] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadSATOrders();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!selectedSAT) return;
    const unsubscribe = base44.entities.SATChatMessage.subscribe((event) => {
      if (event.data?.sat_order_id === selectedSAT.id) {
        if (event.type === 'create') {
          setMessages(prev => {
            if (prev.some(m => m.id === event.id)) return prev;
            return [...prev, event.data];
          });
        }
      }
    });
    return unsubscribe;
  }, [selectedSAT]);

  const loadSATOrders = async () => {
    setLoadingOrders(true);
    const orders = await base44.entities.SATOrder.list('-date', 50);
    setSatOrders(orders);
    setLoadingOrders(false);
  };

  const selectSAT = async (sat) => {
    setSelectedSAT(sat);
    setMessages([]);
    setLoadingMessages(true);
    const msgs = await base44.entities.SATChatMessage.filter({ sat_order_id: sat.id }, 'datetime', 100);
    setMessages(msgs);
    setLoadingMessages(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotos(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setPendingPhotos(prev => [...prev, ...urls]);
    setUploadingPhotos(false);
    e.target.value = '';
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && pendingPhotos.length === 0) return;
    if (!selectedSAT || !user) return;
    setSending(true);
    await base44.entities.SATChatMessage.create({
      sat_order_id: selectedSAT.id,
      sat_order_number: selectedSAT.order_number || '',
      author_email: user.email,
      author_name: user.full_name || user.email,
      message: newMessage.trim(),
      photo_urls: pendingPhotos,
      datetime: new Date().toISOString(),
    });
    setNewMessage('');
    setPendingPhotos([]);
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredOrders = satOrders.filter(s =>
    !searchTerm ||
    (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const STATUS_COLORS = {
    pendiente: 'bg-amber-100 text-amber-700',
    en_curso: 'bg-blue-100 text-blue-700',
    completada: 'bg-green-100 text-green-700',
    cancelada: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Panel izquierdo — lista SAT */}
      <div className={`${selectedSAT ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 bg-white rounded-xl border shadow-sm overflow-hidden flex-shrink-0`}>
        <div className="p-4 border-b bg-gradient-to-r from-[#1e3a5f] to-[#2d5f8a] text-white">
          <h2 className="font-bold text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat SAT Interno
          </h2>
          <p className="text-blue-200 text-xs mt-0.5">Comunicación entre técnicos y oficina</p>
        </div>
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Buscar orden SAT..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin órdenes SAT</p>
          ) : filteredOrders.map(sat => (
            <button
              key={sat.id}
              onClick={() => selectSAT(sat)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50 transition-colors flex items-start gap-3 ${selectedSAT?.id === sat.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-orange-100">
                <Wrench className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-800 truncate">{sat.contact_name}</span>
                  {sat.order_number && <span className="text-[10px] text-gray-400">#{sat.order_number}</span>}
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">{sat.description || sat.type}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[sat.status]}`}>{sat.status}</Badge>
                  <span className="text-[9px] text-gray-400">{sat.date}</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho — conversación */}
      {selectedSAT ? (
        <div className="flex-1 flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden min-w-0">
          {/* Header conversación */}
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-3">
            <button onClick={() => setSelectedSAT(null)} className="md:hidden p-1 text-gray-500 hover:text-gray-800">
              <X className="w-4 h-4" />
            </button>
            <div className="p-1.5 rounded-lg bg-orange-100">
              <Wrench className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-800 truncate">
                {selectedSAT.contact_name}
                {selectedSAT.order_number && <span className="text-gray-400 font-normal ml-1.5">#{selectedSAT.order_number}</span>}
              </p>
              <p className="text-xs text-gray-500 truncate">{selectedSAT.description || selectedSAT.type} · {selectedSAT.date}</p>
            </div>
            <Badge className={`text-xs ${STATUS_COLORS[selectedSAT.status]}`}>{selectedSAT.status}</Badge>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin mensajes aún</p>
                <p className="text-xs mt-1">Inicia la conversación sobre esta orden SAT</p>
              </div>
            ) : messages.map((msg, idx) => {
              const isMe = msg.author_email === user?.email;
              return (
                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {!isMe && (
                      <span className="text-[10px] text-gray-500 px-1">{msg.author_name || msg.author_email}</span>
                    )}
                    <div className={`rounded-2xl px-3 py-2 shadow-sm ${isMe ? 'bg-[#1e3a5f] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                      {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>}
                      {msg.photo_urls?.length > 0 && (
                        <div className={`grid gap-1.5 mt-2 ${msg.photo_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {msg.photo_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="foto" className="rounded-lg w-full max-h-48 object-cover hover:opacity-90 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] text-gray-400 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      {msg.datetime ? format(parseISO(msg.datetime), 'dd/MM HH:mm', { locale: es }) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input mensaje */}
          <div className="border-t bg-white p-3 space-y-2">
            {/* Preview fotos pendientes */}
            {pendingPhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {pendingPhotos.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border" />
                    <button
                      onClick={() => setPendingPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhotos}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                title="Adjuntar foto"
              >
                {uploadingPhotos ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje... (Enter para enviar)"
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                style={{ minHeight: 40, maxHeight: 120 }}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || (!newMessage.trim() && pendingPhotos.length === 0)}
                size="icon"
                className="bg-[#1e3a5f] hover:bg-[#2d5f8a] flex-shrink-0 rounded-xl"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-xl border shadow-sm">
          <div className="text-center text-gray-400">
            <MessageSquare className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">Selecciona una orden SAT</p>
            <p className="text-sm mt-1">para ver o iniciar la conversación</p>
          </div>
        </div>
      )}
    </div>
  );
}