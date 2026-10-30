import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, Clock, AlertCircle } from 'lucide-react';

export default function AutomationStatus() {
  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <p className="text-blue-800 text-sm font-semibold">Automatizaciones Activas</p>
        </div>
        
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span className="text-sm font-black">Recordatorios de citas: Diariamente a las 20:00</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-[11px] text-sm font-black">Avisa a clientes sobre citas de mañana</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-700 mt-2 pt-2 border-t border-blue-200">
            <AlertCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black">Panel de tareas pendientes: Actualización en tiempo real</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-[11px] text-sm font-extrabold">Destaca presupuestos sin respuesta (+7 días), SAT pendientes (+5 días) y mantenimientos (+60 días)</span>
          </div>
        </div>

        <p className="bg-white text-blue-700 mt-3 p-2 text-sm font-black rounded border border-blue-200">💡 Usa el botón 📱 en el panel de tareas para enviar recordatorios manualmente cuando lo necesites

        </p>
      </CardContent>
    </Card>);

}