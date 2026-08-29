import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, Search, Phone, ExternalLink, ChevronLeft, Save, Wrench, X,
} from 'lucide-react';
import {
  MARCAS, FAMILIAS, marca as buscarMarca, buscar, cuantosCodigos,
  telefonosSat, guardarTelefonoSat, familia as buscarFamilia,
} from '@/lib/codigosError';
import { toast } from 'sonner';

/**
 * CodigosError — la chuleta de códigos de avería, por marca.
 *
 * Cómo se usa en obra: o entras por la marca y buscas el código dentro, o
 * escribes el código directamente y te dice en qué marcas existe. Lo segundo
 * es lo que más se usa, porque tienes el display delante y muchas veces ni
 * sabes de qué marca es la máquina.
 *
 * De cada código sale lo que significa y —lo importante— DÓNDE suele estar la
 * avería de verdad. Un "E5: sobrecorriente" no sirve de nada; "mide el consumo
 * con la pinza y compáralo con el RLA de la placa" sí.
 */

const COLOR_FAMILIA = {
  sonda: 'bg-sky-100 text-sky-800',
  comunicacion: 'bg-violet-100 text-violet-800',
  alta: 'bg-red-100 text-red-800',
  baja: 'bg-blue-100 text-blue-800',
  hielo: 'bg-cyan-100 text-cyan-800',
  descarga: 'bg-orange-100 text-orange-800',
  corriente: 'bg-amber-100 text-amber-800',
  ventilador: 'bg-emerald-100 text-emerald-800',
  drenaje: 'bg-teal-100 text-teal-800',
  placa: 'bg-slate-200 text-slate-800',
  aviso: 'bg-gray-100 text-gray-600',
};

function FichaCodigo({ cod, conMarca }) {
  const fam = buscarFamilia(cod.familia);
  return (
    <div className="border rounded-lg p-2.5 bg-white" data-prueba="codigo">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="font-mono font-bold text-sm bg-gray-900 text-white px-2 py-0.5 rounded">
          {cod.codigo}
        </span>
        {conMarca && <Badge variant="outline" className="text-[10px]">{cod.marca}</Badge>}
        {fam && (
          <Badge className={`text-[10px] ${COLOR_FAMILIA[cod.familia] || 'bg-gray-100 text-gray-700'}`}>
            {fam.nombre}
          </Badge>
        )}
      </div>
      <p className="text-sm text-gray-900 mt-1.5 font-medium">{cod.significado}</p>
      <p className="text-xs text-gray-600 mt-1 flex gap-1.5">
        <Wrench className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-500" />
        <span><strong>Dónde mirar:</strong> {cod.donde}</span>
      </p>
    </div>
  );
}

