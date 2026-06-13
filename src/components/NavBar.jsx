import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Navegación segura: no usa hooks de react-router directamente
// para evitar errores si se usa fuera del Router context
export default function NavBar({ title, onBack, homeKey = 'Home', className = '' }) {

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (window.history.length > 1) window.history.back();
    else window.location.href = `/${homeKey}`;
  };

  const handleHome = () => {
    window.location.href = `/${homeKey}`;
  };

  return (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBack}
        className="gap-1.5 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300 flex-shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Button>

      {title && (
        <span className="flex-1 text-center text-sm text-gray-500 font-medium truncate px-2">
          {title}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleHome}
        className="gap-1.5 text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300 flex-shrink-0"
      >
        <Home className="w-4 h-4" />
        Inicio
      </Button>
    </div>
  );
}
