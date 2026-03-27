import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, Clock, AlertCircle } from 'lucide-react';

export default function AutomationStatus() {
  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <p className="text-xs font-semibold text-blue-800">Automatizaciones Activas</p>
        </div>
        
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span><strong>Recordatorios de citas:</strong> Diariamente a las 20:00</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-[11px]">Avisa a clientes sobre citas de mañana</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-700 mt-2 pt-2 border-t border-blue-200">
            <AlertCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <span><strong>Panel de tareas pendientes:</strong> Actualización en tiempo real</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-[11px]">Destaca presupuestos sin respuesta (+7 días), SAT pendientes (+5 días) y mantenimientos (+60 días)</span>
          </div>
        </div>

        <p className="text-[10px] text-blue-700 bg-white rounded p-2 mt-3 border border-blue-200">
          💡 Usa el botón 📱 en el panel de tareas para enviar recordatorios manualmente cuando lo necesites
        </p>
      </CardContent>
    </Card>
  );
}