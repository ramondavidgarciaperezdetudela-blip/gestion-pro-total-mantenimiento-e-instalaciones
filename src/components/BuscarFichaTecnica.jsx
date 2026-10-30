import React, { useRef, useState } from 'react';
import { Wand2, Loader2, ClipboardPaste, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  deLaFichaPegada, deLaReferencia, fusionar, resumenDeLoEncontrado, encargoParaLaIA,
} from '@/lib/fichaTecnica';
import { iaActivada } from '@/lib/modoSinIA';
import { base44 } from '@/api/base44Client';

/**
 * Rellenar los datos técnicos sin teclearlos.
 *
 * Se intenta por orden, de lo seguro a lo dudoso:
 *   1. Lo pegado del fabricante. Sin internet y sin gastar nada.
 *   2. La referencia sola, por el patrón del código.
 *   3. La IA, solo si está encendida y solo para lo que falte.
 *
 * Nunca pisa lo escrito a mano, y dice de dónde ha salido cada cosa: en una
 * hoja que se firma hay que poder distinguir un dato leído de la placa de uno
 * que ha sugerido un programa.
 */
export default function BuscarFichaTecnica({ form, setForm }) {
  const [pegado, setPegado] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // AQUÍ ESTABA EL FALLO QUE BORRABA LO ESCRITO A MANO.
  //
  // La ficha llega como propiedad, así que dentro de una función asíncrona se
  // queda congelada en el valor que tenía al pulsar el botón. Buscar por la
  // referencia hace DOS aplicaciones: primero lo que se deduce del código y
  // después, tras esperar a la IA, lo que ella conteste. La segunda partía de
  // aquella foto vieja y guardaba la ficha entera con ella: se llevaba por
  // delante lo aplicado en el primer paso Y todo lo que se hubiera escrito a
  // mano durante la espera, que son varios segundos tecleando datos de placa.
  //
  // Con una referencia siempre se parte de lo último: se actualiza en cada
  // pintada (por si se ha escrito algo) y también nada más aplicar (por si se
  // aplica dos veces seguidas sin que dé tiempo a repintar).
  const ultimaFicha = useRef(form);
  ultimaFicha.current = form;

  const aplicar = (encontrado, origen) => {
    const { datos, puestos } = fusionar(ultimaFicha.current, encontrado);
    if (puestos > 0) {
      ultimaFicha.current = datos;
      setForm(datos);
    }
    setResultado({
      ok: puestos > 0,
      puestos,
      origen,
      campos: resumenDeLoEncontrado(encontrado),
    });
    return puestos;
  };

  const desdeLoPegado = () => {
    const encontrado = deLaFichaPegada(pegado);
    if (!Object.keys(encontrado).length) {
      setResultado({ ok: false, texto: 'De ese texto no he sacado nada. Pega la ficha del fabricante entera, con sus etiquetas.' });
      return;
    }
    if (aplicar(encontrado, 'lo que has pegado') > 0) {
      setPegado('');
      setAbierto(false);
    }
  };

  const desdeLaReferencia = async () => {
    const ref = (ultimaFicha.current.compressor_ref || '').trim();
    if (!ref) {
      setResultado({ ok: false, texto: 'Escribe primero la referencia del compresor.' });
      return;
    }
    setBuscando(true);
    setResultado(null);
    try {
      // Primero lo que se sabe sin preguntar a nadie.
      const porPatron = deLaReferencia(ref);
      let puestos = Object.keys(porPatron).length ? aplicar(porPatron, 'la referencia') : 0;

      // Y si sigue faltando y la IA está encendida, se le pregunta.
      const faltan = ['compressor_brand', 'compressor_application', 'compressor_supply',
        'compressor_refrigerants', 'compressor_technology']
        .filter((c) => !ultimaFicha.current[c] && !porPatron[c]);

      if (faltan.length && iaActivada()) {
        const r = await base44.integrations.Core.InvokeLLM({
          prompt: encargoParaLaIA(ref),
          response_json_schema: {
            type: 'object',
            properties: Object.fromEntries(
              ['compressor_brand', 'compressor_application', 'compressor_supply',
                'compressor_refrigerants', 'compressor_technology', 'compressor_power_hp']
                .map((c) => [c, { type: 'string' }]),
            ),
          },
        });
        const dela = typeof r === 'object' && r ? r : {};
        const limpio = {};
        for (const [k, v] of Object.entries(dela)) {
          if (typeof v === 'string' && v.trim() && !/^(no |desconocid|n\/a|-)/i.test(v.trim())) limpio[k] = v.trim();
        }
        if (Object.keys(limpio).length) puestos += aplicar(limpio, 'la IA (repásalo)');
      }

      if (puestos === 0) {
        setResultado({
          ok: false,
          texto: iaActivada()
            ? 'No he encontrado datos de esa referencia. Pega la ficha del fabricante y la reparto por casillas.'
            : 'De esa referencia no se deduce nada más. Pega la ficha del fabricante, o enciende la ayuda con IA en Configuración.',
        });
      }
    } catch (e) {
      setResultado({ ok: false, texto: String(e?.message || e) });
    }
    setBuscando(false);
  };

  return (
    <div className="space-y-2" data-prueba="buscar-ficha-tecnica">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={desdeLaReferencia}
          disabled={buscando}
          data-prueba="buscar-por-referencia"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          Buscar datos por la referencia
        </button>
        <button
          type="button"
          onClick={() => { setAbierto((v) => !v); setResultado(null); }}
          data-prueba="abrir-pegar-ficha"
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Pegar la ficha del fabricante
        </button>
      </div>

      {abierto && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-2">
          <p className="text-xs text-slate-500">
            Copia de la web del fabricante lo que ponga del compresor y pégalo aquí tal cual.
            Lo reparto por casillas. No hace falta internet.
          </p>
          <textarea
            rows={5}
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
            aria-label="Ficha del fabricante"
            data-prueba="texto-ficha"
            placeholder={'FH4518Y-XC3A\nMarca : FH2\nSolicitud : HBP\nVoltaje : 220-240V 1PH 50Hz\nRefrigerante : R-134a, R-513A\nTecnología del producto : Recíproco'}
            className="w-full rounded-lg border p-2 font-mono text-xs"
          />
          <button
            type="button"
            onClick={desdeLoPegado}
            disabled={!pegado.trim()}
            data-prueba="repartir-ficha"
            className="w-full rounded-lg bg-slate-800 p-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Repartir por casillas
          </button>
        </div>
      )}

      {resultado && (
        <div
          className={`flex items-start gap-2 rounded-lg p-2 text-xs ${resultado.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status"
          data-prueba="resultado-ficha"
        >
          {resultado.ok
            ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span className="min-w-0">
            {resultado.ok
              ? `Rellenadas ${resultado.puestos} casillas desde ${resultado.origen}: ${resultado.campos.join(', ')}. Lo que ya habías escrito no se ha tocado.`
              : resultado.texto}
          </span>
        </div>
      )}
    </div>
  );
}