export default function CodigosError() {
  const [idMarca, setIdMarca] = useState(null);
  const [busca, setBusca] = useState('');
  const [telefonos, setTelefonos] = useState(telefonosSat());
  const [editandoTel, setEditandoTel] = useState(null);
  const [telTexto, setTelTexto] = useState('');

  const laMarca = idMarca ? buscarMarca(idMarca) : null;

  // Dentro de una marca se busca solo en ella; fuera, en todas.
  const resultados = useMemo(
    () => (busca.trim() ? buscar(busca, idMarca) : []),
    [busca, idMarca],
  );

  const guardarTel = (id) => {
    setTelefonos(guardarTelefonoSat(id, telTexto));
    setEditandoTel(null);
    toast.success(telTexto.trim() ? 'Teléfono guardado' : 'Teléfono borrado');
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Códigos de error por marcas</h1>
          <p className="text-sm text-gray-500">
            {cuantosCodigos()} códigos de {MARCAS.length} marcas. Qué significa cada uno y dónde suele
            estar la avería. Funciona sin cobertura.
          </p>
        </div>
      </div>

      {/* El aviso va arriba y no se esconde: es lo más importante de la pantalla. */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900">
          <strong>Los códigos no son un estándar.</strong> Cada fabricante usa los suyos y los cambia entre
          gamas y años: el mismo «E1» es alta presión en una máquina y fallo de sonda en otra. Esto es una
          chuleta para orientarte rápido delante del equipo — <strong>antes de cambiar una pieza,
          confírmalo con el manual de esa máquina concreta</strong>.
        </p>
      </div>

      {/* Buscador. Siempre visible: es por donde se entra el 90 % de las veces. */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              data-prueba="buscar-codigo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={laMarca ? `Buscar código dentro de ${laMarca.nombre}…` : 'Escribe el código (E1, CH34, P4, H98…) o el síntoma (fuga, ventilador, sonda…)'}
              className="pl-9 pr-9"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {busca.trim() && (
            <p className="text-[11px] text-gray-500 mt-1.5" data-prueba="cuantos-resultados">
              {resultados.length === 0
                ? 'No sale nada con eso. Prueba con menos letras, o mira la familia de avería más abajo.'
                : `${resultados.length} ${resultados.length === 1 ? 'coincidencia' : 'coincidencias'}${laMarca ? ` en ${laMarca.nombre}` : ' en todas las marcas'}`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resultados de la búsqueda */}
      {busca.trim() && resultados.length > 0 && (
        <div className="space-y-2" data-prueba="resultados">
          {resultados.map((r, i) => (
            <FichaCodigo key={`${r.idMarca}-${r.codigo}-${i}`} cod={r} conMarca={!laMarca} />
          ))}
        </div>
      )}

      {/* Dentro de una marca */}
      {laMarca && !busca.trim() && (
        <Card data-prueba="ficha-marca">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIdMarca(null)} className="gap-1">
                  <ChevronLeft className="w-4 h-4" />Todas las marcas
                </Button>
                <CardTitle className="text-lg">{laMarca.nombre}</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {laMarca.soporte && (
                  <a href={laMarca.soporte} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 underline underline-offset-2 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
                    <ExternalLink className="w-3 h-3" />Soporte oficial
                  </a>
                )}
                {editandoTel === laMarca.id ? (
                  <div className="flex gap-1 items-center">
                    <Input data-prueba="tel-sat" value={telTexto} onChange={(e) => setTelTexto(e.target.value)}
                      placeholder="Teléfono del SAT" className="h-8 w-44 text-xs" />
                    <Button size="sm" className="h-8 px-2" onClick={() => guardarTel(laMarca.id)}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    data-prueba="btn-tel"
                    onClick={() => { setEditandoTel(laMarca.id); setTelTexto(telefonos[laMarca.id] || ''); }}
                    className="inline-flex items-center gap-1 text-[11px] border rounded px-2 py-1 hover:bg-gray-50"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {telefonos[laMarca.id] || 'Apuntar teléfono del SAT'}
                  </button>
                )}
              </div>
            </div>
            {(laMarca.plataforma || laMarca.nota) && (
              <p className="text-[11px] text-gray-600 mt-1">
                {laMarca.plataforma && <><strong>{laMarca.plataforma}</strong>{' '}</>}
                {laMarca.nota}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {laMarca.codigos.length === 0 ? (
              <p className="text-sm text-gray-500">
                Esta marca no tiene tabla propia aquí: usa la de la plataforma que monta, según lo que pone
                arriba. Busca el código en el buscador de esta pantalla y te saldrá en la marca que lo tenga.
              </p>
            ) : (
              laMarca.codigos.map((cod) => <FichaCodigo key={cod.codigo} cod={cod} />)
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de marcas */}
      {!laMarca && !busca.trim() && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Elige la marca</CardTitle></CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" data-prueba="lista-marcas">
                {MARCAS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setIdMarca(m.id)}
                    className="text-left px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    <p className="text-sm font-medium text-gray-900">{m.nombre}</p>
                    <p className="text-[10px] text-gray-400">
                      {m.codigos.length > 0 ? `${m.codigos.length} códigos` : 'Usa tabla de otra marca'}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Por síntoma, cuando el código no aparece o no se lee */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Si no tienes código, empieza por el síntoma</CardTitle>
              <p className="text-[11px] text-gray-500">Esto sí vale para cualquier marca.</p>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {FAMILIAS.map((f) => (
                <div key={f.id} className="border rounded-lg p-2.5 bg-white">
                  <Badge className={`text-[10px] mb-1 ${COLOR_FAMILIA[f.id] || ''}`}>{f.nombre}</Badge>
                  <p className="text-xs text-gray-700"><strong>Síntoma:</strong> {f.sintoma}</p>
                  <p className="text-xs text-gray-600 mt-0.5"><strong>Qué mirar:</strong> {f.revisar}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
