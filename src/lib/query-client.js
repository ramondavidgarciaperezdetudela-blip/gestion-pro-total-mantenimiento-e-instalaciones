import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 0,                        // sin reintentos — falla rápido
			staleTime: 30 * 60 * 1000,       // datos frescos 30 min
			gcTime: 60 * 60 * 1000,          // caché 1 hora
			refetchOnMount: false,           // no refetch si ya hay datos en caché
			refetchOnReconnect: false,
		},
	},
});