import React from 'react';

/**
 * Error Boundary global — captura errores de render de React
 * y muestra una pantalla de error útil con botón de reintento.
 * Sin esto, cualquier error de render produce pantalla en blanco.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[GPT ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error ? String(this.state.error) : 'Error desconocido';
      return React.createElement('div', {
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#1e3a5f', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', color: 'white', padding: '24px',
          textAlign: 'center'
        }
      },
        React.createElement('div', { style: { fontSize: '48px', marginBottom: '16px' } }, '⚙️'),
        React.createElement('h2', { style: { fontSize: '20px', marginBottom: '8px' } }, 'Gestión Pro Total'),
        React.createElement('p', { style: { fontSize: '14px', opacity: 0.7, marginBottom: '24px' } }, 'Error al iniciar. Pulsa Reintentar.'),
        React.createElement('button', {
          onClick: function() { window.location.reload(); },
          style: {
            background: '#3b82f6', color: 'white', border: 'none',
            padding: '12px 28px', borderRadius: '12px',
            fontSize: '16px', cursor: 'pointer'
          }
        }, '🔄 Reintentar'),
        React.createElement('p', {
          style: { marginTop: '20px', fontSize: '11px', opacity: 0.4, wordBreak: 'break-all', maxWidth: '320px' }
        }, msg)
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
