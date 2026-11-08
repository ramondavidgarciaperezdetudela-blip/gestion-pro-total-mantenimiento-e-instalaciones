import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { listarModulos, listarConectores } from '@/lib/iaModulos/datos';
import { navigateTo } from '@/utils';
import SandboxModulo from '@/components/centroIA/SandboxModulo';

/** Ejecuta un módulo del Centro de IA con los permisos que se le concedieron. */
export default function ModuloIA() {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get('id');
  const [estado, setEstado] = useState({ cargando: true, modulo: null, conectores: [] });

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [ms, cs] = await Promise.all([listarModulos(), listarConectores()]);
      if (vivo) setEstado({ cargando: false, modulo: ms.find((m) => m.id === id) || null, conectores: cs.filter((c) => c.activo !== false) });
    })();
    return () => { vivo = false; };
  }, [id]);

  const { cargando, modulo, conectores } = estado;
  return (
    <div className="mx-auto max-w-5xl p-3 sm:p-6">
      <NavBar title={modulo?.nombre || 'Módulo'} />
      {cargando && <p className="text-sm text-slate-500">Cargando…</p>}
      {!cargando && !modulo && <p className="rounded border p-4 text-sm" data-prueba="modulo-no-existe">Este módulo ya no existe.</p>}
      {modulo && !modulo.activo && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">Este módulo está desactivado. <Button size="sm" variant="outline" className="ml-2" onClick={() => navigateTo('CentroIA')}>Ir al Centro de IA</Button></div>
      )}
      {modulo?.activo && (
        <>
          <h1 className="mb-1 text-xl font-bold" data-prueba="titulo-modulo">{modulo.nombre}</h1>
          {modulo.descripcion && <p className="mb-3 text-sm text-slate-600">{modulo.descripcion}</p>}
          <SandboxModulo modulo={modulo} concedidos={modulo.permisos_concedidos || []} conectores={conectores} alturaMin={320} />
        </>
      )}
    </div>
  );
}
