import React, { useState } from 'react';
import { ajustesClaude, guardarAjustesClaude, MODELOS } from '@/lib/iaModulos/claude';
import { ajustesGoogle, guardarAjustesGoogle } from '@/lib/imagenesProducto';

/** Claude con la clave de la propia empresa. */
export function SeccionAnthropic() {
  const [c, setC] = useState(ajustesClaude());
  const poner = (campo, valor) => setC(guardarAjustesClaude({ [campo]: valor }));
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3" data-prueba="seccion-anthropic">
      <p className="text-xs text-slate-600">
        <strong>Con tu cuenta de Anthropic:</strong> entra en <span className="font-mono">console.anthropic.com</span> con la cuenta que usas,
        crea una clave (empieza por <span className="font-mono">sk-ant-</span>) y pégala aquí. Las consultas se pagan con el saldo de esa cuenta.
        Anthropic no permite entrar con el usuario y contraseña de Claude.ai ni con una suscripción Pro/Max desde otros programas: solo con clave de la API.
        Si no hay internet o se acaba el saldo, el programa usa Ollama (sin límite y sin internet) cuando está instalado.
      </p>
      <label className="block text-xs font-medium text-slate-700">Clave de Anthropic
        <input type="password" autoComplete="off" className="mt-1 w-full rounded-lg border p-2 font-mono text-sm" placeholder="sk-ant-..." value={c.clave}
          onChange={(e) => poner('clave', e.target.value)} aria-label="Clave de Anthropic" data-prueba="ajustes-clave" />
        <span className="mt-1 block font-normal text-slate-400">Se guarda solo en este aparato y no entra en las copias de seguridad.</span>
      </label>
      <label className="block text-xs font-medium text-slate-700">Modelo
        <select className="mt-1 w-full rounded-lg border p-2 text-sm" value={c.modelo} onChange={(e) => poner('modelo', e.target.value)} aria-label="Modelo de Claude">
          {MODELOS.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </label>
    </div>
  );
}

/** Buscador de imágenes de tarifas para el navegador (en escritorio y móvil no hace falta). */
export function SeccionImagenes() {
  const [g, setG] = useState(ajustesGoogle());
  const poner = (campo, valor) => { const n = { ...g, [campo]: valor }; setG(n); guardarAjustesGoogle(n); };
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3" data-prueba="seccion-imagenes">
      <div className="text-sm font-medium text-slate-800">Imágenes de las tarifas de proveedores</div>
      <p className="text-xs text-slate-600">
        El programa busca la foto de cada artículo primero por el <b>código del proveedor</b> y, si no la encuentra, por el <b>nombre</b>. En la app de escritorio y en el móvil
        funciona sin configurar nada; la foto se guarda reducida dentro del artículo, así se sigue viendo sin conexión. Sin internet no puede buscar fotos nuevas.
        En el navegador hace falta un buscador propio (opcional): clave y motor de Google Programmable Search.
      </p>
      <details className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700" data-prueba="ayuda-google">
        <summary className="cursor-pointer font-medium">Cómo conseguir la clave y el buscador de Google (gratis, 100 búsquedas al día)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Entra en <span className="font-mono">programmablesearchengine.google.com</span> con tu cuenta de Google y pulsa <b>Añadir</b>.</li>
          <li>Ponle un nombre, elige <b>Buscar en toda la web</b> y crea el buscador. Dentro de su configuración activa <b>Búsqueda de imágenes</b>.</li>
          <li>Copia el <b>Identificador del motor de búsqueda</b> y pégalo abajo en «Identificador del buscador (cx)».</li>
          <li>Entra en <span className="font-mono">console.cloud.google.com</span>, crea un proyecto y activa la <b>Custom Search API</b> (Biblioteca de APIs).</li>
          <li>En <b>Credenciales</b> pulsa <b>Crear credenciales → Clave de API</b>, cópiala y pégala abajo en «Clave de Google».</li>
        </ol>
        <p className="mt-2">Con eso, el navegador busca directamente en Google. En la app de escritorio y en el móvil, además, se consultan Bing, DuckDuckGo, Google y Yandex sin necesidad de clave.</p>
      </details>
      <input className="w-full rounded-lg border p-2 font-mono text-sm" placeholder="Clave de Google (opcional, solo navegador)" type="password" autoComplete="off" value={g.clave || ''} onChange={(e) => poner('clave', e.target.value)} aria-label="Clave de Google" />
      <input className="w-full rounded-lg border p-2 font-mono text-sm" placeholder="Identificador del buscador (cx)" value={g.cx || ''} onChange={(e) => poner('cx', e.target.value)} aria-label="Identificador del buscador de Google" />
    </div>
  );
}
