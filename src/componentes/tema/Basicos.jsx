// Piezas básicas del tema: cajetín, estado, barra superior y panel.

// Cajetín de datos como el de un plano.
// campos: [{ etiqueta: 'Fecha', valor: '08/11/2026', doble?: true, titulo?: true }]
export function Cajetin({ campos, etiquetaAccesible = 'Datos' }) {
  return (
    <section className="gpt-cajetin" aria-label={etiquetaAccesible}>
      {campos.map((c, i) => (
        <div key={i} className={'gpt-cajetin__campo' + (c.doble ? ' gpt-cajetin__campo--doble' : '')}>
          <div className="gpt-etiqueta">{c.etiqueta}</div>
          {c.titulo ? (
            <h1 className="gpt-titulo" style={{ fontSize: 26, marginTop: 2 }}>{c.valor}</h1>
          ) : (
            <div className="gpt-valor">{c.valor}</div>
          )}
        </div>
      ))}
    </section>
  );
}

const TEXTO_ESTADO = {
  pendiente: 'Pendiente',
  curso: 'En curso',
  urgente: 'Urgente',
  cerrado: 'Cerrado',
  contorno: ''
};

// Etiqueta de estado. El amarillo se reserva para lo urgente.
export function Estado({ tipo = 'pendiente', children }) {
  return <span className={'gpt-chip gpt-chip--' + tipo}>{children || TEXTO_ESTADO[tipo]}</span>;
}

// Barra superior oscura con ruta de navegación y acciones.
// ruta: [{ texto, href }] ; el último elemento es la página actual.
export function BarraSuperior({ marca = 'Gestión Pro Total', ruta = [], acciones, Enlace }) {
  return (
    <header className="gpt-barra">
      <nav aria-label="Ruta" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 14, alignItems: 'center' }}>
        <span className="gpt-barra__marca">{marca}</span>
        {ruta.map((r, i) => {
          const ultimo = i === ruta.length - 1;
          return (
            <span key={i} style={{ display: 'flex', gap: 8 }}>
              {ultimo ? <span aria-current="page">{r.texto}</span> : (Enlace ? <Enlace to={r.href}>{r.texto}</Enlace> : <a href={r.href}>{r.texto}</a>)}
              {!ultimo && <span aria-hidden="true" style={{ color: 'var(--gpt-acero)' }}>/</span>}
            </span>
          );
        })}
      </nav>
      {acciones && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{acciones}</div>}
    </header>
  );
}

// Panel con título. variante: 'normal' | 'fuerte' | 'placa'
export function Panel({ titulo, variante = 'normal', tapa = false, children, estilo, id }) {
  const clase =
    'gpt-panel' +
    (variante === 'fuerte' ? ' gpt-panel--fuerte' : '') +
    (variante === 'placa' ? ' gpt-panel--placa' : '') +
    (tapa ? ' gpt-panel--con-tapa' : '');
  const idTitulo = id ? id + '-titulo' : undefined;
  return (
    <section className={clase} style={estilo} aria-labelledby={titulo ? idTitulo : undefined}>
      {titulo && (
        <h2 id={idTitulo} className="gpt-titulo gpt-titulo--2" style={{ marginBottom: 10 }}>
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}

// Pantalla completa con papel milimetrado y dibujo de fondo opcional.
export function Pantalla({ children, fondo }) {
  return (
    <div className="gpt-app gpt-papel gpt-con-fondo">
      {fondo}
      {children}
    </div>
  );
}
