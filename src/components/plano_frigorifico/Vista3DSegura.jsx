import React, { Suspense, lazy, Component } from 'react';
import { Box } from 'lucide-react';

/**
 * Vista3DSegura — envuelve el visor 3D para que si falla (un import, un error
 * de render en un WebView viejo, etc.) NO se caiga el editor de planos.
 *
 * - Carga el visor de forma perezosa (lazy) para que vaya en su propio chunk y
 *   no penalice el primer render del editor.
 * - Lo envuelve en un ErrorBoundary propio: si el 3D falla, se muestra un
 *   aviso "no disponible" y el editor sigue funcionando.
 * - Pasa las mismas props al visor real.
 */
const Vista3DPlanoFrigorifico = lazy(() => import('./Vista3DPlanoFrigorifico'));

class Boundary3D extends Component {
  constructor(props) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error) {
    console.error('Visor 3D no disponible:', error);
  }
  render() {
    if (this.state.error) {
      return this.props.compact
        ? <div className="text-[10px] text-slate-400 text-center py-2 flex items-center justify-center gap-1"><Box className="w-3 h-3" /> Visor 3D no disponible</div>
        : <div className="text-xs text-slate-400 text-center py-8 flex items-center justify-center gap-1"><Box className="w-3.5 h-3.5" /> Visor 3D no disponible en este dispositivo</div>;
    }
    return this.props.children;
  }
}

export default function Vista3DSegura(props) {
  const fallback = props.compact
    ? <div className="h-[120px] animate-pulse rounded-lg bg-slate-100" />
    : <div className="h-[220px] animate-pulse rounded-lg bg-slate-100" />;
  return (
    <Boundary3D compact={props.compact}>
      <Suspense fallback={fallback}>
        <Vista3DPlanoFrigorifico {...props} />
      </Suspense>
    </Boundary3D>
  );
}