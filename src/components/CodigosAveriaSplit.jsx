import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search } from 'lucide-react';

/**
 * CodigosAveriaSplit — chuleta de códigos de avería de splits.
 *
 * AVISO IMPORTANTE de criterio: los códigos NO son un estándar. Cada
 * fabricante usa los suyos y además cambian entre gamas y años. Por eso esto
 * se plantea como una chuleta para orientarse rápido en obra, y en pantalla se
 * dice claramente que hay que confirmarlo con el manual del equipo. Lo que sí
 * es universal —y va primero— es la familia de avería y qué comprobar.
 */

/** Lo que sí vale para cualquier marca: por dónde empezar según el síntoma. */
const FAMILIAS = [
  {
    familia: 'Sonda de temperatura',
    letras: 'F· / P1-P2 / C· / H2·',
    sintoma: 'Arranca y para solo, no enfría, marca temperaturas imposibles.',
    revisar: 'Mide la resistencia de la sonda en frío y caliente (NTC 10k a 25 °C). Mira el conector: casi siempre es el conector suelto o el cable rozado, no la sonda.',
  },
  {
    familia: 'Comunicación interior ↔ exterior',
    letras: 'U4 / E5 / CH05 / H11 / E101',
    sintoma: 'La interior enciende pero la exterior no arranca, o se para a los minutos.',
    revisar: 'Cable de interconexión (sección, apriete y que no haya empalmes en la canaleta), polaridad y tensión entre bornes de comunicación. Muchas veces es humedad en la regleta.',
  },
  {
    familia: 'Alta presión / condensación',
    letras: 'E1 / H98 / P· / E403',
    sintoma: 'Corta a los pocos minutos, la exterior se calienta mucho.',
    revisar: 'Batería exterior sucia, ventilador exterior parado o lento, exceso de carga, obstrucción o falta de aire alrededor de la máquina.',
  },
  {
    familia: 'Baja presión / falta de gas',
    letras: 'E3 / U0 / E428 / F91',
    sintoma: 'Enfría poco, la tubería fina se escarcha, el compresor trabaja seguido.',
    revisar: 'Fuga (busca por las tuercas y la batería), recalentamiento alto y subenfriamiento bajo. NO cargues sin buscar la fuga antes.',
  },
  {
    familia: 'Antihielo / congelación del evaporador',
    letras: 'E2 / H99 / P6',
    sintoma: 'La interior se llena de hielo y deja de dar aire.',
    revisar: 'Filtros de aire sucios, ventilador interior lento, poca carga de gas o sonda de batería mal colocada.',
  },
  {
    familia: 'Temperatura de descarga alta',
    letras: 'F3 / H30 / F97 / E416',
    sintoma: 'Para en caliente y tarda en rearmar.',
    revisar: 'Falta de gas, válvula de expansión/EEV mal, o compresor forzado. Mide la temperatura del tubo de descarga.',
  },
  {
    familia: 'Sobrecorriente / protección del compresor',
    letras: 'E5 / CH21-22 / F98 / E320',
    sintoma: 'Salta al arrancar o a los pocos segundos.',
    revisar: 'Tensión de red en el arranque, condensador de arranque, apriete de bornes, y consumo real con pinza frente al RLA de la placa.',
  },
  {
    familia: 'Motor de ventilador (interior o exterior)',
    letras: 'A6 / E7 / H19 / H97 / E154',
    sintoma: 'No sale aire o la exterior no ventila aunque el compresor gira.',
    revisar: 'Que la turbina gire a mano sin rozar, conector del motor y tensión de salida de la placa. En motores DC, no lo des por muerto sin comprobar la placa.',
  },
  {
    familia: 'Drenaje / bomba de condensados',
    letras: 'P4 / P5 / CH04',
    sintoma: 'Gotea o se para al rato de funcionar.',
    revisar: 'Desagüe atascado o sin pendiente, flotador sucio y bomba agarrotada.',
  },
  {
    familia: 'Placa / inverter / EEPROM',
    letras: 'L· / H6 / CH09 / F90-F96',
    sintoma: 'Errores raros, se repite tras desconectar y volver a conectar.',
    revisar: 'Antes de pedir placa: tensión de alimentación, tierra y que no haya entrado agua o bichos. Es la avería que más se diagnostica de más.',
  },
];

