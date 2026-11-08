import ImportacionEnSegundoPlano from '@/components/ImportacionEnSegundoPlano';
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { precargarFrecuentes } from '@/lib/precarga';
import EnlaceRapido from '@/components/EnlaceRapido';
import { base44 } from '@/api/base44Client';
import { LogOut, Search, X } from 'lucide-react';
import NotificationsPanel from './components/NotificationsPanel';
import ThemeToggle from './components/ThemeToggle';
import GlobalSearch from './components/GlobalSearch';
import AIChat from './components/AIChat';
import QuickPriceDBAccess from './components/QuickPriceDBAccess';
import BackupProgressIndicator from './components/BackupProgressIndicator';
import DescargasGlobal from './components/DescargasGlobal';
import BarraNavegacion from './components/BarraNavegacion';
import AjusteRapidoLetra from './components/AjusteRapidoLetra';
import BotonesImprimirPantalla from './components/BotonesImprimirPantalla';
import {
  ProveedorTema, MenuLateral, MenuMovil, BarraInferior, BarraSuperior, FondoTecnico, Icono, AREAS, registrarModulos,
} from '@/componentes/tema';
import { ubicarPagina, FONDO_POR_PAGINA } from '@/componentes/tema/menu';
import { empresaParaTema, EVENTO_TEMA, guardarLocal, ajustesDeEmpresa } from '@/lib/temaEmpresa';

// Accesos fijos de la barra inferior del móvil (la del técnico).
const ACCESOS_MOVIL = [
  { id: 'TechnicianDay', texto: 'Hoy', icono: 'reparto', ruta: '/TechnicianDay' },
  { id: 'SAT', texto: 'Partes', icono: 'partes', ruta: '/SAT' },
  { id: 'Inventory', texto: 'Material', icono: 'material', ruta: '/Inventory' },
  { id: 'menu', texto: 'Menú', icono: 'cuadro', ruta: '#menu' },
];

// El Link de react-router deja pasar «to»; los accesos del móvil abren el menú.
function EnlaceMenu({ onAbrir }) {
  return function EnlaceDeMenu({ to, children, ...resto }) {
    if (to === '#menu') {
      return (
        <a href="#menu" {...resto} onClick={(e) => { e.preventDefault(); onAbrir(); }}>{children}</a>
      );
    }
    return <EnlaceRapido to={to} {...resto}>{children}</EnlaceRapido>;
  };
}

