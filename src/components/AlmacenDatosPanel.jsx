import React from 'react';
import { Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leerConfig, MODOS } from '@/nube/config';
import { cambiarAlmacen } from '@/nube/PantallaNube';

/** Dónde se guardan los datos de esta instalación y cómo cambiarlo. */
export default function AlmacenDatosPanel() {
  const c = leerConfig() || { modo: 'base44' };
  const destino = c.url ? ` — ${c.url}` : '';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Dónde se guardan los datos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Ahora: <b>{MODOS[c.modo]}{destino}</b></p>
        <p className="text-muted-foreground">
          Puedes guardar los datos en Base44, solo en este dispositivo, en tu proyecto de Supabase o en un servidor propio
          (por ejemplo, un ordenador en casa). Los datos no se mueven solos: antes de cambiar, haz una copia en
          «Copia de seguridad» y después restáurala en el nuevo destino.
        </p>
        <Button size="sm" variant="outline" onClick={cambiarAlmacen} data-prueba="cambiar-almacen">Cambiar dónde se guardan los datos</Button>
      </CardContent>
    </Card>
  );
}
