import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,                        // 1 reintento en caso de fallo de red
			staleTime: 60 * 60 * 1000,       // datos frescos 1 hora
			gcTime: 2 * 60 * 60 * 1000,      // caché 2 horas
			refetchOnMount: false,           // no refetch si ya hay datos en caché
			refetchOnReconnect: false,
		},
	},
});