export default function Layout({ children, currentPageName }) {
  const contenidoRef = React.useRef(null);
  useEffect(() => { precargarFrecuentes(); }, []);
  // «Mis módulos»: el área del menú con los módulos activos del Centro de IA.
  const [, setVersionModulos] = useState(0);
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const { listarModulos, EVENTO_CAMBIOS } = await import('@/lib/iaModulos/datos');
        const lista = await listarModulos();
        if (!vivo) return;
        registrarModulos(lista.filter((m) => m.activo));
        setVersionModulos((v) => v + 1);
        window.removeEventListener(EVENTO_CAMBIOS, cargar);
        window.addEventListener(EVENTO_CAMBIOS, cargar);
      } catch { /* sin datos todavía */ }
    };
    cargar();
    return () => { vivo = false; };
  }, []);
  const location = useLocation();
  const [menuMovil, setMenuMovil] = useState(false);
  const [areaMovil, setAreaMovil] = useState(null);
  const [company, setCompany] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    // Precalentar cache y precargar páginas frecuentes después del primer render
    const t = setTimeout(() => {
      import('@/lib/prefetch').then(({ prefetchPages }) => prefetchPages());
    }, 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Si el servidor no responde (404 transitorio, sin conexión), no se puede
    // sacar el logo/nombre de empresa: no es motivo para tumbar toda la app.
    base44.entities.CompanySettings.list()
      .then((data) => { const arr = Array.isArray(data) ? data : (data?.items ?? []); if (arr.length > 0) setCompany(arr[0]); })
      .catch(() => { /* sin empresa cargada: el tema usa los valores por defecto */ });
    base44.auth.me?.()
      .then((u) => setUsuario(u))
      .catch(() => { /* sin usuario: el menú no enseña su nombre */ });
  }, []);

  // Cuando se cambia el logotipo o los fondos en Ajustes, se ve al momento.
  useEffect(() => {
    const alCambiar = (e) => { if (e.detail) setCompany((c) => ({ ...(c || {}), ...e.detail })); };
    window.addEventListener(EVENTO_TEMA, alCambiar);
    return () => window.removeEventListener(EVENTO_TEMA, alCambiar);
  }, []);

  useEffect(() => {
    // Se recuerda en el aparato para que el aspecto no parpadee al abrir.
    if (company) guardarLocal(ajustesDeEmpresa(company, {}));
  }, [company]);

  useEffect(() => {
    // Normativas, precios de proveedores, catálogos, homologación y
    // aranceles: se comprueban solas una vez al día (al cruzar las 00:00,
    // la primera vez que se abre la app ese día) sin interrumpir a nadie.
    const t = setTimeout(() => {
      import('@/lib/dailyAutoUpdate').then(({ maybeRunDailyBackground }) => maybeRunDailyBackground());
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Al cambiar de pantalla se cierra el menú del móvil.
  useEffect(() => { setMenuMovil(false); setAreaMovil(null); }, [location.pathname, location.search]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const sitio = ubicarPagina(currentPageName, location.search);
  const areaActual = sitio?.area;
  const titulo = sitio?.apartado?.texto || currentPageName;
  const fondoTipo = FONDO_POR_PAGINA[currentPageName];
  const empresaTema = React.useMemo(() => empresaParaTema(company), [company]);

  const ruta = currentPageName === 'Home'
    ? [{ texto: 'Cuadro general' }]
    : [
        ...(areaActual ? [{ texto: areaActual.texto, href: areaActual.apartados[0].ruta }] : []),
        { texto: titulo },
      ];

  const EnlaceDelMovil = React.useMemo(() => EnlaceMenu({ onAbrir: () => setMenuMovil(true) }), []);
  // En el mosaico del móvil, tocar un área enseña sus apartados en vez de saltar al primero.
  const EnlaceMosaico = React.useMemo(() => function EnlaceDeArea({ to, children, ...resto }) {
    const area = AREAS.find((a) => a.apartados[0].ruta === to);
    return (
      <a href="#area" {...resto} onClick={(e) => { e.preventDefault(); setAreaMovil(area ? area.id : null); }}>{children}</a>
    );
  }, []);
  const areaAbierta = AREAS.find((a) => a.id === areaMovil);

  const acciones = (
    <>
      <button type="button" onClick={() => setSearchOpen(true)} className="gpt-boton gpt-boton--oscuro" aria-label="Buscar (Ctrl+K)" style={{ minHeight: 40 }}>
        <Search className="w-4 h-4" /><span className="hidden sm:inline">Buscar</span>
      </button>
      <span className="gpt-barra__herramientas">
        <AjusteRapidoLetra compacto />
        <ThemeToggle size="w-5 h-5" />
        <NotificationsPanel />
      </span>
      <button type="button" onClick={handleLogout} className="gpt-boton gpt-boton--oscuro gpt-cerrar" style={{ minHeight: 40 }}>
        <LogOut className="w-4 h-4" />Cerrar sesión
      </button>
    </>
  );

  return (
    <ProveedorTema empresa={empresaTema}>
      <div className="gpt-app gpt-layout min-h-screen flex" dir="ltr" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <AIChat />
        <QuickPriceDBAccess />
        <BackupProgressIndicator />
        <DescargasGlobal />
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        <style>{`
          .no-print { display: block; }
          @media print {
            .no-print { display: none !important; }
            table { border-collapse: collapse !important; }
            table td, table th { border: 1px solid #ccc !important; padding: 4px !important; }
          }
        `}</style>

        {/* Menú de escritorio */}
        <aside className="hidden lg:flex lg:flex-col fixed h-full z-30 print:hidden" style={{ width: 248, overflowY: 'auto', background: 'var(--gpt-tinta)' }}>
          <MenuLateral
            areaActual={currentPageName === 'Home' ? null : areaActual?.id}
            paginaActual={sitio?.apartado?.id}
            usuario={usuario?.full_name || usuario?.name || usuario?.email}
            rol={usuario?.role}
            Enlace={EnlaceRapido}
            rutaInicio="/"
          />
        </aside>

        {/* Columna principal */}
        <div className="flex-1 lg:ml-[248px] min-h-screen relative min-w-0 gpt-pantalla">
          {fondoTipo && (
            <FondoTecnico
              tipo={fondoTipo}
              estilo={{ position: 'fixed', right: '3%', bottom: '5%', width: 'min(56%, 820px)' }}
            />
          )}
          <div className="print:hidden"><BarraSuperior ruta={ruta} acciones={acciones} Enlace={Link} /></div>

          <main className="gpt-contenido gpt-contenido--pagina pb-28 lg:pb-6 min-w-0 w-full" style={{ contain: 'layout style' }}>
            <BarraNavegacion enInicio={currentPageName === 'Home'} />
            <div ref={contenidoRef} className="min-w-0 w-full">
              {/* Suspense propio: al abrir una pantalla el menú y la barra se quedan; solo cambia el contenido. */}
              <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin opacity-60" /></div>}>{children}</Suspense>
            </div>
            <ImportacionEnSegundoPlano />
            <BotonesImprimirPantalla
              nodoRef={contenidoRef}
              pagina={currentPageName}
              titulo={titulo}
            />
          </main>

          {/* Pie de página global con el correo de soporte y enlaces legales */}
          <footer className="gpt-contenido gpt-contenido--pie pb-28 lg:pb-6 pt-2 text-center text-xs">
            <div>
              Gestión Pro Total · Soporte:{' '}
              <a href="mailto:kairigarcia.gestionprototal@gmail.com" className="hover:underline">
                kairigarcia.gestionprototal@gmail.com
              </a>
            </div>
            <div className="mt-1">
              <a href="legal/eula.html" target="_blank" rel="noopener" className="hover:underline">Licencia (EULA)</a>
              {' · '}
              <a href="legal/privacidad.html" target="_blank" rel="noopener" className="hover:underline">Privacidad</a>
              {' · '}
              <a href="legal/terminos.html" target="_blank" rel="noopener" className="hover:underline">Términos</a>
            </div>
          </footer>
        </div>

        {/* Barra inferior del móvil */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'var(--gpt-tinta)' }}>
          <BarraInferior
            actual={ACCESOS_MOVIL.find((a) => a.id === currentPageName)?.id || ''}
            accesos={ACCESOS_MOVIL}
            Enlace={EnlaceDelMovil}
          />
        </div>

        {/* Menú del móvil: mosaico de áreas y, al tocar una, sus apartados */}
        {menuMovil && (
          <div className="lg:hidden fixed inset-0 z-50 gpt-app gpt-papel print:hidden" role="dialog" aria-modal="true" aria-label="Menú" style={{ overflowY: 'auto', paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="gpt-barra">
              <span className="gpt-barra__marca">{areaAbierta ? areaAbierta.texto : 'Menú'}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                {areaAbierta && <button type="button" className="gpt-boton gpt-boton--oscuro" onClick={() => setAreaMovil(null)}>Áreas</button>}
                <button type="button" className="gpt-boton gpt-boton--oscuro" aria-label="Cerrar el menú" onClick={() => { setMenuMovil(false); setAreaMovil(null); }}><X className="w-5 h-5" /></button>
              </span>
            </div>
            <div className="gpt-contenido" style={{ paddingBottom: 96 }}>
              {!areaAbierta && (
                <>
                  <Link to="/" className="gpt-boton" style={{ justifyContent: 'flex-start' }}><Icono nombre="cuadro" tam={22} />Cuadro general</Link>
                  <MenuMovil Enlace={EnlaceMosaico} />
                  <button type="button" onClick={handleLogout} className="gpt-boton"><LogOut className="w-4 h-4" />Cerrar sesión</button>
                </>
              )}
              {areaAbierta && (
                <ul className="gpt-panel gpt-bloque" style={{ padding: 0, listStyle: 'none', margin: 0 }}>
                  {areaAbierta.apartados.map((ap) => (
                    <li key={ap.id}>
                      <Link to={ap.ruta} className="gpt-boton" style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderTop: '1px solid var(--gpt-linea)', minHeight: 52 }}>
                        <Icono nombre={ap.icono} tam={20} />{ap.texto}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </ProveedorTema>
  );
}