/**
 * Códigos por marca. Chuleta de campo, NO sustituye al manual del equipo:
 * el mismo código cambia de significado entre gamas y años del mismo fabricante.
 */
const POR_MARCA = {
  'Genéricos (Haier, Hisense, Midea, Kaysun…)': [
    ['E1', 'Protección de alta presión'],
    ['E2', 'Protección antihielo del evaporador'],
    ['E3', 'Protección de baja presión / falta de gas'],
    ['E4', 'Temperatura de descarga demasiado alta'],
    ['E5', 'Sobrecorriente o tensión de red baja'],
    ['E6', 'Fallo de comunicación interior–exterior'],
    ['F1', 'Sonda de ambiente interior'],
    ['F2', 'Sonda de batería interior (evaporador)'],
    ['F3', 'Sonda de ambiente exterior'],
    ['F4', 'Sonda de batería exterior (condensador)'],
    ['F5', 'Sonda de descarga del compresor'],
  ],
  'Daikin': [
    ['U0', 'Falta de refrigerante'],
    ['U4', 'Fallo de comunicación entre interior y exterior'],
    ['UF', 'Tuberías o cableado mal conectados entre unidades'],
    ['A6', 'Fallo del motor del ventilador interior'],
    ['E7', 'Fallo del motor del ventilador exterior'],
    ['F3', 'Temperatura de descarga demasiado alta'],
    ['H6', 'Fallo del detector de posición del compresor'],
    ['L5', 'Sobrecorriente en el inverter'],
    ['C4 / C9', 'Sonda de batería / sonda de aspiración'],
  ],
  'Mitsubishi Electric': [
    ['P1', 'Sonda de ambiente interior'],
    ['P2', 'Sonda de tubería del interior'],
    ['P4', 'Flotador de drenaje activado'],
    ['P5', 'Fallo de la bomba de drenaje'],
    ['P6', 'Protección por congelación o sobrecalentamiento'],
    ['P8', 'Temperatura de tubería fuera de rango'],
    ['E0 – E9', 'Fallos de comunicación (mando, interior, exterior)'],
    ['U2', 'Temperatura de descarga alta / falta de gas'],
    ['UP', 'Sobrecorriente del compresor'],
  ],
  'LG': [
    ['CH01', 'Sonda de ambiente interior'],
    ['CH02', 'Sonda de tubería de entrada del interior'],
    ['CH03', 'Fallo de comunicación con el mando'],
    ['CH04', 'Bomba de drenaje'],
    ['CH05', 'Comunicación interior – exterior'],
    ['CH06', 'Sonda de tubería de salida del interior'],
    ['CH09', 'EEPROM de la placa interior'],
    ['CH21', 'Sobrecorriente del IPM (inverter)'],
    ['CH22', 'Sobrecorriente medida por el CT'],
    ['CH41', 'Sonda de descarga del compresor'],
  ],
  'Samsung': [
    ['E101', 'Sin comunicación entre interior y exterior'],
    ['E121', 'Sonda de ambiente interior'],
    ['E122', 'Sonda de entrada del evaporador'],
    ['E154', 'Fallo del ventilador interior'],
    ['E163', 'EEPROM de la unidad interior'],
    ['E221', 'Sonda de ambiente exterior'],
    ['E237', 'Sonda del condensador'],
    ['E251', 'Sonda de descarga'],
    ['E320', 'OLP: protección de sobrecarga del compresor'],
    ['E416', 'Descarga sobrecalentada'],
    ['E428', 'Baja presión / falta de refrigerante'],
  ],
  'Panasonic': [
    ['H11', 'Comunicación interior – exterior'],
    ['H14', 'Sonda de aspiración del interior'],
    ['H16', 'Transformador de corriente (CT)'],
    ['H19', 'Motor del ventilador interior'],
    ['H23', 'Sonda del evaporador'],
    ['H27', 'Sonda de ambiente exterior'],
    ['H28', 'Sonda del condensador'],
    ['H30', 'Sonda de descarga'],
    ['H97', 'Motor del ventilador exterior'],
    ['H98', 'Protección por alta presión'],
    ['H99', 'Congelación de la unidad interior'],
    ['F11', 'Válvula de 4 vías'],
    ['F91', 'Ciclo frigorífico anormal (falta de gas)'],
    ['F97', 'Temperatura de descarga alta'],
    ['F98', 'Protección por sobrecorriente'],
  ],
};

