import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from './Iconos.jsx';
import { AREAS } from './menu.js';
import { Estado } from './Basicos.jsx';

// Enlace por defecto. Si la app usa react-router, pasar Enlace={Link} y se usará "to".
function EnlaceBase({ href, children, ...resto }) {
  return <a href={href} {...resto}>{children}</a>;
}
function enlazar(Enlace, ruta, props, children) {
  const destino = Enlace === EnlaceBase ? { href: ruta } : { to: ruta };
  return <Enlace {...destino} {...props}>{children}</Enlace>;
}

// Barra lateral de escritorio con icono y nombre de cada área.
// Al pasar el ratón por un área (o enfocarla con el teclado) se abre a su derecha la lista de
// apartados: un solo clic en el apartado abre la pantalla. Pulsar el área abre su primer apartado.
const ANCHO_LATERAL = 248;
const BORDE_ENLACES = 236; // los enlaces acaban 12px antes del borde: la lista empieza pegada a ellos, sin hueco

export function MenuLateral({ areaActual, paginaActual, usuario, rol, Enlace = EnlaceBase, rutaInicio = '/' }) {
  const [vuelo, setVuelo] = useState(null); // { id, top, max }
  const cierre = useRef(null);

  const apertura = useRef(null);
  const cancelar = () => {
    if (cierre.current) { clearTimeout(cierre.current); cierre.current = null; }
    if (apertura.current) { clearTimeout(apertura.current); apertura.current = null; }
  };
  const cerrarPronto = () => { cancelar(); cierre.current = setTimeout(() => setVuelo(null), 300); };
  useEffect(() => () => cancelar(), []);

  // Si ya hay una lista abierta, el cambio de área espera un instante: así se puede ir en
  // diagonal hacia la lista sin que se abran las áreas que se cruzan por el camino.
  const abrir = (area, el, esperar) => {
    cancelar();
    if (!el || typeof window === 'undefined') return;
    if (esperar && vuelo && vuelo.id !== area.id) {
      apertura.current = setTimeout(() => { apertura.current = null; abrir(area, el, false); }, 160);
      return;
    }
    const r = el.getBoundingClientRect();
    const alto = window.innerHeight;
    const util = Math.min(area.apartados.length * 46 + 12, alto - 16);
    const top = Math.max(8, Math.min(r.top, alto - util - 8));
    setVuelo({ id: area.id, top, max: alto - top - 8 });
  };

  return (
    <nav aria-label="Menú principal" className="gpt-lateral" onKeyDown={(e) => { if (e.key === 'Escape') setVuelo(null); }}>
      <div className="gpt-barra__marca" style={{ padding: '0 12px 18px', fontSize: 18 }}>Gestión Pro Total</div>
      {enlazar(Enlace, rutaInicio, { 'aria-current': !areaActual ? 'page' : undefined, onMouseEnter: () => setVuelo(null) }, <><Icono nombre="cuadro" tam={22} />Cuadro general</>)}
      {AREAS.map((a) =>
        <span key={a.id} style={{ display: 'contents' }}>
          {enlazar(Enlace, a.apartados[0].ruta, {
            'aria-current': areaActual === a.id ? 'page' : undefined,
            'aria-haspopup': 'true',
            'aria-expanded': vuelo?.id === a.id ? 'true' : 'false',
            onMouseEnter: (e) => abrir(a, e.currentTarget, true),
            onFocus: (e) => abrir(a, e.currentTarget),
            onMouseLeave: cerrarPronto
          }, <><Icono nombre={a.icono} tam={22} />{a.texto}</>)}
          {areaActual === a.id && (
            <span className="gpt-lateral__sub" role="group" aria-label={'Apartados de ' + a.texto}>
              {a.apartados.map((ap) => (
                <span key={ap.id} style={{ display: 'contents' }}>
                  {enlazar(Enlace, ap.ruta, { 'aria-current': paginaActual === ap.id ? 'location' : undefined }, <span>{ap.texto}</span>)}
                </span>
              ))}
            </span>
          )}
        </span>
      )}
      {vuelo && (() => {
        const area = AREAS.find((x) => x.id === vuelo.id);
        if (!area) return null;
        // En el <body>: así no lo recorta la barra lateral (que tiene su propio desplazamiento).
        return createPortal(
          <div className="gpt-vuelo" role="menu" aria-label={'Apartados de ' + area.texto}
            style={{ position: 'fixed', left: BORDE_ENLACES, top: vuelo.top, maxHeight: vuelo.max }}
            onMouseEnter={cancelar} onMouseLeave={cerrarPronto}>
            <div className="gpt-vuelo__titulo">{area.texto}</div>
            {area.apartados.map((ap) => (
              <span key={ap.id} style={{ display: 'contents' }}>
                {enlazar(Enlace, ap.ruta, { role: 'menuitem', 'aria-current': paginaActual === ap.id ? 'location' : undefined, onClick: () => setVuelo(null) },
                  <><Icono nombre={ap.icono} tam={18} /><span>{ap.texto}</span></>)}
              </span>
            ))}
          </div>,
          document.body
        );
      })()}
      {usuario && (
        <div style={{ marginTop: 'auto', padding: '16px 12px 0', borderTop: '1px solid var(--gpt-grafito)', fontSize: 13, color: 'var(--gpt-texto-claro)' }}>
          <div style={{ color: 'var(--gpt-blanco)', fontWeight: 600, fontSize: 14 }}>{usuario}</div>
          {rol}
        </div>
      )}
    </nav>
  );
}

