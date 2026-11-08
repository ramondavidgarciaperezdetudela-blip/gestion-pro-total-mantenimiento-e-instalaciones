import { useState } from 'react';

// Tablero del reparto: cada técnico es un carril DIN y cada trabajo un módulo
// con anchura proporcional a su duración. Admite arrastrar trabajos entre carriles.
//
// tecnicos: [{ id, designacion: '-K1', nombre, oficio, horasCargadas }]
// trabajos: [{ id, tecnicoId (null = sin asignar), designacion: '-Q1.1', titulo, codigo,
//              inicio: '08:30', fin: '10:30', estado: 'pendiente'|'curso'|'urgente'|'cerrado' }]

const aMinutos = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const horasTxt = (min) => {
  const h = Math.round((min / 60) * 100) / 100;
  return h.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' h';
};

export function CarrilReparto({
  tecnicos, trabajos, horaInicio = 8, horaFin = 18, ahora,
  seleccionado, onSeleccionar, onAsignar
}) {
  const [sobre, setSobre] = useState(null);
  const ranuras = (horaFin - horaInicio) * 2;
  const columna = (hora) => Math.round((aMinutos(hora) - horaInicio * 60) / 30) + 1;
  const columnaAhora = ahora ? columna(ahora) : null;
  const jornadaMin = (horaFin - horaInicio) * 60;

  const soltar = (tecnicoId) => (ev) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    setSobre(null);
    if (id && onAsignar) onAsignar(id, tecnicoId);
  };

  const modulo = (t) => {
    const ini = columna(t.inicio);
    const span = Math.max(1, columna(t.fin) - ini);
    return (
      <button
        key={t.id}
        type="button"
        draggable
        onDragStart={(ev) => ev.dataTransfer.setData('text/plain', t.id)}
        onClick={() => onSeleccionar && onSeleccionar(t)}
        aria-pressed={seleccionado === t.id}
        className={'gpt-modulo gpt-modulo--' + t.estado}
        style={{ gridColumn: ini + ' / span ' + span }}
        title={t.titulo + ', ' + t.inicio + ' a ' + t.fin}
      >
        <span className="gpt-modulo__cabeza">
          <span style={{ fontStretch: '112%' }}>{t.designacion}</span>
          <span>{horasTxt(aMinutos(t.fin) - aMinutos(t.inicio))}</span>
        </span>
        <span className="gpt-modulo__titulo">{t.titulo}</span>
        <span className="gpt-modulo__pie">{t.codigo}</span>
      </button>
    );
  };

  const etiquetasHora = [];
  for (let h = horaInicio; h < horaFin; h++) {
    etiquetasHora.push(
      <div key={h} style={{ gridColumn: (h - horaInicio) * 2 + 1 + ' / span 2', padding: '8px 4px 2px', borderLeft: '1px solid var(--gpt-linea)' }}>
        {String(h).padStart(2, '0')}:00
      </div>
    );
  }
  const rejilla = { display: 'grid', gridTemplateColumns: 'repeat(' + ranuras + ', minmax(0, 1fr))' };

  return (
    <section aria-label="Carriles por técnico" className="gpt-panel" style={{ padding: 0, overflowX: 'auto' }}>
      <div style={{ minWidth: 1000 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '210px minmax(0, 1fr)', borderBottom: 'var(--gpt-borde)' }}>
          <div className="gpt-etiqueta" style={{ padding: '8px 16px 0' }}>Técnico</div>
          <div className="gpt-etiqueta gpt-num" style={rejilla}>{etiquetasHora}</div>
        </div>

        {tecnicos.map((tec) => {
          const suyos = trabajos.filter((t) => t.tecnicoId === tec.id);
          const carga = suyos.reduce((s, t) => s + aMinutos(t.fin) - aMinutos(t.inicio), 0);
          return (
            <div key={tec.id} style={{ display: 'grid', gridTemplateColumns: '210px minmax(0, 1fr)', borderBottom: '1px solid var(--gpt-linea)' }}>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                <div className="gpt-codigo" style={{ fontSize: 15 }}>{tec.designacion}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{tec.nombre}</div>
                <div className="gpt-etiqueta">{tec.oficio}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div aria-hidden="true" style={{ flex: 1, height: 6, background: 'var(--gpt-gris-armario)', border: '1px solid var(--gpt-grafito)' }}>
                    <div style={{ width: Math.min(100, (carga / jornadaMin) * 100) + '%', height: '100%', background: 'var(--gpt-tinta)' }} />
                  </div>
                  <span className="gpt-num" style={{ fontSize: 12, fontWeight: 700 }}>{horasTxt(carga)}</span>
                </div>
              </div>
              <div
                className="gpt-riel"
                style={{ ...rejilla, outline: sobre === tec.id ? '3px dashed var(--gpt-azul)' : 'none', outlineOffset: -3 }}
                onDragOver={(ev) => { ev.preventDefault(); setSobre(tec.id); }}
                onDragLeave={() => setSobre(null)}
                onDrop={soltar(tec.id)}
              >
                {columnaAhora && (
                  <span aria-hidden="true" style={{ gridRow: 1, gridColumn: columnaAhora, alignSelf: 'stretch', width: 2, background: 'var(--gpt-tinta)', margin: '-12px 0 -12px -1px', position: 'relative', zIndex: 0 }} />
                )}
                {suyos.map(modulo)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Bandeja de trabajos sin técnico, para arrastrarlos a un carril.
export function BandejaSinAsignar({ trabajos, onSeleccionar }) {
  const libres = trabajos.filter((t) => !t.tecnicoId);
  return (
    <section aria-labelledby="sin-asignar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
        <h2 id="sin-asignar" className="gpt-titulo" style={{ fontSize: 22 }}>Por asignar</h2>
        <p className="gpt-secundario" style={{ margin: 0, fontSize: 15 }}>Arrastra cada trabajo al carril de un técnico con la habilitación que pide.</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {libres.length === 0 && <p className="gpt-secundario" style={{ margin: 0 }}>No queda nada por asignar.</p>}
        {libres.map((t) => (
          <button
            key={t.id}
            type="button"
            draggable
            onDragStart={(ev) => ev.dataTransfer.setData('text/plain', t.id)}
            onClick={() => onSeleccionar && onSeleccionar(t)}
            className={'gpt-modulo ' + (t.estado === 'urgente' ? 'gpt-modulo--urgente' : 'gpt-modulo--sin-asignar')}
            style={{ width: 270, height: 'auto', minHeight: 104, gap: 5 }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span style={{ fontStretch: '112%' }}>{t.designacion}</span>
              <span>{horasTxt(aMinutos(t.fin) - aMinutos(t.inicio))}</span>
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{t.titulo}</span>
            <span>{t.requisito}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