export default function CodigosAveriaSplit() {
  const [marca, setMarca] = useState('Genéricos (Haier, Hisense, Midea, Kaysun…)');
  const [busca, setBusca] = useState('');

  const q = busca.trim().toLowerCase();

  // Al buscar se mira en TODAS las marcas: en obra se tiene el código en el
  // display y muchas veces no se sabe ni de qué marca es la máquina.
  const resultados = useMemo(() => {
    if (!q) return null;
    const salida = [];
    for (const [m, lista] of Object.entries(POR_MARCA)) {
      for (const [codigo, significado] of lista) {
        if (codigo.toLowerCase().includes(q) || significado.toLowerCase().includes(q)) {
          salida.push({ marca: m, codigo, significado });
        }
      }
    }
    return salida;
  }, [q]);

  const familiasFiltradas = useMemo(() => {
    if (!q) return FAMILIAS;
    return FAMILIAS.filter(f =>
      f.familia.toLowerCase().includes(q) ||
      f.letras.toLowerCase().includes(q) ||
      f.sintoma.toLowerCase().includes(q) ||
      f.revisar.toLowerCase().includes(q)
    );
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Los códigos <b>no son un estándar</b>: cada fabricante usa los suyos y cambian
          entre gamas y años. Esto sirve para orientarse rápido en la obra;
          <b> confirma siempre el código en el manual del equipo</b> antes de cambiar
          nada o pedir una pieza.
        </span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Busca un código (E5, U4, CH21…) o un síntoma (ventilador, gas, drenaje…)"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Resultados de la búsqueda, entre todas las marcas */}
      {resultados && (
        <div className="bg-white rounded-xl shadow p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">
            {resultados.length > 0
              ? `${resultados.length} coincidencia${resultados.length === 1 ? '' : 's'} en todas las marcas`
              : 'Ningún código coincide'}
          </p>
          {resultados.length > 0 ? (
            <div className="space-y-1.5">
              {resultados.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm border-b last:border-0 pb-1.5">
                  <span className="font-mono font-bold text-blue-700 min-w-[64px]">{r.codigo}</span>
                  <span className="flex-1 text-slate-700">{r.significado}</span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{r.marca.split(' (')[0]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Prueba con la familia de avería de abajo: aunque el código no esté en la lista,
              el síntoma te lleva igual al sitio.
            </p>
          )}
        </div>
      )}

      {/* Lo universal: familias de avería */}
      <div className="bg-white rounded-xl shadow p-3">
        <p className="text-xs font-bold text-slate-700 mb-1">Por familia de avería (vale para cualquier marca)</p>
        <p className="text-[10px] text-slate-500 mb-2">
          Aunque no encuentres el código, el síntoma te dice por dónde empezar.
        </p>
        <div className="space-y-2">
          {familiasFiltradas.map((f, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-2.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800">{f.familia}</p>
                <p className="text-[10px] font-mono text-blue-600">{f.letras}</p>
              </div>
              <p className="text-[11px] text-slate-600 mt-1"><b>Síntoma:</b> {f.sintoma}</p>
              <p className="text-[11px] text-slate-600"><b>Comprueba:</b> {f.revisar}</p>
            </div>
          ))}
          {familiasFiltradas.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Nada coincide con esa búsqueda.</p>
          )}
        </div>
      </div>

      {/* Por marca */}
      <div className="bg-white rounded-xl shadow p-3">
        <p className="text-xs font-bold text-slate-700 mb-2">Por marca</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.keys(POR_MARCA).map(m => (
            <button
              key={m}
              onClick={() => setMarca(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                marca === m ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              {m.split(' (')[0]}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {POR_MARCA[marca].map(([codigo, significado], i) => (
            <div key={i} className="flex items-start gap-2 text-sm border-b last:border-0 pb-1.5">
              <span className="font-mono font-bold text-blue-700 min-w-[72px]">{codigo}</span>
              <span className="flex-1 text-slate-700">{significado}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Lista de los más frecuentes, no completa. Cada equipo tiene su tabla en el manual
          de servicio y en la etiqueta de la unidad.
        </p>
      </div>
    </div>
  );
}
