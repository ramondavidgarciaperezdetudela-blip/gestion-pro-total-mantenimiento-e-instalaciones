import { useMemo, useState } from 'react';
import {
  PANELES, DATOS_POR_DEFECTO, calcularCarga, UNIDADES_CONDENSADORAS, COMPACTOS,
  valorarEquipo, evaporadorPara, recomendada, f
} from './calculoCamara.js';
import { Estado } from './Basicos.jsx';

const aTexto = (v) => (v === '' || v == null ? '' : String(v).replace('.', ','));

function Campo({ etiqueta, unidad, valor, onCambio }) {
  const [texto, setTexto] = useState(aTexto(valor));
  const cambiar = (e) => {
    const t = e.target.value.replace(/[^0-9,.-]/g, '');
    setTexto(t);
    const n = parseFloat(t.replace(',', '.'));
    onCambio(Number.isFinite(n) ? n : '');
  };
  return (
    <label style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px 48px', alignItems: 'center', gap: 8, minHeight: 44, fontSize: 14 }}>
      {etiqueta}
      <input
        type="text" inputMode="decimal" value={texto} onChange={cambiar} onBlur={() => setTexto(aTexto(valor))}
        className="gpt-num"
        style={{ height: 40, border: '1.5px solid var(--gpt-tinta)', background: '#FFFFFF', padding: '0 8px', fontSize: 15, fontWeight: 700, textAlign: 'right', width: '100%', boxSizing: 'border-box' }}
      />
      <span className="gpt-etiqueta" style={{ fontSize: 13 }}>{unidad}</span>
    </label>
  );
}

function Grupo({ titulo, children }) {
  return (
    <fieldset style={{ margin: 0, padding: '12px 16px', border: 0, borderTop: 'var(--gpt-borde)' }}>
      <legend style={{ fontSize: 14, fontWeight: 800, padding: '0 0 4px', display: 'block', width: '100%' }}>{titulo}</legend>
      {children}
    </fieldset>
  );
}

