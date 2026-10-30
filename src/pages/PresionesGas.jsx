import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gauge, Thermometer, Scale, AlertTriangle, ArrowRight, Wrench } from 'lucide-react';
import {
  GASES, APLICACIONES, gas as buscarGas, presionA, temperaturaA,
  presionesDeTrabajo, calcularCarga, tablaPT, temperaturasDeTabla,
} from '@/lib/presionesRefrigerante';
import { TIPOS_EQUIPO } from '@/lib/modelosDocumentos';
import { toneladasCO2, periodicidadFugas } from '@/lib/refrigerantes';

/**
 * PresionesGas — presiones de trabajo y cálculo de carga.
 *
 * Dos herramientas que van juntas porque se usan a la vez delante de la
 * máquina: saber qué presión te toca, y saber cuánto gas le falta o le sobra.
 *
 * La tabla NO da "un número por gas". Da la presión de saturación a cada
 * temperatura, que es lo único correcto: la presión en reposo es la del
 * ambiente que haya ese día, y la de aspiración depende de a qué temperatura
 * evapore la instalación. Un número fijo te hace cargar de más en agosto.
 *
 * Los valores salen de las propiedades termodinámicas exactas de cada gas
 * (CoolProp), no de tablas tecleadas. En las mezclas con deslizamiento se dan las
 * dos columnas, burbuja y rocío, porque a una misma presión hay dos temperaturas.
 */

const AMBIENTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];

/** Número con coma decimal española. */
const num = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Entero con signo menos tipográfico para que no se confunda con un guion. */
const entero = (n) => String(Math.round(n) + 0).replace('-', '−');
const bar = (n) => num(Math.round(n * 100) / 100 + 0, 2).replace('-', '−');

