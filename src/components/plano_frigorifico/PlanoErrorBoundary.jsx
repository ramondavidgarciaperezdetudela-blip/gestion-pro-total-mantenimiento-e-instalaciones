import React, { Component } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * PlanoErrorBoundary — contiene los errores del editor de planos para que NO
 * se caiga toda la app. Si algo falla al montar el editor (un import, el visor
 * 3D, lo que sea), se muestra este aviso en su sitio, pero la barra lateral,
 * la cabecera y el resto del programa siguen funcionando.
 *
 * Es un class component porque los ErrorBoundary de React se hacen así
 * (getDerivedStateFromError / componentDidCatch), no con hooks.
 */
function Fallback({ onReintentar }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center min-h-[50vh]">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--destructive)/0.12)' }}>
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <div>
        <h2 className="text-lg font-bold">No se pudo cargar el editor de planos</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Algo falló al montar la página. Puedes reintentar o volver al inicio;
          el resto de la app sigue funcionando.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={onReintentar}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          <RotateCcw className="w-4 h-4" /> Reintentar
        </button>
        <button onClick={() => { window.location.assign('/'); }}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
          <Home className="w-4 h-4" /> Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default class PlanoErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error) {
    // Que llegue a la consola para diagnosticar, pero sin tumbar la app.
    console.error('Error en editor de planos:', error);
  }
  reintentar = () => this.setState({ error: false });
  render() {
    if (this.state.error) return <Fallback onReintentar={this.reintentar} />;
    return this.props.children;
  }
}