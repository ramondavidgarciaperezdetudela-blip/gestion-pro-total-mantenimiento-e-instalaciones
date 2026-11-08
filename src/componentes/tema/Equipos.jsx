// Placa de características, tarjeta de medida con escala y gráfico de evolución.

const formato = (n, dec = 1) => Number(n).toFixed(dec).replace('.', ',');

// Placa de características atornillada.
// datos: [{ etiqueta: 'Potencia útil', valor: '20,0 kW' }]
export function PlacaEquipo({ codigo, tipo, estado, distintivos = [], datos = [], tamCodigo = 56 }) {
  const tornillo = (pos) => (
    <span aria-hidden="true" style={{ position: 'absolute', width: 8, height: 8, border: '1.5px solid var(--gpt-grafito)', borderRadius: '50%', ...pos }} />
  );
  return (
    <section aria-labelledby={'placa-' + codigo} className="gpt-panel--placa" style={{ position: 'relative', padding: '22px 28px' }}>
      {tornillo({ top: 8, left: 8 })}{tornillo({ top: 8, right: 8 })}
      {tornillo({ bottom: 8, left: 8 })}{tornillo({ bottom: 8, right: 8 })}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="gpt-etiqueta" style={{ fontSize: 13 }}>{tipo}</div>
          <h1 id={'placa-' + codigo} className="gpt-titulo" style={{ fontSize: tamCodigo, marginTop: 4, overflowWrap: 'anywhere' }}>{codigo}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {estado}
          {distintivos.map((d) => <span key={d} className="gpt-chip gpt-chip--contorno">{d}</span>)}
        </div>
      </div>
      <dl style={{ margin: '20px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px 20px', borderTop: 'var(--gpt-borde)', paddingTop: 16 }}>
        {datos.map((d) => (
          <div key={d.etiqueta}>
            <dt className="gpt-etiqueta">{d.etiqueta}</dt>
            <dd className="gpt-num" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{d.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Valora una medida frente a su rango. Devuelve 'correcto', 'fuera' o null si no hay rango.
export function valorarMedida(valor, min, max) {
  if (min == null && max == null) return null;
  if (min != null && valor < min) return 'fuera';
  if (max != null && valor > max) return 'fuera';
  return 'correcto';
}

// Tarjeta de una medida. Si se da rango y escala, dibuja la barra con la marca.
// escala: [inicio, fin] del eje. rango: [min, max] admisible (cualquiera puede ser null).
export function TarjetaMedida({ etiqueta, valor, unidad, decimales = 1, nota, rango, escala }) {
  const [min, max] = rango || [null, null];
  const estado = valorarMedida(valor, min, max);
  let barra = null;
  if (escala) {
    const [e0, e1] = escala;
    const pct = (v) => Math.max(0, Math.min(100, ((v - e0) / (e1 - e0)) * 100));
    const izq = pct(min != null ? min : e0);
    const der = pct(max != null ? max : e1);
    barra = (
      <div className="gpt-escala" aria-hidden="true">
        <span className="gpt-escala__rango" style={{ left: izq + '%', width: der - izq + '%', background: estado === 'fuera' ? 'var(--gpt-linea)' : undefined }} />
        <span className="gpt-escala__marca" style={{ left: pct(valor) + '%' }} />
      </div>
    );
  }
  return (
    <div className="gpt-medida" style={estado === 'fuera' ? { borderColor: 'var(--gpt-tinta)', boxShadow: 'inset 0 0 0 2px var(--gpt-amarillo)' } : undefined}>
      <span className="gpt-etiqueta" style={{ fontSize: 13 }}>{etiqueta}</span>
      <span className="gpt-medida__valor">{formato(valor, decimales)}<span className="gpt-medida__unidad">{unidad}</span></span>
      {nota && <span className="gpt-etiqueta gpt-num">{nota}</span>}
      {estado === 'fuera' && <span className="gpt-chip gpt-chip--urgente" style={{ alignSelf: 'flex-start' }}>Fuera de rango</span>}
      {barra}
    </div>
  );
}

// Gráfico de barras de la evolución de una medida, con línea de límite.
// puntos: [{ etiqueta: '03/23', valor: 22 }]
export function GraficoEvolucion({ puntos, limite, unidad, descripcion }) {
  const W = 440, H = 190, x0 = 40, y0 = 150, alto = 130;
  const maxEje = Math.max(limite || 0, ...puntos.map((p) => p.valor)) * 1.2;
  const y = (v) => y0 - (v / maxEje) * alto;
  const paso = (W - x0 - 20) / puntos.length;
  return (
    <svg role="img" aria-label={descripcion} viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', maxWidth: 640, height: 'auto', display: 'block', fontFamily: 'var(--gpt-fuente)' }}>
      <line x1={x0} y1={y0} x2={W - 10} y2={y0} stroke="#23282B" strokeWidth="1.5" />
      <line x1={x0} y1={20} x2={x0} y2={y0} stroke="#23282B" strokeWidth="1.5" />
      {limite != null && (
        <g>
          <line x1={x0} y1={y(limite)} x2={W - 10} y2={y(limite)} stroke="#23282B" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x={W - 10} y={y(limite) - 6} textAnchor="end" fontSize="12" fontWeight="700" fill="#23282B">Límite {formato(limite, 0)} {unidad}</text>
        </g>
      )}
      <text x="8" y="14" fontSize="11" fill="#474A50">{unidad}</text>
      {puntos.map((p, i) => {
        const ultimo = i === puntos.length - 1;
        const cx = x0 + paso * i + paso / 2;
        return (
          <g key={i}>
            <rect x={cx - 22} y={y(p.valor)} width="44" height={y0 - y(p.valor)} fill={ultimo ? '#23282B' : '#1E4C8A'} />
            <text x={cx} y={y(p.valor) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#23282B">{formato(p.valor, 0)}</text>
            <text x={cx} y={y0 + 18} textAnchor="middle" fontSize="12" fill={ultimo ? '#23282B' : '#474A50'} fontWeight={ultimo ? 700 : 400}>{p.etiqueta}</text>
          </g>
        );
      })}
    </svg>
  );
}
