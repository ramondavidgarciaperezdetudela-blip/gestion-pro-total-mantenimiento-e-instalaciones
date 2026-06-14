/**
 * Configuración global de React Query para máxima velocidad
 * - staleTime alto: no refetch innecesarios
 * - gcTime alto: mantener cache más tiempo
 * - retry bajo: no reintentos lentos en errores
 */
export const QUERY_CONFIG = {
  defaultOptions: {
    queries: {
      staleTime:    5 * 60 * 1000,  // 5 min: datos "frescos" sin refetch
      gcTime:      15 * 60 * 1000,  // 15 min: mantener en cache
      retry:        1,              // Solo 1 reintento (no 3 que es el defecto)
      retryDelay:  1000,            // 1s entre reintentos
      refetchOnWindowFocus: false,  // NO refetch al volver a la ventana
      refetchOnReconnect:   true,   // SÍ refetch al reconectar internet
      networkMode: 'always',        // Intentar aunque navigator.onLine sea dudoso
    },
    mutations: {
      retry:        0,              // No reintentar mutaciones fallidas
      networkMode: 'always',
    },
  },
};
