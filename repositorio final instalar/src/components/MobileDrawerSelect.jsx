import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Check, ChevronDown } from 'lucide-react';

/**
 * MobileDrawerSelect - renders a native bottom-sheet on mobile, shadcn Select on desktop.
 * Props mirror shadcn Select: value, onValueChange, placeholder, children (SelectItem compatible).
 * Pass items as: [{ value, label }]
 */
export function MobileDrawerSelect({ value, onValueChange, placeholder = 'Seleccionar...', items = [], className = '', triggerClassName = '', disabled = false }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selected = items.find(i => i.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName || className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map(item => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName || className}`}
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {/* Placeholder as header */}
        <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wide font-semibold border-b">
          {placeholder}
        </div>
        <div className="py-2">
          {items.map(item => (
            <button
              key={item.value}
              type="button"
              className={`w-full flex items-center justify-between px-5 py-3.5 text-sm text-left transition-colors active:bg-gray-100 ${
                item.value === value ? 'text-blue-600 font-semibold' : 'text-gray-800'
              }`}
              onClick={() => {
                onValueChange(item.value);
                setOpen(false);
              }}
            >
              <span>{item.label}</span>
              {item.value === value && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default MobileDrawerSelect;