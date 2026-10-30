import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Type, RotateCcw, Minus, Plus } from 'lucide-react';
import {
  GROSORES, TAMANO_MAX, TAMANO_MIN, AJUSTES_POR_DEFECTO,
  aplicarFuente, esPorDefecto, estiloDe, fuentePorId, gruposDeFuentes,
  guardarFuente, leerFuente, nombreDeTamano, tamanoValido,
} from '@/lib/tipoDeFuente';

/**
 * Elegir el tipo de letra de todo el programa.
 *
 * Se aplica según se toca, sin botón de guardar: se ve en el momento sobre la
 * propia pantalla, que es la única forma de saber si un tamaño te sirve.
 * Queda guardado en este aparato — el móvil en la furgoneta no pide el mismo
 * tamaño que el ordenador de la oficina.
 */
export default function TipoDeFuentePanel() {
  const [cfg, setCfg] = useState(() => leerFuente());

  useEffect(() => { aplicarFuente(cfg); guardarFuente(cfg); }, [cfg]);

  const cambiar = (parche) => setCfg((c) => ({ ...c, ...parche }));
  const mover = (delta) => cambiar({ tamano: tamanoValido(cfg.tamano + delta) });
  const elegida = fuentePorId(cfg.fuente);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="w-5 h-5" />Tipo de Fuente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600">
          Cambia la letra de todo el programa. Se nota al momento y se queda
          guardado en este aparato; el móvil y el ordenador pueden llevar
          tamaños distintos.
        </p>

        {/* Tipo de letra */}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="fuente-familia">Tipo de letra</label>
          <Select value={cfg.fuente} onValueChange={(v) => cambiar({ fuente: v })}>
            <SelectTrigger id="fuente-familia" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {gruposDeFuentes().map(({ grupo, fuentes }) => (
                <SelectGroup key={grupo}>
                  <SelectLabel>{grupo}</SelectLabel>
                  {fuentes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span style={{ fontFamily: f.familia }}>{f.nombre}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">{elegida.nota}</p>
        </div>

        {/* Tamaño */}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="fuente-tamano">
            Tamaño de letra — {nombreDeTamano(cfg.tamano)} ({cfg.tamano} px)
          </label>
          <div className="flex items-center gap-3">
            <Button
              type="button" variant="outline" size="icon" aria-label="Reducir el tamaño"
              onClick={() => mover(-1)} disabled={cfg.tamano <= TAMANO_MIN}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <input
              id="fuente-tamano"
              type="range"
              min={TAMANO_MIN}
              max={TAMANO_MAX}
              step={1}
              value={cfg.tamano}
              onChange={(e) => cambiar({ tamano: tamanoValido(e.target.value) })}
              className="flex-1 accent-blue-600"
            />
            <Button
              type="button" variant="outline" size="icon" aria-label="Aumentar el tamaño"
              onClick={() => mover(1)} disabled={cfg.tamano >= TAMANO_MAX}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grosor y cursiva */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="fuente-grosor">Grosor</label>
            <Select value={cfg.grosor} onValueChange={(v) => cambiar({ grosor: v })}>
              <SelectTrigger id="fuente-grosor" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GROSORES.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span style={{ fontWeight: g.peso }}>{g.nombre}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Marca el texto normal sin tocar lo que ya está en negrita, para
              que se siga distinguiendo un título de un párrafo.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Cursiva</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={cfg.cursiva ? 'outline' : 'default'}
                className="flex-1"
                onClick={() => cambiar({ cursiva: false })}
                aria-pressed={!cfg.cursiva}
              >
                Normal
              </Button>
              <Button
                type="button"
                variant={cfg.cursiva ? 'default' : 'outline'}
                className="flex-1 italic"
                onClick={() => cambiar({ cursiva: true })}
                aria-pressed={cfg.cursiva}
              >
                Cursiva
              </Button>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="rounded-lg border bg-gray-50 p-4" data-prueba="vista-previa-fuente">
          <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Así se va a ver</p>
          <div style={estiloDe(cfg)}>
            <p style={{ fontWeight: 700, fontSize: '1.15em', marginBottom: 4 }}>
              Parte de trabajo nº 2026-114
            </p>
            <p style={{ marginBottom: 4 }}>
              Cliente: Frigoríficos del Sur, S.L. — Cámara de congelado nº 3
            </p>
            <p>
              Recalentamiento 7,5 K · Subenfriamiento 4 K · R-449A · 12,4 kg
            </p>
          </div>
        </div>

        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          Esto es la letra <strong>de la pantalla</strong>. La de los presupuestos,
          partes y facturas que imprimes se ajusta aparte, en la pestaña
          <strong> Impresión</strong>; y la de las tarjetas de visita, dentro de
          cada tarjeta (<strong>Tarjetas de Visita → Diseño</strong>).
        </p>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Si algo se ve descuadrado, vuelve a dejarlo como estaba y no pasa nada.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCfg({ ...AJUSTES_POR_DEFECTO })}
            disabled={esPorDefecto(cfg)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />Dejarlo como estaba
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
