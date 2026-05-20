import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Bot, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIReportPanel({ tipo, datos }) {
  const [informe, setInforme] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generarInforme = async () => {
    setLoading(true);
    setExpanded(true);
    const prompt = tipo === 'solar'
      ? `Eres un ingeniero experto en instalaciones fotovoltaicas. Genera un informe técnico profesional y ejecutivo en español para el cliente, basado en estos datos del cálculo solar:
${JSON.stringify(datos, null, 2)}
El informe debe incluir:
1. Resumen ejecutivo de la instalación (en lenguaje claro para el cliente)
2. Análisis técnico: dimensionado, producción esperada, rendimiento
3. Ahorro estimado en factura eléctrica (usa precio medio 0,18€/kWh)
4. Retorno de inversión estimado (coste aprox. instalación y años de amortización)
5. Recomendaciones técnicas específicas
6. Ventajas ambientales (CO2 evitado)
Sé concreto con los números. Usa formato markdown con secciones claras.`
      : tipo === 'baterias'
      ? `Eres un ingeniero experto en sistemas de almacenamiento energético. Genera un informe técnico profesional en español para el cliente, basado en estos datos del sistema de baterías:
${JSON.stringify(datos, null, 2)}
El informe debe incluir:
1. Resumen ejecutivo del sistema de almacenamiento
2. Análisis técnico: capacidad, autonomía, dimensionado
3. Casos de uso y beneficios principales según tipo de instalación (${datos.tipoRed})
4. Coste estimado del sistema y ROI
5. Recomendaciones técnicas y de mantenimiento
6. Comparativa tecnologías de batería (LiFePO4 vs plomo-ácido)
Usa formato markdown con secciones claras.`
      : `Eres un ingeniero experto en energía solar y almacenamiento. Genera un informe técnico completo y profesional en español para el cliente, basado en este sistema completo solar + baterías:
${JSON.stringify(datos, null, 2)}
El informe debe incluir:
1. Resumen ejecutivo del sistema completo
2. Análisis del subsistema fotovoltaico
3. Análisis del sistema de almacenamiento
4. Integración y sinergia entre solar y baterías
5. Producción vs consumo: cobertura y autonomía
6. Ahorro en factura y retorno de inversión
7. Recomendaciones de instalación, operación y mantenimiento
8. Impacto ambiental: CO2 evitado, huella de carbono
Usa formato markdown con secciones claras y datos numéricos concretos.`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    setInforme(res);
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-600 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-violet-800 text-sm">Informe IA</p>
            <p className="text-xs text-violet-600">Análisis técnico y ejecutivo generado por inteligencia artificial</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {informe && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)} className="text-violet-600 hover:bg-violet-100">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
          <Button
            size="sm"
            onClick={generarInforme}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Bot className="w-4 h-4 mr-1.5" />}
            {loading ? 'Generando...' : informe ? 'Regenerar' : 'Generar informe IA'}
          </Button>
        </div>
      </div>

      {expanded && informe && (
        <div className="border-t border-violet-200 p-4 bg-white">
          <div className="prose prose-sm prose-violet max-w-none text-gray-800">
            <ReactMarkdown>{informe}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}