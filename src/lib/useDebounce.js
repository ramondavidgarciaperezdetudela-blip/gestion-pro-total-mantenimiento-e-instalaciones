import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDebounce — retarda actualizaciones de estado para inputs numéricos.
 * Evita re-renders en cada pulsación en Android WebView.
 *
 * @param {*} value Valor inicial
 * @param {number} delay Milisegundos de espera (default: 300ms)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/**
 * useInputFix — hook que mantiene el valor local del input separado del estado React.
 * Resuelve el problema de carácter-a-carácter en Android WebView.
 *
 * Uso:
 *   const [displayVal, handlers] = useInputFix(formValue, newVal => setForm({...form, campo: newVal}));
 *   <input value={displayVal} {...handlers} />
 */
export function useInputFix(externalValue, onChange, delay = 0) {
  const [localValue, setLocalValue] = useState(String(externalValue ?? ''));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  
  // Sincronizar con valor externo solo cuando cambia desde fuera
  const lastExternal = useRef(externalValue);
  useEffect(() => {
    if (externalValue !== lastExternal.current) {
      lastExternal.current = externalValue;
      setLocalValue(String(externalValue ?? ''));
    }
  }, [externalValue]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (delay > 0) {
      clearTimeout(handleChange._timer);
      handleChange._timer = setTimeout(() => onChangeRef.current(val), delay);
    } else {
      onChangeRef.current(val);
    }
  }, [delay]);

  return [localValue, { value: localValue, onChange: handleChange }];
}
