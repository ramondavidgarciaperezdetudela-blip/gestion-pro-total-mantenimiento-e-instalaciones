import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Loader, ChevronDown, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('general');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const categories = [
    { id: 'general', label: 'General', icon: '💬' },
    { id: 'tecnico', label: 'Técnico', icon: '🔧' },
    { id: 'presupuesto', label: 'Presupuesto', icon: '📊' },
    { id: 'normativa', label: 'Normativa', icon: '📋' },
  ];

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un asistente técnico especializado en instalaciones de climatización, refrigeración, energía solar y electricidad.

Categoría: ${category}

Responde de forma concisa y práctica. Si es técnico, da recomendaciones específicas.

Pregunta: ${input}`,
        add_context_from_internet: category === 'normativa',
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response,
        id: Date.now() + 1
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Error al obtener respuesta. Intenta de nuevo.',
        id: Date.now() + 1
      }]);
    }
    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
          title="Asistente IA"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <Card className="fixed bottom-6 right-6 z-50 w-96 max-h-[600px] shadow-2xl border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="font-semibold text-sm">Asistente Técnico IA</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:bg-purple-800 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </CardHeader>

          {/* Categorías */}
          <div className="px-3 py-2 border-b bg-gray-50 flex gap-1 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                  category === cat.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Mensajes */}
          <CardContent className="h-[400px] overflow-y-auto p-3 space-y-2 bg-white">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <Bot className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">¿En qué puedo ayudarte?</p>
              </div>
            )}
            
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-2.5 text-xs ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="flex gap-1 mt-1.5 opacity-60 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(msg.content)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                          title="Copiar"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-2.5 flex items-center gap-1">
                  <Loader className="w-3 h-3 animate-spin text-gray-600" />
                  <span className="text-xs text-gray-600">Escribiendo...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input */}
          <div className="px-3 py-2 border-t bg-gray-50 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta..."
              className="h-8 text-xs"
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 h-8 w-8 p-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}