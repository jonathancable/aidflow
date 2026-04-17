// apps/web/src/hooks/useWallets.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

export interface WalletSummary {
  id: string;
  ownerType: string;
  ownerId: string;
  ownerName: string;
  balance: number;
  reservedAmount: number;
  available: number;
  currency: string;
}

export function useWallets() {
  return useQuery<{ success: boolean; data: WalletSummary[] }>({
    queryKey: ["wallets", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get("/wallets");
      return data;
    },
  });
}