// Cuadro general: todas las áreas con sus apartados y el estado de hoy.
// estados: { reparto: { texto: '11 hoy' }, avisos: { texto: '1 urgente', tipo: 'urgente' }, ... }
export function CuadroGeneral({ estados = {}, Enlace = EnlaceBase }) {
  return (
    <div className="gpt-bloques">
      {AREAS.map((a) => (
        <section key={a.id} className="gpt-panel gpt-panel--con-tapa gpt-bloque" style={{ padding: 0 }} aria-labelledby={'area-' + a.id}>
          <div className="gpt-bloque__cabeza">
            <span className="gpt-bloque__icono"><Icono nombre={a.icono} tam={26} /></span>
            <h2 id={'area-' + a.id} className="gpt-titulo gpt-titulo--2">{a.texto}</h2>
          </div>
          <ul>
            {a.apartados.map((ap) => {
              const est = estados[ap.id];
              return (
                <li key={ap.id}>
                  {enlazar(Enlace, ap.ruta, {}, <>
                    <Icono nombre={ap.icono} tam={20} />
                    <span>{ap.texto}</span>
                    {est ? (est.tipo ? <Estado tipo={est.tipo}>{est.texto}</Estado> : <span className="gpt-etiqueta gpt-num">{est.texto}</span>)
                      : ap.detalle ? <span className="gpt-etiqueta">{ap.detalle}</span> : <span />}
                  </>)}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Menú del móvil: mosaico de áreas con el número de avisos de cada una.
// avisos: { operacion: 1, almacen: 3 }
export function MenuMovil({ avisos = {}, Enlace = EnlaceBase }) {
  return (
    <nav aria-label="Apartados" className="gpt-mosaico">
      {AREAS.map((a) =>
        <span key={a.id} style={{ display: 'contents' }}>
          {enlazar(Enlace, a.apartados[0].ruta, {}, <>
            <span className="gpt-bloque__icono" style={{ width: 42, height: 42 }}><Icono nombre={a.icono} tam={24} /></span>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <span>{a.texto}</span>
              {avisos[a.id] ? <Estado tipo="urgente">{avisos[a.id]}</Estado> : null}
            </span>
          </>)}
        </span>
      )}
    </nav>
  );
}

// Barra inferior fija del móvil.
const ACCESOS_TECNICO = [
  { id: 'hoy', texto: 'Hoy', icono: 'reparto', ruta: '/hoy' },
  { id: 'partes', texto: 'Partes', icono: 'partes', ruta: '/partes' },
  { id: 'material', texto: 'Material', icono: 'material', ruta: '/material' },
  { id: 'menu', texto: 'Menú', icono: 'cuadro', ruta: '/menu' }
];
export function BarraInferior({ actual = 'hoy', accesos = ACCESOS_TECNICO, Enlace = EnlaceBase }) {
  return (
    <nav aria-label="Accesos rápidos" className="gpt-barra-inferior">
      {accesos.map((a) =>
        <span key={a.id} style={{ display: 'contents' }}>
          {enlazar(Enlace, a.ruta, { 'aria-current': a.id === actual ? 'page' : undefined }, <><Icono nombre={a.icono} tam={20} />{a.texto}</>)}
        </span>
      )}
    </nav>
  );
}