// Selector de equipo: lista las opciones, valora la reserva y propone la combinación.
export function SelectorEquipo({ kwNecesario, onElegir }) {
  const [tipo, setTipo] = useState('partido');
  const lista = tipo === 'partido' ? UNIDADES_CONDENSADORAS : COMPACTOS;
  const [elegidos, setElegidos] = useState({
    partido: recomendada(UNIDADES_CONDENSADORAS, kwNecesario).modelo,
    compacto: recomendada(COMPACTOS, kwNecesario).modelo
  });
  const eq = lista.find((e) => e.modelo === elegidos[tipo]) || lista[0];
  const { reserva } = valorarEquipo(eq.kw, kwNecesario);
  const elegir = (modelo) => {
    setElegidos({ ...elegidos, [tipo]: modelo });
    if (onElegir) onElegir({ tipo, modelo });
  };
  const evap = tipo === 'partido' ? evaporadorPara(eq) : null;
  const combinacion = tipo === 'partido'
    ? [
        { etiqueta: 'Evaporador que va bien', valor: `${evap.modelo}, ${f(evap.kw)} kW`, nota: `Salto 8 K, ${evap.ventiladores}` },
        { etiqueta: 'Válvula de expansión', valor: `Termostática ${eq.vet}`, nota: 'Igualación externa' },
        { etiqueta: 'Líneas frigoríficas', valor: `Líquido ${eq.liquido}, aspiración ${eq.aspiracion}`, nota: 'Comprobar con el recorrido real' },
        { etiqueta: 'Protección eléctrica', valor: `Magnetotérmico ${eq.proteccion}`, nota: 'Más diferencial 30 mA' }
      ]
    : [
        { etiqueta: 'Evaporador', valor: 'Incluido en el equipo', nota: 'No hace falta elegir otro' },
        { etiqueta: 'Hueco en el panel', valor: eq.hueco, nota: 'Corte en pared o techo' },
        { etiqueta: 'Instalación frigorífica', valor: 'Sin tuberías', nota: 'Llega cargado de fábrica' },
        { etiqueta: 'Protección eléctrica', valor: `Magnetotérmico ${eq.proteccion}`, nota: 'Más diferencial 30 mA' }
      ];

  return (
    <section aria-labelledby="elige-equipo" className="gpt-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <h2 id="elige-equipo" className="gpt-titulo gpt-titulo--2">Elige el equipo</h2>
          <p className="gpt-secundario" style={{ margin: '4px 0 0', fontSize: 14 }}>Hacen falta {f(kwNecesario, 2)} kW. Elige una opción y verás con qué se combina.</p>
        </div>
        <div role="group" aria-label="Tipo de instalación" style={{ display: 'flex' }}>
          <button type="button" className="gpt-boton" aria-pressed={tipo === 'partido'} onClick={() => setTipo('partido')}>Unidad condensadora + evaporador</button>
          <button type="button" className="gpt-boton" aria-pressed={tipo === 'compacto'} onClick={() => setTipo('compacto')}>Equipo compacto</button>
        </div>
      </div>

      <div role="radiogroup" aria-label="Equipos disponibles" style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowX: 'auto' }}>
        {lista.map((e) => {
          const v = valorarEquipo(e.kw, kwNecesario);
          const sel = e.modelo === eq.modelo;
          return (
            <button
              key={e.modelo} type="button" role="radio" aria-checked={sel} onClick={() => elegir(e.modelo)}
              className="gpt-num"
              style={{
                display: 'grid', gridTemplateColumns: '24px 90px 90px 70px 150px minmax(220px, 1fr)', gap: 10, alignItems: 'center',
                minHeight: 52, padding: '6px 12px', textAlign: 'left', fontSize: 14, color: 'var(--gpt-tinta)', cursor: 'pointer',
                background: sel ? '#FFFFFF' : 'rgba(255,255,255,0.6)', border: sel ? '2px solid var(--gpt-azul)' : '1.5px solid var(--gpt-linea)'
              }}
            >
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--gpt-tinta)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gpt-azul)' }} />}
              </span>
              <span className="gpt-codigo">{e.modelo}</span>
              <span style={{ fontWeight: 700 }}>{f(e.kw, 2)} kW</span>
              <span>{(v.reserva >= 0 ? '+' : '') + f(v.reserva, 0)} %</span>
              <span><Estado tipo={v.tipo}>{v.valoracion}</Estado></span>
              <span className="gpt-secundario" style={{ fontSize: 13 }}>{e.detalle}</span>
            </button>
          );
        })}
      </div>

      <div className="gpt-panel--placa" aria-live="polite">
        <div style={{ padding: '10px 14px', borderBottom: 'var(--gpt-borde)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Combinación para {eq.modelo}</h3>
          <span className="gpt-etiqueta" style={{ fontSize: 13 }}>{f(eq.kw, 2)} kW frente a {f(kwNecesario, 2)} kW necesarios</span>
        </div>
        {reserva < 0 && (
          <p style={{ margin: 0, padding: '10px 14px', background: 'var(--gpt-amarillo)', borderBottom: '1.5px solid var(--gpt-tinta)', fontSize: 14, fontWeight: 700 }}>
            Este equipo no cubre la carga: faltan {f(kwNecesario - eq.kw, 2)} kW. La cámara no llegaría a la temperatura en los días de más calor.
          </p>
        )}
        {reserva > 40 && (
          <p style={{ margin: 0, padding: '10px 14px', background: 'var(--gpt-linea-suave)', borderBottom: 'var(--gpt-borde)', fontSize: 14 }}>
            Equipo sobrado: hará ciclos cortos de arranque y parada, gastará más y secará el género.
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {combinacion.map((c) => (
            <div key={c.etiqueta} style={{ padding: '12px 14px', borderRight: '1px solid var(--gpt-linea)', borderBottom: '1px solid var(--gpt-linea)' }}>
              <div className="gpt-etiqueta">{c.etiqueta}</div>
              <div className="gpt-num" style={{ fontSize: 16, fontWeight: 800 }}>{c.valor}</div>
              <div className="gpt-etiqueta" style={{ fontSize: 13 }}>{c.nota}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pantalla completa del cálculo: datos, resultado, desglose y selector.
export function CalculoCamara({ datosIniciales, onElegirEquipo }) {
  const [d, setD] = useState({ ...DATOS_POR_DEFECTO, ...(datosIniciales || {}) });
  const cambiar = (clave) => (v) => setD({ ...d, [clave]: v });
  const valido = ['largo', 'ancho', 'alto', 'horasFuncionamiento'].every((k) => Number(d[k]) > 0);
  const r = useMemo(() => (valido ? calcularCarga(d) : null), [d, valido]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <form aria-label="Datos de partida" className="gpt-panel--fuerte" style={{ flex: '1 1 420px' }} onSubmit={(e) => e.preventDefault()}>
          <div style={{ padding: '12px 16px', fontSize: 17, fontWeight: 800 }}>Datos de partida</div>
          <Grupo titulo="Recinto">
            <Campo etiqueta="Largo interior" unidad="m" valor={d.largo} onCambio={cambiar('largo')} />
            <Campo etiqueta="Ancho interior" unidad="m" valor={d.ancho} onCambio={cambiar('ancho')} />
            <Campo etiqueta="Alto interior" unidad="m" valor={d.alto} onCambio={cambiar('alto')} />
          </Grupo>
          <Grupo titulo="Temperaturas y aislamiento">
            <Campo etiqueta="Temperatura interior" unidad="°C" valor={d.tInterior} onCambio={cambiar('tInterior')} />
            <Campo etiqueta="Temperatura exterior de cálculo" unidad="°C" valor={d.tExterior} onCambio={cambiar('tExterior')} />
            <label style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 158px', alignItems: 'center', gap: 8, minHeight: 44, fontSize: 14 }}>
              Panel de cerramiento
              <select value={d.panel} onChange={(e) => setD({ ...d, panel: e.target.value })} style={{ height: 40, border: '1.5px solid var(--gpt-tinta)', background: '#FFFFFF', padding: '0 8px', fontSize: 15 }}>
                {Object.keys(PANELES).map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
          </Grupo>
          <Grupo titulo="Producto y uso">
            <Campo etiqueta="Entrada diaria de género" unidad="kg" valor={d.entradaKg} onCambio={cambiar('entradaKg')} />
            <Campo etiqueta="Temperatura de entrada" unidad="°C" valor={d.tEntrada} onCambio={cambiar('tEntrada')} />
            <Campo etiqueta="Género almacenado" unidad="kg" valor={d.almacenadoKg} onCambio={cambiar('almacenadoKg')} />
            <Campo etiqueta="Renovaciones de aire" unidad="/día" valor={d.renovacionesDia} onCambio={cambiar('renovacionesDia')} />
            <Campo etiqueta="Horas de funcionamiento" unidad="h/día" valor={d.horasFuncionamiento} onCambio={cambiar('horasFuncionamiento')} />
            <Campo etiqueta="Margen de seguridad" unidad="%" valor={d.margen} onCambio={cambiar('margen')} />
          </Grupo>
        </form>

        <div style={{ flex: '1.5 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!r && <p className="gpt-chip gpt-chip--urgente" style={{ fontSize: 14, padding: 10 }}>Revisa las medidas y las horas de funcionamiento: deben ser mayores que cero.</p>}
          {r && (
            <>
              <section aria-label="Resultado" className="gpt-panel--placa" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div style={{ padding: '16px 18px', borderRight: 'var(--gpt-borde)' }}>
                  <div className="gpt-etiqueta" style={{ fontSize: 13 }}>Potencia frigorífica necesaria</div>
                  <div className="gpt-titulo gpt-num" style={{ fontSize: 48 }}>{f(r.potenciaKw, 2)} <span style={{ fontSize: 22 }}>kW</span></div>
                </div>
                <div style={{ padding: '16px 18px', borderRight: 'var(--gpt-borde)' }}>
                  <div className="gpt-etiqueta" style={{ fontSize: 13 }}>Carga diaria con margen</div>
                  <div className="gpt-num" style={{ fontSize: 24, fontWeight: 800 }}>{f(r.total, 2)} kWh</div>
                  <div className="gpt-etiqueta">Volumen {f(r.volumen)} m³, superficie {f(r.superficie)} m²</div>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <div className="gpt-etiqueta" style={{ fontSize: 13 }}>Evaporación prevista</div>
                  <div className="gpt-num" style={{ fontSize: 24, fontWeight: 800 }}>{f(r.tEvaporacion, 0)} °C</div>
                  <div className="gpt-etiqueta">Salto en evaporador {f(r.datos.saltoEvaporador, 0)} K</div>
                </div>
              </section>

              <section aria-labelledby="desglose" className="gpt-panel gpt-tabla-caja">
                <h2 id="desglose" className="gpt-titulo gpt-titulo--2" style={{ marginBottom: 10 }}>Desglose de cargas</h2>
                <table className="gpt-tabla" style={{ minWidth: 560, fontSize: 14 }}>
                  <thead><tr><th>Concepto</th><th>Base de cálculo</th><th className="gpt-der">kWh/día</th><th style={{ width: 160 }}>Peso</th></tr></thead>
                  <tbody>
                    {[...r.partidas].sort((a, b) => b.kwh - a.kwh).map((p) => (
                      <tr key={p.id}>
                        <td>{p.concepto}</td><td>{p.base}</td><td className="gpt-der">{f(p.kwh, 2)}</td>
                        <td><div style={{ height: 10, background: 'var(--gpt-azul)', width: p.peso + '%' }} /></td>
                      </tr>
                    ))}
                    <tr><td style={{ fontWeight: 700 }}>Subtotal</td><td /><td className="gpt-der" style={{ fontWeight: 700 }}>{f(r.subtotal, 2)}</td><td /></tr>
                    <tr><td>Margen de seguridad</td><td>{f(r.datos.margen, 0)} %</td><td className="gpt-der">{f(r.margen, 2)}</td><td /></tr>
                    <tr><td style={{ fontWeight: 800 }}>Total</td><td>Repartido en {f(r.datos.horasFuncionamiento, 0)} h de funcionamiento</td><td className="gpt-der" style={{ fontWeight: 800 }}>{f(r.total, 2)}</td><td /></tr>
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      </div>
      {r && <SelectorEquipo key={r.potenciaKw} kwNecesario={r.potenciaKw} onElegir={onElegirEquipo} />}
    </div>
  );
}
