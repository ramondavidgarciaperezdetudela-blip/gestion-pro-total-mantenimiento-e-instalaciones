import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from '@/hooks/use-mobile';
import { Check, ChevronDown } from 'lucide-react';

/**
 * A Select that renders as a native bottom-sheet drawer on mobile
 * and as the standard Radix Select popover on desktop.
 *
 * Props match a subset of the Radix Select API:
 *   value, onValueChange, placeholder, children (array of { value, label } objects),
 *   className (applied to trigger)
 *
 * Usage:
 *   <MobileSelect
 *     value={status}
 *     onValueChange={setStatus}
 *     placeholder="Estado"
 *     options={[{ value: 'all', label: 'Todos' }, { value: 'pendiente', label: 'Pendiente' }]}
 *     className="w-32"
 *   />
 */
export default function MobileSelect({ value, onValueChange, placeholder, options = [], className = '', triggerClassName = '' }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder || 'Seleccionar';

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className || triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: bottom sheet
  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className={`inline-flex items-center justify-between gap-1 h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring ${className || triggerClassName}`}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
      </button>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '75vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        {placeholder && (
          <div className="px-4 pb-2 border-b">
            <p className="text-sm font-semibold text-gray-700">{placeholder}</p>
          </div>
        )}

        {/* Options */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onValueChange(o.value); setDrawerOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                value === o.value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>{o.label}</span>
              {value === o.value && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}