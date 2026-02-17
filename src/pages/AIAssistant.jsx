import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, Loader2, Trash2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

const TYPES = ['general', 'precios', 'normativa', 'tecnico'];

export default function AIAssistant() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [history, setHistory] = useState([]);
  const chatRef = useRef(null);

  useEffect(() => {
    base44.entities.AIConsultation.list('-created_date', 50).then(setHistory);
  }, []);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);

    let prompt = query;
    if (type === 'precios') prompt = `Busca precios actualizados de: ${query}. Busca en distribuidores como Salvador Escoda, Hidro Elèctric, etc.`;
    if (type === 'normativa') prompt = `Consulta sobre normativa española: ${query}. Incluye referencias al BOE y reglamentos aplicables.`;
    if (type === 'tecnico') prompt = `Consulta técnica sobre instalaciones (clima, refrigeración, electricidad, solar): ${query}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: type === 'precios' || type === 'normativa',
    });

    setResponse(res);
    await base44.entities.AIConsultation.create({ query, response: res, type, date: format(new Date(), 'yyyy-MM-dd') });
    const h = await base44.entities.AIConsultation.list('-created_date', 50);
    setHistory(h);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="w-6 h-6 text-green-500" />Asistente IA</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Consulta general</SelectItem>
              <SelectItem value="precios">Comprobación de precios</SelectItem>
              <SelectItem value="normativa">Normativa</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              placeholder="Escribe tu consulta..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="flex-1"
            />
            <Button onClick={handleSubmit} disabled={loading} className="bg-green-600">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardContent className="p-4">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" />Historial de consultas</h2>
        <div className="space-y-2">
          {history.map(h => (
            <Card key={h.id} className="cursor-pointer hover:shadow-sm" onClick={() => { setQuery(h.query); setResponse(h.response); setType(h.type || 'general'); }}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium truncate">{h.query}</p>
                    <p className="text-xs text-gray-500">{h.date} | {h.type}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); base44.entities.AIConsultation.delete(h.id).then(() => setHistory(history.filter(x => x.id !== h.id))); }} className="text-red-400 p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}