import React from 'react';
import { renderToString } from 'react-dom/server';
import Vista3D from '@/components/plano_frigorifico/Vista3DPlanoFrigorifico';
import PlanoCanvas from '@/components/plano_frigorifico/PlanoCanvas';
import PlanoPaleta from '@/components/plano_frigorifico/PlanoPaleta';
import PlanoBarraSuperior from '@/components/plano_frigorifico/PlanoBarraSuperior';
import PlanoFrigorifico from '@/pages/PlanoFrigorifico';

function t(name, el) {
  try {
    const html = renderToString(el);
    console.log(`OK  ${name} (${html.length} chars)`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    console.log((e.stack || '').split('\n').slice(0, 8).join('\n'));
  }
}

t('Vista3D compact', React.createElement(Vista3D, { walls: [], elements: [], scale: 50, compact: true }));
t('Vista3D full', React.createElement(Vista3D, { walls: [], elements: [], scale: 50, compact: false }));
t('PlanoCanvas', React.createElement(PlanoCanvas, { walls: [], elements: [], connections: [], selectedId: null, mode: 'select', activeElement: null, connectType: 'refrigerante', polyline: false, scale: 50, gridMeters: 1, snapMode: 'libre', capasVisibles: {}, onChange: () => {}, fullscreen: false }));
t('PlanoPaleta', React.createElement(PlanoPaleta, { mode: 'select', activeType: null, connectType: 'refrigerante', onPick: () => {}, extraElementos: [] }));
t('PlanoBarraSuperior', React.createElement(PlanoBarraSuperior, { mode: 'select', activeType: null, connectType: 'refrigerante', onPick: () => {}, extraPorCat: {} }));
t('PlanoFrigorifico', React.createElement(PlanoFrigorifico, {}));