function Fila({ etiqueta, valor, fuerte }) {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
      <span className="text-[11px] text-gray-500 flex-shrink-0">{etiqueta}</span>
      <span className={`text-[11px] text-right ${fuerte ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{valor}</span>
    </div>
  );
}

/** Texto de un intervalo de presiones; `null` si alguno de los extremos queda fuera de la tabla del gas. */
function intervalo(a, b) {
  if (!a || !b || a.fueraDeTabla || b.fueraDeTabla) return null;
  const ordenado = a.relativa <= b.relativa ? [a, b] : [b, a];
  return {
    bar: ordenado[0].relativa === ordenado[1].relativa ? bar(ordenado[0].relativa) : `${bar(ordenado[0].relativa)} – ${bar(ordenado[1].relativa)}`,
    psi: ordenado[0].psi === ordenado[1].psi ? entero(ordenado[0].psi) : `${entero(ordenado[0].psi)} – ${entero(ordenado[1].psi)}`,
    vacio: ordenado[0].relativa < 0,
  };
}

function FueraDeTabla({ gas }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500">Fuera de la tabla del gas</p>
      {gas.id === 'R-744' && (
        <p className="text-[10px] text-gray-500 mt-1">
          Con esta temperatura el CO₂ está cerca o por encima de su punto crítico (31 °C): trabaja en transcrítico y la presión
          la manda la regulación de la instalación, no la temperatura.
        </p>
      )}
    </div>
  );
}

export default function PresionesGas() {
  const [idGas, setIdGas] = useState('R-410A');
  const [idApp, setIdApp] = useState('clima');
  const [ambiente, setAmbiente] = useState('30');
  const [lectura, setLectura] = useState('');

  // Carga
  const [tipoMaquina, setTipoMaquina] = useState('');
  const [cargaFabrica, setCargaFabrica] = useState('');
  const [metrosIncluidos, setMetrosIncluidos] = useState('5');
  const [metrosReales, setMetrosReales] = useState('');
  const [gramosPorMetro, setGramosPorMetro] = useState('');
  const [cargaActual, setCargaActual] = useState('');
  const [restarSiCorta, setRestarSiCorta] = useState(false);

  const g = buscarGas(idGas);
  const trabajo = useMemo(
    () => presionesDeTrabajo(idGas, idApp, Number(ambiente) || 30),
    [idGas, idApp, ambiente],
  );
  const deLaLectura = useMemo(
    () => (lectura.trim() ? temperaturaA(idGas, lectura) : null),
    [idGas, lectura],
  );

  // Tabla P–T del gas elegido, de 5 en 5 K dentro de lo que cubren los datos.
  const filasPT = useMemo(() => {
    const temps = temperaturasDeTabla(idGas);
    if (!temps.length) return [];
    return tablaPT(idGas, { desde: temps[0], hasta: temps[temps.length - 1], paso: 5 });
  }, [idGas]);

  const carga = useMemo(
    () => calcularCarga({ cargaFabrica, metrosIncluidos, metrosReales, gramosPorMetro, cargaActual, restarSiCorta }),
    [cargaFabrica, metrosIncluidos, metrosReales, gramosPorMetro, cargaActual, restarSiCorta],
  );

  // Lo que arrastra la carga total: toneladas de CO₂ y control de fugas.
  const tCO2 = carga.completo ? toneladasCO2(idGas, carga.total / 1000) : null;

  // El ejemplo de la cabecera sale de la propia tabla, así no puede quedarse desfasado.
  const ejemplo25 = presionA('R-410A', 25, 'burbuja');
  const ejemplo40 = presionA('R-410A', 40, 'burbuja');

  const aspiracion = trabajo ? intervalo(trabajo.evapMin, trabajo.evapMax) : null;
  const alta = trabajo ? intervalo(trabajo.condMin, trabajo.condMax) : null;
  const reposo = trabajo?.reposo && !trabajo.reposo.fueraDeTabla ? trabajo.reposo : null;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-700 rounded-xl">
          <Gauge className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Presiones de trabajo y carga de gas</h1>
          <p className="text-sm text-gray-500">
            Qué presión te toca según el gas, la instalación y el ambiente de hoy — y cuánto gas hay que
            añadir o sacar. Funciona sin cobertura.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900">
          <strong>No existe «la presión» de un gas.</strong> La presión en reposo es la de saturación
          <strong> a la temperatura que haya</strong>: el mismo R-410A con la carga perfecta marca {ejemplo25.psi} psi a
          25 °C y {ejemplo40.psi} psi a 40 °C. Y la de aspiración depende de a qué temperatura evapore la instalación.
          Por eso aquí eliges gas, tipo de instalación y ambiente, y sale lo tuyo.
        </p>
      </div>

      {/* ── Elegir gas e instalación ── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">1. Qué máquina tienes delante</CardTitle></CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">Gas refrigerante ({GASES.length} gases)</label>
              <Select value={idGas} onValueChange={setIdGas}>
                <SelectTrigger data-prueba="gas-presion"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {GASES.map((x) => (
                    <SelectItem key={x.id} value={x.id}>{x.nombre} — {x.familia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tipo de instalación</label>
              <Select value={idApp} onValueChange={setIdApp}>
                <SelectTrigger data-prueba="aplicacion"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {APLICACIONES.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Temperatura ambiente ahora mismo</label>
              <Select value={String(ambiente)} onValueChange={setAmbiente}>
                <SelectTrigger data-prueba="ambiente"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AMBIENTES.map((t) => <SelectItem key={t} value={String(t)}>{t} °C</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {g?.aviso && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 mt-2" data-prueba="aviso-gas">
              {g.aviso}
            </p>
          )}
          {g?.composicion && (
            <p className="text-[10px] text-gray-500 mt-1.5" data-prueba="composicion-gas">
              Composición (en masa): {g.composicion.replace(/(\d)\.(\d)/g, '$1,$2')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Las presiones que le tocan ── */}
      {trabajo && (
        <Card className="border-sky-200" data-prueba="presiones">
          <CardHeader className="pb-2 bg-sky-50">
            <CardTitle className="text-sm">
              2. Presiones que le tocan a un {trabajo.aplicacion.nombre.toLowerCase()} con {g.nombre} a {trabajo.ambiente} °C
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border rounded-lg p-2.5 bg-white">
                <p className="text-[11px] font-bold text-blue-700 mb-1">Aspiración (baja)</p>
                {aspiracion ? (
                  <>
                    <p className="text-lg font-bold" data-prueba="aspiracion">{aspiracion.bar} bar</p>
                    <p className="text-xs text-gray-600">{aspiracion.psi} psi{aspiracion.vacio ? ' (negativo = vacío)' : ''}</p>
                  </>
                ) : <FueraDeTabla gas={g} />}
                <p className="text-[10px] text-gray-400 mt-1">
                  Evaporando entre {trabajo.aplicacion.evaporacion[0]} y {trabajo.aplicacion.evaporacion[1]} °C
                  {g.zeotropo ? ' (rocío)' : ''}
                </p>
              </div>
              <div className="border rounded-lg p-2.5 bg-white">
                <p className="text-[11px] font-bold text-red-700 mb-1">Alta (descarga)</p>
                {alta ? (
                  <>
                    <p className="text-lg font-bold" data-prueba="alta">{alta.bar} bar</p>
                    <p className="text-xs text-gray-600">{alta.psi} psi</p>
                  </>
                ) : <FueraDeTabla gas={g} />}
                <p className="text-[10px] text-gray-400 mt-1">
                  Condensando a {trabajo.tCondensacion[0]} – {trabajo.tCondensacion[1]} °C{g.zeotropo ? ' (rocío)' : ''}
                  {' · '}{trabajo.aplicacion.condensacion}
                </p>
              </div>
              <div className="border rounded-lg p-2.5 bg-white">
                <p className="text-[11px] font-bold text-gray-700 mb-1">En reposo (parada)</p>
                {reposo ? (
                  <>
                    <p className="text-lg font-bold" data-prueba="reposo">{bar(reposo.relativa)} bar</p>
                    <p className="text-xs text-gray-600">{entero(reposo.psi)} psi</p>
                  </>
                ) : <FueraDeTabla gas={g} />}
                <p className="text-[10px] text-gray-400 mt-1">Saturación a {trabajo.ambiente} °C{g.zeotropo ? ' (burbuja)' : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <div className="border rounded p-2 bg-gray-50">
                <p className="text-[10px] text-gray-500">Recalentamiento</p>
                <p className="text-sm font-semibold">{trabajo.aplicacion.recalentamiento[0]} – {trabajo.aplicacion.recalentamiento[1]} K</p>
              </div>
              <div className="border rounded p-2 bg-gray-50">
                <p className="text-[10px] text-gray-500">Subenfriamiento</p>
                <p className="text-sm font-semibold">{trabajo.aplicacion.subenfriamiento[0]} – {trabajo.aplicacion.subenfriamiento[1]} K</p>
              </div>
              <div className="border rounded p-2 bg-gray-50">
                <p className="text-[10px] text-gray-500">Salto de aire</p>
                <p className="text-sm font-semibold">{trabajo.aplicacion.saltoAire}</p>
              </div>
              <div className="border rounded p-2 bg-gray-50">
                <p className="text-[10px] text-gray-500">{g.ebullicion === null ? 'Punto crítico' : 'Ebullición a 1 atm'}</p>
                <p className="text-sm font-semibold">
                  {g.ebullicion === null ? `${num(g.tCritica, 0)} °C · ${num(g.pCritica, 1)} bar` : `${num(g.ebullicion, 1).replace('-', '−')} °C`}
                </p>
              </div>
            </div>

            {trabajo.aplicacion.nota && (
              <p className="text-[11px] text-gray-500 mt-2">{trabajo.aplicacion.nota}</p>
            )}
            {g.glide > 0 && g.zeotropo && (
              <p className="text-[11px] text-amber-800 mt-1">
                <strong>Deslizamiento de {num(g.glide, 1)} K:</strong> es una mezcla. Cárgala en fase líquida, y
                para el recalentamiento usa la temperatura de rocío, no la de burbuja.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Del manómetro a la temperatura ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">3. Tengo el manómetro puesto: ¿a qué temperatura evapora?</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Input data-prueba="lectura" value={lectura} onChange={(e) => setLectura(e.target.value)}
              inputMode="decimal" placeholder="bar que marca" className="w-40" />
            <span className="text-xs text-gray-500">bar (los que lee el manómetro)</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-lg font-bold" data-prueba="temp-saturacion">
              {deLaLectura?.fueraDeTabla ? 'Fuera de la tabla'
                : deLaLectura ? `${num(deLaLectura.temperatura, 1).replace('-', '−')} °C` : '—'}
            </span>
            {deLaLectura && !deLaLectura.fueraDeTabla && (
              <span className="text-xs text-gray-500">
                {deLaLectura.zeotropo ? 'de rocío' : 'de saturación'} con {g.nombre}
              </span>
            )}
          </div>
          {deLaLectura && !deLaLectura.fueraDeTabla && deLaLectura.burbuja !== null && (
            <p className="text-xs text-gray-700 mt-1.5" data-prueba="temp-burbuja">
              Es una mezcla con deslizamiento: a esa presión el <strong>rocío</strong> está a{' '}
              {num(deLaLectura.temperatura, 1).replace('-', '−')} °C (para el recalentamiento) y la <strong>burbuja</strong> a{' '}
              {num(deLaLectura.burbuja, 1).replace('-', '−')} °C (para el subenfriamiento).
            </p>
          )}
          <p className="text-[11px] text-gray-500 mt-1.5">
            Con esta temperatura y la del tubo sacas el recalentamiento: temperatura del tubo de aspiración
            menos esta. {g.zeotropo && 'En el lado de alta, para el subenfriamiento, usa la de burbuja.'}
          </p>
        </CardContent>
      </Card>

      {/* ── Tabla presión–temperatura ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-sky-600" />
            Tabla presión–temperatura de {g.nombre}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="overflow-x-auto">
            <table className="w-full max-w-none text-xs" data-prueba="tabla-pt">
              <thead>
                {g.zeotropo ? (
                  <>
                    <tr className="bg-gray-100">
                      <th rowSpan={2} className="p-1.5 text-left align-bottom">Temperatura</th>
                      <th colSpan={2} className="p-1.5 text-center border-l">Burbuja (líquido)</th>
                      <th colSpan={2} className="p-1.5 text-center border-l">Rocío (vapor)</th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="p-1.5 text-right border-l">bar (man.)</th>
                      <th className="p-1.5 text-right">psi</th>
                      <th className="p-1.5 text-right border-l">bar (man.)</th>
                      <th className="p-1.5 text-right">psi</th>
                    </tr>
                  </>
                ) : (
                  <tr className="bg-gray-100">
                    <th className="p-1.5 text-left">Temperatura</th>
                    <th className="p-1.5 text-right">bar (manómetro)</th>
                    <th className="p-1.5 text-right">psi</th>
                    <th className="p-1.5 text-right">bar absolutos</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filasPT.map((f) => {
                  const esAmbiente = Number(ambiente) === f.t;
                  const b = f.burbuja;
                  const r = f.rocio;
                  const celda = (m, campo, fmt) => (m ? fmt(m[campo]) : '—');
                  return (
                    <tr key={f.t} className={`border-b ${esAmbiente ? 'bg-sky-50 font-semibold' : ''}`}>
                      <td className="p-1.5 whitespace-nowrap">{String(f.t).replace('-', '−')} °C{esAmbiente ? ' ← ambiente' : ''}</td>
                      {g.zeotropo ? (
                        <>
                          <td className="p-1.5 text-right border-l tabular-nums">{celda(b, 'relativa', bar)}</td>
                          <td className="p-1.5 text-right tabular-nums">{celda(b, 'psi', entero)}</td>
                          <td className="p-1.5 text-right border-l tabular-nums">{celda(r, 'relativa', bar)}</td>
                          <td className="p-1.5 text-right tabular-nums">{celda(r, 'psi', entero)}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-1.5 text-right tabular-nums">{celda(b, 'relativa', bar)}</td>
                          <td className="p-1.5 text-right tabular-nums">{celda(b, 'psi', entero)}</td>
                          <td className="p-1.5 text-right text-gray-400 tabular-nums">{celda(b, 'absoluta', bar)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Presiones de saturación calculadas con las ecuaciones de estado de referencia (CoolProp), en bar de
            manómetro (la atmósfera ya descontada); los valores negativos son vacío. {g.zeotropo
              ? 'Mezcla con deslizamiento: en cada fila la temperatura es la de burbuja o la de rocío según la columna. Evaporación y recalentamiento, con rocío; subenfriamiento, con burbuja.'
              : 'En una mezcla casi azeotrópica (deslizamiento menor de 0,3 K) no hay diferencia práctica entre burbuja y rocío.'}
            {' '}Una tabla comercial de fabricante puede diferir unas décimas de bar; para un cálculo fino, la del fabricante del gas.
          </p>
        </CardContent>
      </Card>

      {/* ── Cálculo de carga ── */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2 bg-emerald-50">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-700" />
            4. ¿Le falta o le sobra gas?
          </CardTitle>
          <p className="text-[11px] text-gray-600">
            Los gramos por metro y la precarga los pone el fabricante en la placa o en el manual: cambian
            con el modelo y con el diámetro de la línea. Aquí se hace la cuenta, que es donde se falla.
          </p>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">Tipo de máquina</label>
              <Select value={tipoMaquina} onValueChange={setTipoMaquina}>
                <SelectTrigger data-prueba="tipo-maq"><SelectValue placeholder="Split, cassette..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {TIPOS_EQUIPO.flatMap((grp) => grp.tipos).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Carga de fábrica (g)</label>
              <Input data-prueba="carga-fabrica" value={cargaFabrica} onChange={(e) => setCargaFabrica(e.target.value)} placeholder="ej: 1000" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Metros que cubre esa carga</label>
              <Input data-prueba="metros-incluidos" value={metrosIncluidos} onChange={(e) => setMetrosIncluidos(e.target.value)} placeholder="ej: 5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Metros de línea montados</label>
              <Input data-prueba="metros-reales" value={metrosReales} onChange={(e) => setMetrosReales(e.target.value)} placeholder="ej: 12" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Gramos por metro</label>
              <Input data-prueba="gramos-metro" value={gramosPorMetro} onChange={(e) => setGramosPorMetro(e.target.value)} placeholder="ej: 20" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Lo que tiene ahora (g) — si lo has pesado</label>
              <Input data-prueba="carga-actual" value={cargaActual} onChange={(e) => setCargaActual(e.target.value)} placeholder="opcional" />
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input type="checkbox" data-prueba="restar-corta" checked={restarSiCorta} onChange={(e) => setRestarSiCorta(e.target.checked)} />
            Mi fabricante manda descontar gas si la línea es más corta que la precarga
          </label>

          {!carga.completo ? (
            <p className="text-xs text-gray-500" data-prueba="faltan-datos">
              Para hacer la cuenta falta {carga.faltan.join(', ')}.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="border rounded-lg p-2.5 bg-white">
                <p className="text-[11px] font-bold text-gray-700 mb-1">Carga que le toca</p>
                <Fila etiqueta="Carga de fábrica" valor={`${carga.cargaFabrica} g`} />
                <Fila etiqueta="Metros de más sobre la precarga" valor={`${carga.metrosDeMas} m`} />
                <Fila etiqueta="Gas por la línea de más" valor={`${carga.extra} g`} />
                <Fila etiqueta="Cuenta" valor={carga.formula} />
                <Fila etiqueta="TOTAL que le corresponde" valor={`${carga.total} g  (${carga.totalKg} kg)`} fuerte />
              </div>

              {carga.accion && (
                <div
                  data-prueba="veredicto"
                  className={`rounded-lg border p-3 ${
                    carga.accion === 'anadir' ? 'bg-blue-50 border-blue-300'
                      : carga.accion === 'sacar' ? 'bg-orange-50 border-orange-300'
                        : 'bg-emerald-50 border-emerald-300'}`}
                >
                  <p className="text-base font-bold">
                    {carga.accion === 'anadir' && '➕ '}
                    {carga.accion === 'sacar' && '➖ '}
                    {carga.accion === 'nada' && '✓ '}
                    {carga.mensaje}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1">{carga.formulaDiferencia}</p>
                </div>
              )}

              {tCO2 !== null && (
                <div className="border rounded-lg p-2.5 bg-white">
                  <p className="text-[11px] font-bold text-gray-700 mb-1">Lo que arrastra esa carga</p>
                  <Fila etiqueta="Toneladas equivalentes de CO₂" valor={`${tCO2} t CO₂e`} />
                  <Fila etiqueta="Control de fugas" valor={periodicidadFugas(tCO2)} />
                </div>
              )}

              {carga.avisos.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 space-y-1" data-prueba="avisos-carga">
                  {carga.avisos.map((a, i) => (
                    <p key={i} className="text-[11px] text-amber-900 flex gap-1.5">
                      <Wrench className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{a}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-gray-500">
            Cargar por peso es lo correcto: la báscula no miente y las presiones dependen del ambiente. Usa
            las presiones para comprobar que la máquina trabaja bien <em>después</em> de cargar, no para
            decidir cuánto gas echar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
