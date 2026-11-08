import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Visor3D, Panel, Cajetin } from '@/componentes/tema';

const aNumero = (t, def) => {
  const n = parseFloat(String(t).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : def;
};

function Medida({ etiqueta, valor, onCambio }) {
  return (
    <label className="gpt-campo gpt-campo--cifra" style={{ minWidth: 120 }}>
      {etiqueta}
      <input type="text" inputMode="decimal" value={valor} onChange={(e) => onCambio(e.target.value.replace(/[^0-9,.]/g, ''))} />
    </label>
  );
}

/** Visor 3D de la cámara a partir de sus medidas interiores. */
export default function Visor3DGPT() {
  const [t, setT] = useState({ largo: '4', ancho: '3', alto: '2,6', puerta: '1' });
  const largo = aNumero(t.largo, 4), ancho = aNumero(t.ancho, 3), alto = aNumero(t.alto, 2.6), puerta = aNumero(t.puerta, 1);
  const volumen = largo * ancho * alto;
  const coma = (n, d = 1) => n.toFixed(d).replace('.', ',');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Cajetin
        etiquetaAccesible="Datos de la cámara"
        campos={[
          { etiqueta: 'Pantalla', valor: 'Visor 3D de cámara', titulo: true, doble: true },
          { etiqueta: 'Volumen interior', valor: coma(volumen) + ' m³' },
          { etiqueta: 'Superficie', valor: coma(largo * ancho) + ' m²' },
        ]}
      />
      <Panel titulo="Medidas interiores" variante="fuerte">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <Medida etiqueta="Largo (m)" valor={t.largo} onCambio={(v) => setT({ ...t, largo: v })} />
          <Medida etiqueta="Ancho (m)" valor={t.ancho} onCambio={(v) => setT({ ...t, ancho: v })} />
          <Medida etiqueta="Alto (m)" valor={t.alto} onCambio={(v) => setT({ ...t, alto: v })} />
          <Medida etiqueta="Puerta (m)" valor={t.puerta} onCambio={(v) => setT({ ...t, puerta: v })} />
          <Link to="/CalculoCamaraGPT" className="gpt-boton">Calcular la carga</Link>
        </div>
      </Panel>
      <Visor3D largo={largo} ancho={ancho} alto={alto} puerta={puerta} />
    </div>
  );
}
