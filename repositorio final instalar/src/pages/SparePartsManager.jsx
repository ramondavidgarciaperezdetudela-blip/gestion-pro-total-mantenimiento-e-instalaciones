import React from 'react';
import { Package } from 'lucide-react';
import ClientSparePartsTab from '../components/solar/ClientSparePartsTab';

export default function SparePartsManager() {
  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500 rounded-xl"><Package className="w-6 h-6 text-white" /></div>
        <div>
          <h1 className="text-2xl font-bold">Gestión de Repuestos</h1>
          <p className="text-sm text-gray-500">Control de stock de repuestos — vincúlalos a clientes o déjalos en almacén general</p>
        </div>
      </div>
      <ClientSparePartsTab />
    </div>
  );
}