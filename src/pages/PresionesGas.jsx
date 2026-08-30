import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gauge, Thermometer, Scale, AlertTriangle, ArrowRight, Wrench } from 'lucide-react';
import {
  GASES, APLICACIONES, gas as buscarGas, presionA, temperaturaA,
  presionesDeTrabajo, calcularCarga,
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
 */

const AMBIENTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];

function Fila({ etiqueta, valor, fuerte }) {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
      <span className="text-[11px] text-gray-500 flex-shrink-0">{etiqueta}</span>
      <span className={`text-[11px] text-right ${fuerte ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{valor}</span>
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
    () => (lectura.trim() ? temperaturaA(idGas, String(lectura).replace(',', '.')) : null),
    [idGas, lectura],
  );

  const carga = useMemo(
    () => calcularCarga({ cargaFabrica, metrosIncluidos, metrosReales, gramosPorMetro, cargaActual, restarSiCorta }),
    [cargaFabrica, metrosIncluidos, metrosReales, gramosPorMetro, cargaActual, restarSiCorta],
  );

  // Lo que arrastra la carga total: toneladas de CO₂ y control de fugas.
  const tCO2 = carga.completo ? toneladasCO2(idGas, carga.total / 1000) : null;

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
          <strong> a la temperatura que haya</strong>: el mismo R-410A con la carga perfecta marca 225 psi a
          25 °C y 336 psi a 40 °C. Y la de aspiración depende de a qué temperatura evapore la instalación.
          Por eso aquí eliges gas, tipo de instalación y ambiente, y sale lo tuyo.
        </p>
      </div>

      {/* ── Elegir gas e instalación ── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">1. Qué máquina tienes delante</CardTitle></CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">Gas refrigerante</label>
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
                <p className="text-lg font-bold" data-prueba="aspiracion">
                  {trabajo.evapMin.relativa} – {trabajo.evapMax.relativa} bar
                </p>
                <p className="text-xs text-gray-600">{trabajo.evapMin.psi} – {trabajo.evapMax.psi} psi</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Evaporando entre {trabajo.aplicacion.evaporacion[0]} y {trabajo.aplicacion.evaporacion[1]} °C
                </p>
              </div>
              <div className="border rounded-lg p-2.5 bg-white">
                <p className="text-[11px] font-bold text-red-700 mb-1">Alta (descarga)</p>
                <p className="text-lg font-bold" data-prueba="alta">
                  {trabajo.condMin.relativa} – {trabajo.condMax.relativa} bar
                </p>
                <p className="text-xs text-gray-600">{trabajo.condMin.psi} – {trabajo.condMax.psi} psi</p>
                <p className="text-[10px] text-gray-400 mt-1">{trabajo.aplicacion.condensacion}</p>
              </div>
              <div className="border rounded-lg p-2.5 bg-white">
                <p className="text-[11px] font-bold text-gray-700 mb-1">En reposo (parada)</p>
                <p className="text-lg font-bold" data-prueba="reposo">{trabajo.reposo.relativa} bar</p>
                <p className="text-xs text-gray-600">{trabajo.reposo.psi} psi</p>
                <p className="text-[10px] text-gray-400 mt-1">Saturación a {trabajo.ambiente} °C</p>
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
                <p className="text-[10px] text-gray-500">Ebullición del gas</p>
                <p className="text-sm font-semibold">{g.ebullicion} °C</p>
              </div>
            </div>

            {trabajo.aplicacion.nota && (
              <p className="text-[11px] text-gray-500 mt-2">{trabajo.aplicacion.nota}</p>
            )}
            {g.glide > 0 && (
              <p className="text-[11px] text-amber-800 mt-1">
                <strong>Deslizamiento de {g.glide} K:</strong> es una mezcla. Cárgala en fase líquida, y
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
              placeholder="bar que marca" className="w-40" />
            <span className="text-xs text-gray-500">bar (los que lee el manómetro)</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-lg font-bold" data-prueba="temp-saturacion">
              {deLaLectura?.fueraDeTabla ? 'Fuera de la tabla'
                : deLaLectura ? `${deLaLectura.temperatura} °C` : '—'}
            </span>
            {deLaLectura && !deLaLectura.fueraDeTabla && (
              <span className="text-xs text-gray-500">de saturación con {g.nombre}</span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Con esta temperatura y la del tubo sacas el recalentamiento: temperatura del tubo de aspiración
            menos esta. {g.glide > 0 && 'Ojo, con esta mezcla usa el valor de rocío del fabricante.'}
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
            <table className="w-full text-xs" data-prueba="tabla-pt">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1.5 text-left">Temperatura</th>
                  <th className="p-1.5 text-right">bar (manómetro)</th>
                  <th className="p-1.5 text-right">psi</th>
                  <th className="p-1.5 text-right">bar absolutos</th>
                </tr>
              </thead>
              <tbody>
                {g.tabla.map(([t]) => {
                  const p = presionA(idGas, t);
                  const esAmbiente = Number(ambiente) === t;
                  return (
                    <tr key={t} className={`border-b ${esAmbiente ? 'bg-sky-50 font-semibold' : ''}`}>
                      <td className="p-1.5">{t} °C{esAmbiente ? ' ← ambiente' : ''}</td>
                      <td className="p-1.5 text-right">{p.relativa}</td>
                      <td className="p-1.5 text-right">{p.psi}</td>
                      <td className="p-1.5 text-right text-gray-400">{p.absoluta}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Valores de referencia de las tablas de saturación, redondeados a lo que se lee en un manómetro.
            En mezclas con deslizamiento se da el punto de burbuja. Para un cálculo fino, la tabla del
            fabricante del gas.
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
