import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, History, Trash2, Search, Zap } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = {
  precios: [
    '¿Cuánto cuesta un split de 1x1 de 3.500 frig? Dame precios orientativos.',
    '¿Precio orientativo de una instalación de aerotermia para casa de 150m²?',
    '¿Cuánto cuesta el metro lineal de tubería de cobre 1/4 y 3/8?',
    '¿Precio del gas refrigerante R-32 por kilo en España 2025?',
  ],
  tecnico: [
    '¿Qué presiones tiene el R-32 a 0°C de evaporación?',
    '¿Cómo calcular la carga de gas refrigerante según longitud de tubería?',
    '¿Qué normativa aplica a una instalación de cámara frigorífica industrial?',
    '¿Diferencias entre R-410A y R-32 en refrigeración?',
    '¿Cómo interpretar las lecturas de presión en un split de aire acondicionado?',
  ],
  normativa: [
    '¿Qué dice el RITE sobre eficiencia en instalaciones de climatización?',
    '¿Cada cuánto hay que revisar las fugas de gas en instalaciones frigoríficas?',
    '¿Qué certificación necesita un técnico para manipular gases fluorados?',
    '¿Normativa REBT para instalaciones en locales comerciales?',
  ],
  general: [
    '¿Cómo dimensionar correctamente un sistema VRF para un edificio de oficinas?',
    '¿Qué es el coeficiente COP y EER en climatización?',
    '¿Cómo calcular el número de paneles solares necesarios para una casa?',
  ]
};

export default function AIAssistant() {
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryType, setQueryType] = useState('general');
  const [consultHistory, setConsultHistory] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    base44.entities.AIConsultation.list('-created_date', 50).then(setConsultHistory);
  }, []);

  const sendMessage = async (text) => {
    const msg = text || inputText;
    if (!msg.trim()) return;
    setInputText('');
    setLoading(true);

    const userMsg = { role: 'user', content: msg };
    setHistory(prev => [...prev, userMsg]);

    const systemContext = `Eres un asistente técnico especializado en climatización, refrigeración industrial, instalaciones eléctricas y energía solar fotovoltaica. 
    Trabajas para una empresa técnica española. Responde en español. 
    Cuando des precios, indica que son orientativos y pueden variar según proveedor y región.
    Para normativas, cita el BOE o normativa española/europea correspondiente.
    Para preguntas de refrigeración, usa la Regla de Refrigerantes de Danfoss como referencia.
    Tipo de consulta actual: ${queryType}.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nConsulta del técnico: ${msg}`,
    });

    const assistantMsg = { role: 'assistant', content: response };
    setHistory(prev => [...prev, assistantMsg]);

    // Guardar en historial
    await base44.entities.AIConsultation.create({
      query: msg, response, type: queryType, date: format(new Date(), 'yyyy-MM-dd')
    });
    const updated = await base44.entities.AIConsultation.list('-created_date', 50);
    setConsultHistory(updated);
    setLoading(false);
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-green-600" />Asistente IA
        </h1>
        <Select value={queryType} onValueChange={setQueryType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="precios">💰 Precios</SelectItem>
            <SelectItem value="tecnico">🔧 Técnico</SelectItem>
            <SelectItem value="normativa">📋 Normativa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompts rápidos */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_PROMPTS[queryType]?.map((p, i) => (
          <button key={i} onClick={() => sendMessage(p)}
            className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors text-left">
            {p.length > 50 ? p.slice(0, 50) + '...' : p}
          </button>
        ))}
      </div>

      {/* Chat */}
      <Card>
        <CardContent className="p-0">
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {history.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Haz una consulta técnica, de precios o normativa</p>
              </div>
            )}
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200'}`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Escribe tu consulta técnica..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            <Button onClick={() => sendMessage()} disabled={loading || !inputText.trim()} className="bg-green-600">
              <Send className="w-4 h-4" />
            </Button>
            {history.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearHistory}>
                <Trash2 className="w-4 h-4 text-gray-400" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      {consultHistory.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
            <History className="w-4 h-4" /> Historial de consultas
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {consultHistory.map(c => (
              <Card key={c.id} className="cursor-pointer hover:shadow-sm" onClick={() => setHistory([{role:'user',content:c.query},{role:'assistant',content:c.response}])}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1">{c.query}</p>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{c.type}</Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{c.date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}