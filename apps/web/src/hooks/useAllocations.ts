// apps/web/src/hooks/useAllocations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

export const allocationKeys = {
  all: () => ["allocations"] as const,
  list: (f: Record<string, unknown>) => ["allocations", "list", f] as const,
};

export function useAllocations(
  filters: { programId?: string; status?: string; page?: number } = {},
) {
  return useQuery({
    queryKey: allocationKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get("/allocations", { params: filters });
      return data;
    },
  });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      programId: string;
      sourceWalletId: string;
      destWalletId: string;
      amount: number;
      notes?: string;
    }) => {
      const { data } = await apiClient.post("/allocations", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: allocationKeys.all() }),
  });
}
