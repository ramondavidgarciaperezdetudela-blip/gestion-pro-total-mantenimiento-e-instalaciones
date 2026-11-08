import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { describePermiso, esPermisoDelicado } from '@/lib/iaModulos/permisos';

/** Pide a la persona que apruebe lo que va a poder hacer un módulo. */
export default function PermisosDialog({ abierto, modulo, permisos = [], onCancelar, onAceptar, textoBoton = 'Dar permisos y activar' }) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o) onCancelar?.(); }}>
      <DialogContent data-prueba="dialogo-permisos">
        <DialogHeader>
          <DialogTitle>Permisos de «{modulo?.nombre}»</DialogTitle>
          <DialogDescription>
            {permisos.length ? 'Este módulo podrá hacer solo lo que ves aquí. Puedes quitarle los permisos cuando quieras.' : 'Este módulo no pide acceso a datos del programa.'}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {permisos.map((p) => (
            <li key={p} className={`rounded border px-3 py-2 ${esPermisoDelicado(p) ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
              {esPermisoDelicado(p) ? '⚠️ ' : ''}{describePermiso(p)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">Nunca tendrá acceso a usuarios, contraseñas, claves ni datos de la empresa protegidos.</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button onClick={onAceptar} data-prueba="aceptar-permisos">{textoBoton}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
