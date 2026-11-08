import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listarModulos, listarSkills, listarConectores, listarPeticiones } from '@/lib/iaModulos/datos';
import { iaLista } from '@/lib/iaModulos/iaCentro';
import ChatFuncion from '@/components/centroIA/ChatFuncion';
import PestanaModulos from '@/components/centroIA/PestanaModulos';
import PestanaSkills from '@/components/centroIA/PestanaSkills';
import PestanaConectores from '@/components/centroIA/PestanaConectores';
import PestanaComplementos from '@/components/centroIA/PestanaComplementos';
import PestanaPeticiones from '@/components/centroIA/PestanaPeticiones';
import PestanaAjustes from '@/components/centroIA/PestanaAjustes';

/**
 * Centro de IA — configura el programa con tus propias funciones:
 * módulos (pantallas nuevas), skills (instrucciones para la IA), conectores (otros servicios),
 * complementos (importar/exportar) y peticiones de cambio en el código.
 */
export default function CentroIA() {
  const [pestana, setPestana] = useState('chat');
  const [d, setD] = useState({ modulos: [], skills: [], conectores: [], peticiones: [] });
  const [cargado, setCargado] = useState(false);
  const [editando, setEditando] = useState(null);
  const [, refrescar] = useState(0);

  const cargar = useCallback(async () => {
    const [modulos, skills, conectores, peticiones] = await Promise.all([listarModulos(), listarSkills(), listarConectores(), listarPeticiones()]);
    setD({ modulos, skills, conectores, peticiones }); setCargado(true); refrescar((n) => n + 1);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const sinClave = !iaLista();
  return (
    <div className="mx-auto max-w-4xl p-3 sm:p-6">
      <NavBar title="Centro de IA" />
      <div className="mb-4 flex items-center gap-2"><Sparkles className="h-6 w-6 text-violet-600" /><h1 className="text-xl font-bold" data-prueba="titulo-centro-ia">Centro de IA</h1></div>
      {sinClave && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm" data-prueba="aviso-sin-clave">
          Para pedirle funciones a la IA hace falta elegir una IA: Claude con tu clave u Ollama (gratis, sin límite y sin internet). <button type="button" className="font-semibold underline" onClick={() => setPestana('ajustes')}>Elígela en Ajustes de IA</button>.
        </div>
      )}
      <Tabs value={pestana} onValueChange={setPestana}>
        <TabsList className="mb-3 flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="chat" data-pestana="chat">Pídele una función</TabsTrigger>
          <TabsTrigger value="modulos" data-pestana="modulos">Mis módulos ({d.modulos.length})</TabsTrigger>
          <TabsTrigger value="skills" data-pestana="skills">Skills ({d.skills.length})</TabsTrigger>
          <TabsTrigger value="conectores" data-pestana="conectores">Conectores ({d.conectores.length})</TabsTrigger>
          <TabsTrigger value="complementos" data-pestana="complementos">Complementos</TabsTrigger>
          <TabsTrigger value="peticiones" data-pestana="peticiones">Peticiones ({d.peticiones.length})</TabsTrigger>
          <TabsTrigger value="ajustes" data-pestana="ajustes">Ajustes de IA</TabsTrigger>
        </TabsList>
        {/* El chat se queda montado para no perder la conversación al cambiar de pestaña. */}
        <div hidden={pestana !== 'chat'}>
          <ChatFuncion skills={d.skills} conectores={d.conectores} moduloEditando={editando} onTerminarEdicion={() => setEditando(null)} onCambios={cargar} />
        </div>
        <TabsContent value="modulos"><PestanaModulos modulos={d.modulos} onCambios={cargar} onMejorar={(m) => { setEditando(m); setPestana('chat'); }} /></TabsContent>
        <TabsContent value="skills"><PestanaSkills skills={d.skills} onCambios={cargar} /></TabsContent>
        <TabsContent value="conectores"><PestanaConectores conectores={d.conectores} onCambios={cargar} /></TabsContent>
        <TabsContent value="complementos"><PestanaComplementos {...d} onCambios={cargar} /></TabsContent>
        <TabsContent value="peticiones"><PestanaPeticiones peticiones={d.peticiones} conectores={d.conectores} onCambios={cargar} /></TabsContent>
        <TabsContent value="ajustes"><PestanaAjustes onCambios={() => refrescar((n) => n + 1)} /></TabsContent>
      </Tabs>
      {!cargado && <p className="mt-2 text-xs text-slate-400">Cargando…</p>}
    </div>
  );
}
