import React from 'react';
import { renderToString } from 'react-dom/server';
import Vista3D from '@/components/plano_frigorifico/Vista3DPlanoFrigorifico';
import PlanoCanvas from '@/components/plano_frigorifico/PlanoCanvas';
import PlanoPaleta from '@/components/plano_frigorifico/PlanoPaleta';
import PlanoBarraSuperior from '@/components/plano_frigorifico/PlanoBarraSuperior';
import BuscadorCliente from '@/components/BuscadorCliente';
import PlanoFrigorifico from '@/pages/PlanoFrigorifico';
function t(name, el){try{const h=renderToString(el);console.log('OK  '+name+' ('+h.length+')');}catch(e){console.log('FAIL '+name+': '+e.message);console.log((e.stack||'').split('\n').slice(0,6).join('\n'));}}
const paginaContactos = { items: [{id:'1',name:'Juan',company_name:'ACME'}], has_more:false, next_cursor:null };
t('BuscadorCliente (array)', React.createElement(BuscadorCliente, { contacts: [{id:'1',name:'Juan'}], value: '1' }));
t('BuscadorCliente (pagina)', React.createElement(BuscadorCliente, { contacts: paginaContactos, value: '1' }));
t('BuscadorCliente (undefined)', React.createElement(BuscadorCliente, { contacts: undefined, value: '' }));
t('Vista3D compact', React.createElement(Vista3D, { walls: [], elements: [], scale: 50, compact: true }));
t('Vista3D full', React.createElement(Vista3D, { walls: [], elements: [], scale: 50, compact: false }));
t('PlanoCanvas', React.createElement(PlanoCanvas, { walls: [], elements: [], connections: [], selectedId: null, mode: 'select', activeElement: null, connectType: 'refrigerante', polyline: false, scale: 50, gridMeters: 1, snapMode: 'libre', capasVisibles: {}, onChange: () => {}, fullscreen: false }));
t('PlanoPaleta', React.createElement(PlanoPaleta, { mode: 'select', activeType: null, connectType: 'refrigerante', onPick: () => {}, extraElementos: [] }));
t('PlanoBarraSuperior', React.createElement(PlanoBarraSuperior, { mode: 'select', activeType: null, connectType: 'refrigerante', onPick: () => {}, extraPorCat: {} }));
t('PlanoFrigorifico', React.createElement(PlanoFrigorifico, {}));