import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Financial data: revalidate frequently
      staleTime:       30_000,        // 30 seconds
      gcTime:          5 * 60_000,    // keep in cache 5 minutes
      retry:           2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,  // never auto-retry mutations
    },
  },
});

// Override stale time per-query where needed:
// useQuery({ queryKey: ['audit-log'], staleTime: 0 })       -- always fresh
// useQuery({ queryKey: ['reports'], staleTime: 5 * 60000 }) -- 5 min