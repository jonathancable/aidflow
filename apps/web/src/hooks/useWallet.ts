// apps/web/src/hooks/useWallet.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";
import { STALE } from "@lib/query-client";

export const walletKeys = {
  balance: (id: string) => ["wallet", id, "balance"] as const,
  transactions: (id: string, p: Record<string, unknown>) =>
    ["wallet", id, "transactions", p] as const,
};

export function useWalletBalance(walletId: string | null) {
  return useQuery({
    queryKey: walletKeys.balance(walletId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(`/wallets/${walletId}`);
      return data.data;
    },
    enabled: !!walletId,
    staleTime: STALE.WALLET,
    refetchInterval: 30_000, // auto-refresh every 30s
  });
}

export function useWalletTransactions(
  walletId: string | null,
  params: { page?: number; from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: walletKeys.transactions(walletId ?? "", params),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/wallets/${walletId}/transactions`,
        { params },
      );
      return data;
    },
    enabled: !!walletId,
    staleTime: STALE.WALLET,
  });
}
