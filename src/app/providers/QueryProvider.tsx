import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { isApiError } from '@/shared/api';

/** Una lectura se reintenta una vez solo ante fallas de red o 5xx; nunca ante 4xx (no cambiará). */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => count < 1 && (!isApiError(error) || error.status === 0 || error.status >= 500),
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [qc] = useState(() => client ?? makeQueryClient());
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
