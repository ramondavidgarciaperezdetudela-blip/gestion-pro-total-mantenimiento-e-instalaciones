import React from 'react';
import { Link } from 'react-router-dom';
import { CalculoCamara, Panel } from '@/componentes/tema';

/**
 * Cálculo de cámaras frigoríficas (método por componentes con entalpía real
 * del aire) con el selector de equipo. Los valores de renovaciones, calor de
 * respiración y el catálogo de equipos son de ejemplo hasta cargar las tablas
 * del fabricante que se use.
 */
export default function CalculoCamaraGPT() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Panel titulo="Cálculo de cámaras frigoríficas" variante="fuerte" tapa>
        <p className="gpt-secundario" style={{ margin: 0, fontSize: 14 }}>
          Rellena el recinto, las temperaturas y el producto: se calcula la carga por partidas y se propone el equipo.
          Para ver el recinto en tres dimensiones, abre el <Link to="/Visor3DGPT">visor 3D</Link>.
        </p>
      </Panel>
      <CalculoCamara />
    </div>
  );
}
