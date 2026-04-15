// apps/web/src/lib/query-client.ts — update stale times per resource
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds default
      gcTime: 5 * 60_000, // 5 min in cache
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
});

// Stale time constants — use when overriding per-query
export const STALE = {
  WALLET: 30_000, // financial data — refresh frequently
  BATCH: 60_000, // in-delivery batches polled every 60s
  PROGRAM: 2 * 60_000,
  NOTIFICATIONS: 30_000,
  REPORTS: 5 * 60_000,
  AUDIT: 0, // always fetch fresh — never cache audit logs
};
