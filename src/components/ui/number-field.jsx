import * as React from "react";
import { Input } from "@/components/ui/input";

const toText = (v) =>
  v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v))
    ? ""
    : String(v);

/**
 * Campo numérico técnico.
 *
 * - El cuadro sale VACÍO cuando no hay valor (nunca fuerza un 0 delante).
 * - Se puede escribir del tirón, incluidos decimales a medias ("0.", "1.", ",5").
 * - Admite coma o punto como separador decimal.
 * - Emite un número al padre; si el cuadro queda vacío emite 0 (neutro en los cálculos),
 *   pero el cuadro se sigue mostrando vacío.
 *
 * Uso:
 *   <NumberField value={form.largo} onChange={(v) => setForm({ ...form, largo: v })} />
 *   <NumberField decimals={false} value={form.unidades} onChange={...} />   // solo enteros
 */
export const NumberField = React.forwardRef(function NumberField(
  { value, onChange, decimals = true, className, ...props },
  ref
) {
  const [text, setText] = React.useState(() => toText(value));

  // Sincroniza si el valor cambia por fuera (reset del formulario, carga de datos, autorrelleno),
  // sin pisar lo que se está escribiendo (p. ej. un "1." a medias).
  React.useEffect(() => {
    const ext = toText(value);
    const partial = text === "" || text === "-" || /[.,]$/.test(text);
    const sameNumber = parseFloat(text) === parseFloat(ext);
    if (!partial && !sameNumber && ext !== text) setText(ext);
    if (text !== "" && ext === "" && value !== 0) setText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    let v = e.target.value;
    if (decimals) v = v.replace(",", ".");
    const ok = decimals ? /^-?\d*\.?\d*$/.test(v) : /^-?\d*$/.test(v);
    if (!ok) return;
    setText(v);
    if (v === "" || v === "-" || v === ".") {
      onChange?.(0);
      return;
    }
    const n = decimals ? parseFloat(v) : parseInt(v, 10);
    onChange?.(Number.isNaN(n) ? 0 : n);
  };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      value={text}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
});

export default NumberField;
