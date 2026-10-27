import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // Si el servidor no responde, la ruedecita de arranque giraba para siempre.
    // Con este tope, a los 15 s se considera fallo de red y se muestra la
    // pantalla con "Entrar de todas formas" en vez de quedar colgado.
    const TOPE_MS = 15000;
    let temporizador;
    const conTope = (promesa) => Promise.race([
      promesa,
      new Promise((_, reject) => {
        temporizador = setTimeout(() => reject(new Error('timeout de conexión al arrancar')), TOPE_MS);
      }),
    ]);

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      // baseURL absoluta (no relativa): en la app instalada (file://,
      // https://localhost) una ruta relativa no llega al backend real de
      // Base44 y esta comprobación fallaría siempre.
      const appClient = createAxiosClient({
        baseURL: `${appParams.appBaseUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      // Sin token (el caso normal del programa vendido: funciona sin cuenta de
      // Base44, en modo app-level): NO se bloquea la entrada esperando al
      // servidor. Antes, si el servidor fallaba durante un rebuild o sin
      // conexión, la ruedecita de arranque giraba 15 s y luego mostraba la
      // pantalla de error, que era justo el "no me deja entrar" tras cada
      // modificación. Ahora se entra al instante y los ajustes públicos se
      // cargan en segundo plano (best-effort): si llegan, mejor; si no, la
      // app sigue funcionando igual.
      if (!appParams.token) {
        setIsLoadingAuth(false);
        setIsLoadingPublicSettings(false);
        setIsAuthenticated(false);
        appClient.get(`/prod/public-settings/by-id/${appParams.appId}`)
          .then((ps) => setAppPublicSettings(ps))
          .catch(() => { /* sin ajustes públicos: no bloquea la entrada */ });
        return;
      }

      // Con token (el creador con login de Base44): sí hace falta esperar a
      // los ajustes públicos para saber si hace falta iniciar sesión.
      try {
        const publicSettings = await conTope(appClient.get(`/prod/public-settings/by-id/${appParams.appId}`));
        setAppPublicSettings(publicSettings);
        await conTope(checkUserAuth());
        clearTimeout(temporizador);
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      clearTimeout(temporizador);
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: /timeout/i.test(error?.message || '')
          ? 'No se ha podido conectar con el servidor (tiempo de espera agotado)'
          : (error.message || 'An unexpected error occurred')
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};