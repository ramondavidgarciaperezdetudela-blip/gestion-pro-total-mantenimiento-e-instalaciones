import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { Component, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';

// En la app de escritorio (Electron) la página se sirve con protocolo file://,
// por lo que BrowserRouter interpretaría la ruta del fichero (…/dist/index.html)
// como una ruta de la app y mostraría un 404. En ese caso usamos HashRouter,
// que funciona perfectamente desde file://. En la web seguimos con
// BrowserRouter para conservar las URLs limpias y los enlaces públicos.
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const Router = isFileProtocol ? HashRouter : BrowserRouter;
import { Suspense, lazy } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PantallaArranque, { PantallaErrorSesion } from '@/components/PantallaArranque';

import UpdateChecker from '@/components/UpdateChecker';
import StorageSetupNotice from '@/components/StorageSetupNotice';
const PresupuestoPublico = lazy(() => import('./pages/PresupuestoPublico'));

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
          <p className="text-gray-600 text-lg font-medium">La página no se cargó correctamente</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
          >Recargar página</button>
        </div>
      );
    }
    return this.props.children;
  }
}
const SATPublico = lazy(() => import('./pages/SATPublico'));
const VerificarDocumento = lazy(() => import('./pages/VerificarDocumento'));
const SupplierTariffs = lazy(() => import('./pages/SupplierTariffs'));
const PurchaseSummary = lazy(() => import('./pages/PurchaseSummary'));
const BackupCenter = lazy(() => import('./pages/BackupCenter'));
const CapillaryCalc = lazy(() => import('./pages/CapillaryCalc'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-32">
    <div className="w-6 h-6 border-3 border-slate-200 border-t-slate-600 rounded-full animate-spin opacity-50"></div>
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

function AnimatedRoutes({ children }) {
  return <>{children}</>;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  // Permite entrar aunque la sesión no se haya podido comprobar (sin cobertura,
  // servidor caído). Sin esto, un fallo de red dejaba el programa encerrado en
  // la pantalla de error, que es peor que el problema que venía a resolver.
  const [entrarIgual, setEntrarIgual] = useState(false);

  // Mientras se comprueba la sesión. Si el servidor no contesta esto no
  // termina nunca, así que la pantalla avisa a los pocos segundos en vez de
  // dejar la ruedecita girando sin decir nada (parecía que no abría).
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PantallaArranque />;
  }

  // Errores de sesión
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Al login directamente
      navigateToLogin();
      return null;
    }
    // Cualquier otro error (red, servidor caído, cuenta sin créditos): se
    // explica lo que pasa, pero se deja entrar igualmente, que hay medio
    // programa que funciona sin servidor.
    if (!entrarIgual) {
      return <PantallaErrorSesion error={authError} onContinuar={() => setEntrarIgual(true)} />;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatedRoutes>
        <Routes>
          <Route path="/" element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          } />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              }
            />
          ))}
          <Route path="/presupuesto-publico" element={<PresupuestoPublico />} />
          <Route path="/sat-publico" element={<SATPublico />} />
          <Route path="/verificar-documento" element={<VerificarDocumento />} />
          <Route path="/SupplierTariffs" element={<LayoutWrapper currentPageName="SupplierTariffs"><SupplierTariffs /></LayoutWrapper>} />
          <Route path="/PurchaseSummary" element={<LayoutWrapper currentPageName="PurchaseSummary"><PurchaseSummary /></LayoutWrapper>} />
          <Route path="/BackupCenter" element={<LayoutWrapper currentPageName="BackupCenter"><BackupCenter /></LayoutWrapper>} />
          <Route path="/CapillaryCalc" element={<LayoutWrapper currentPageName="CapillaryCalc"><CapillaryCalc /></LayoutWrapper>} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </AnimatedRoutes>
      {/* Aviso automático de nueva versión (escritorio usa además electron-updater) */}
      <UpdateChecker headless />
      {/* Aviso de primera instalación: dónde se guardan fotos y documentos */}
      <StorageSetupNotice />
    </Suspense>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          {/* Media aplicación avisa con toast de sonner (presupuestos, cálculos,
              plano, disponibilidad…) y este Toaster no estaba montado, así que
              esos avisos no se veían nunca. Con los dos montados, cada uno
              muestra los suyos. */}
          <SonnerToaster position="top-center" richColors />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App