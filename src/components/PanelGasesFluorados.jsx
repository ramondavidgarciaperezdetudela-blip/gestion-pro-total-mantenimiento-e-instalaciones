import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, ExternalLink, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  calcular, parametros, guardarParametros, restaurarParametros,
  corregirPca, pcaDe, REFERENCIAS,
} from '@/lib/gasesFluorados';
import { toast } from 'sonner';

/**
 * PanelGasesFluorados — la cuenta entera, a la vista y comprobable.
 *
 * No enseña solo el resultado: enseña la fórmula, de dónde sale cada número y
 * con qué parámetros se ha calculado. Quien lo lea tiene que poder rehacerlo
 * con una calculadora y que le dé lo mismo. Si no, no sirve para defenderlo
 * ante nadie.
 *
 * Y todo lo que puede cambiar con una revisión del reglamento o de la ley se
 * corrige aquí mismo: el PCA de un gas, el tipo por unidad de PCA, el tope por
 * kilo y los umbrales de fugas. Así no hay que esperar a una versión nueva del
 * programa para calcular bien.
 */

function Dato({ etiqueta, valor, fuerte }) {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
      <span className="text-[11px] text-gray-500 flex-shrink-0">{etiqueta}</span>
      <span className={`text-[11px] text-right ${fuerte ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{valor}</span>
    </div>
  );
}

export default function PanelGasesFluorados({ gas, kilos, onInsertar, incluido }) {
  const [hermetico, setHermetico] = useState(false);
  const [conDetector, setConDetector] = useState(false);
  const [pcaManual, setPcaManual] = useState('');
  const [ajustes, setAjustes] = useState(false);
  const [cfg, setCfg] = useState(parametros());

  const r = useMemo(
    () => calcular({ gas, kilos, hermetico, conDetector, pcaManual: pcaManual || null }),
    [gas, kilos, hermetico, conDetector, pcaManual, cfg],
  );

  const pcaDelCatalogo = pcaDe(gas);

  const cambiarParametro = (grupo, clave, valor) => {
    const n = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(n)) return;
    setCfg(guardarParametros({ [grupo]: { [clave]: n } }));
  };

  const volverAFabrica = () => {
    if (!confirm('Se vuelve a los valores de fábrica del programa. ¿Seguro?')) return;
    setCfg(restaurarParametros());
    setPcaManual('');
    toast.success('Parámetros restaurados');
  };

  const fijarPca = () => {
    if (!gas) return;
    corregirPca(gas, pcaManual || null);
    setCfg({ ...parametros() });
    toast.success(pcaManual
      ? `PCA de ${gas} fijado en ${pcaManual} para todos los cálculos`
      : `PCA de ${gas} devuelto al del catálogo`);
  };

  const sinDatos = !r.toneladas;

  return (
    <Card className="border-amber-200" data-prueba="panel-fgas">
      <CardHeader className="pb-2 bg-amber-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-700" />
          Gases fluorados — impuesto y control de fugas
        </CardTitle>
        <p className="text-[11px] text-gray-500">
          Calculado con {r.nombreGas}{r.kilos ? ` y ${r.kilos} kg` : ''}. La cuenta está entera a la vista para poder comprobarla.
        </p>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {sinDatos ? (
          <p className="text-xs text-gray-500">
            {r.avisos[0] || 'Elige el gas y escribe la carga en kilos para ver el cálculo.'}
          </p>
        ) : (
          <>
            {/* Cómo es el equipo */}
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={hermetico} onChange={(e) => setHermetico(e.target.checked)} data-prueba="hermetico" />
                Equipo herméticamente sellado y etiquetado como tal
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={conDetector} onChange={(e) => setConDetector(e.target.checked)} data-prueba="detector" />
                Lleva sistema de detección de fugas
              </label>
            </div>

            {/* El cálculo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border rounded-lg p-2.5 bg-white">
                <p className="text-[11px] font-bold text-gray-700 mb-1">Carga y equivalencia</p>
                <Dato etiqueta="Gas" valor={r.nombreGas} />
                <Dato etiqueta="Familia / Seguridad" valor={[r.familia, r.seguridad].filter(Boolean).join(' · ')} />
                <Dato etiqueta={`PCA aplicado${r.origenPca === 'corregido' ? ' (corregido)' : ''}`} valor={r.pca} />
                <Dato etiqueta="Carga" valor={`${r.kilos} kg`} />
                <Dato etiqueta="Cálculo" valor={`${r.kilos} × ${r.pca} ÷ 1.000`} />
                <Dato etiqueta="Toneladas equivalentes de CO₂" valor={`${r.toneladas} t CO₂e`} fuerte />
              </div>

              <div className="border rounded-lg p-2.5 bg-white" data-prueba="bloque-fugas">
                <p className="text-[11px] font-bold text-gray-700 mb-1">Control de fugas</p>
                <Dato etiqueta="Umbral que aplica" valor={`${r.fugas.umbralAplicado} t CO₂e${r.fugas.hermetico ? ' (hermético)' : ''}`} />
                <Dato etiqueta="Periodicidad" valor={r.fugas.texto} fuerte />
                <Dato etiqueta="Sistema de detección" valor={r.fugas.conDetector ? 'Instalado' : (r.fugas.detectorObligatorio ? 'OBLIGATORIO — falta' : 'No exigido')} />
                <Dato etiqueta="Registros" valor={r.fugas.textoRegistro} />
              </div>

              <div className="border rounded-lg p-2.5 bg-white md:col-span-2" data-prueba="bloque-impuesto">
                <p className="text-[11px] font-bold text-gray-700 mb-1">Impuesto sobre los gases fluorados</p>
                {r.impuesto.sujeto ? (
                  <>
                    <Dato etiqueta="Tipo por unidad de PCA" valor={`${r.impuesto.tipoPorUnidadPca} €/kg`} />
                    <Dato etiqueta="Tipo sin tope" valor={`${r.pca} × ${r.impuesto.tipoPorUnidadPca} = ${r.impuesto.tipoSinTope} €/kg`} />
                    {r.impuesto.topeAplicado && (
                      <Dato etiqueta="Tope legal" valor={`Limitado a ${r.impuesto.topePorKilo} €/kg`} />
                    )}
                    <Dato etiqueta="Tipo aplicado" valor={`${r.impuesto.tipoAplicado} €/kg`} />
                    <Dato etiqueta="Importe del impuesto" valor={`${r.impuesto.cuota} €`} fuerte />
                    <Dato etiqueta="Fórmula" valor={r.impuesto.formula} />
                  </>
                ) : (
                  <Dato etiqueta="Situación" valor={`No sujeto. ${r.impuesto.motivoNoSujeto}`} fuerte />
                )}
                <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">{r.impuesto.quienLoPaga}</p>
              </div>
            </div>

            {/* Avisos */}
            {r.avisos.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 space-y-1" data-prueba="avisos-fgas">
                {r.avisos.map((a, i) => (
                  <p key={i} className="text-[11px] text-amber-900 flex gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </p>
                ))}
              </div>
            )}

            <Button size="sm" onClick={() => onInsertar(r)} className="bg-amber-600 hover:bg-amber-700">
              <Save className="w-3.5 h-3.5 mr-1" />
              {incluido ? 'Actualizar la ficha del documento' : 'Poner esta ficha en el documento'}
            </Button>
          </>
        )}

        {/* Contrastar y corregir */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] text-gray-500">
              Datos del programa con referencia <strong>{cfg.vigenciaDatos}</strong>.
              Los enlaces abren el <strong>texto consolidado vigente</strong>, así que recogen las revisiones posteriores.
            </p>
            <Button size="sm" variant="outline" onClick={() => setAjustes((v) => !v)} data-prueba="abrir-ajustes-fgas">
              {ajustes ? 'Ocultar los parámetros' : 'Corregir los parámetros'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {REFERENCIAS.map((ref) => (
              <a key={ref.id} href={ref.url} target="_blank" rel="noopener noreferrer"
                title={ref.detalle}
                className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 underline underline-offset-2 border border-blue-200 rounded px-1.5 py-0.5 hover:bg-blue-50">
                <ExternalLink className="w-3 h-3" />
                {ref.titulo.split(' — ')[0]}
              </a>
            ))}
          </div>

          {ajustes && (
            <div className="rounded-lg border bg-gray-50 p-2.5 space-y-2" data-prueba="ajustes-fgas">
              <p className="text-[11px] text-gray-600">
                Cuando una revisión cambie un valor, corrígelo aquí y el programa calculará con el nuevo.
                No hace falta esperar a una versión nueva.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500">PCA de {gas || 'este gas'} (catálogo: {pcaDelCatalogo.valor ?? '—'})</label>
                  <div className="flex gap-1">
                    <Input className="h-8 text-xs" data-prueba="pca-manual" value={pcaManual}
                      onChange={(e) => setPcaManual(e.target.value)} placeholder={String(pcaDelCatalogo.valor ?? '')} />
                    <Button size="sm" variant="outline" className="h-8 px-2 text-[11px]" onClick={fijarPca}>Fijar</Button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Tipo por unidad de PCA (€/kg)</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.impuesto.tipoPorUnidadPca}
                    onBlur={(e) => cambiarParametro('impuesto', 'tipoPorUnidadPca', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Tope por kilo (€)</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.impuesto.topePorKilo}
                    onBlur={(e) => cambiarParametro('impuesto', 'topePorKilo', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">PCA mínimo que tributa</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.impuesto.pcaMinimoSujeto}
                    onBlur={(e) => cambiarParametro('impuesto', 'pcaMinimoSujeto', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Umbral 12 meses (t CO₂e)</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.fugas.umbral12meses}
                    onBlur={(e) => cambiarParametro('fugas', 'umbral12meses', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Umbral 6 meses (t CO₂e)</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.fugas.umbral6meses}
                    onBlur={(e) => cambiarParametro('fugas', 'umbral6meses', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Umbral 3 meses (t CO₂e)</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.fugas.umbral3meses}
                    onBlur={(e) => cambiarParametro('fugas', 'umbral3meses', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Umbral equipos herméticos (t CO₂e)</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.fugas.umbralHermetico}
                    onBlur={(e) => cambiarParametro('fugas', 'umbralHermetico', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Referencia de los datos</label>
                  <Input className="h-8 text-xs" defaultValue={cfg.vigenciaDatos}
                    onBlur={(e) => setCfg(guardarParametros({ vigenciaDatos: e.target.value }))} />
                </div>
              </div>

              <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-600" onClick={volverAFabrica}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />Volver a los valores de fábrica
              </Button>
            </div>
          )}

          <p className="text-[10px] text-gray-400 leading-relaxed">
            Esto da la cuenta hecha y las referencias para comprobarla; no sustituye al texto oficial ni a tu gestoría.
            El impuesto lo autoliquidan fabricantes, importadores, adquirentes intracomunitarios y almacenistas:
            como empresa instaladora lo pagas dentro del precio de la botella. Antes de repercutir un importe en una
            factura o de presentar cualquier declaración, contrasta con el texto consolidado vigente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
