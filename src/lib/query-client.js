import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000,      // datos frescos 5 min — evita refetch innecesarios
			gcTime: 15 * 60 * 1000,         // mantiene en caché 15 min
		},
	},
});