import PlanoFrigorifico from '@/pages/PlanoFrigorifico';
import PlanoErrorBoundary from '@/components/plano_frigorifico/PlanoErrorBoundary';

// «Plano y presupuesto» y «Plano Frigorífico» son ahora el mismo editor: un
// único lienzo con símbolos realistas, cotas, leyenda, cálculos, presupuesto,
// esquema eléctrico, exportación a PDF/CAD, impresión y vinculación al cliente.
// Se unifica así la herramienta de diseño en una sola pantalla.
//
// El ErrorBoundary propio contiene cualquier fallo del editor para que NO se
// caiga toda la app: la barra lateral y la navegación siguen funcionando.
export default function PlanoIA() {
  return (
    <PlanoErrorBoundary>
      <PlanoFrigorifico />
    </PlanoErrorBoundary>
  );
}