// apps/web/src/hooks/useContributions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

export const contributionKeys = {
  all: () => ["contributions"] as const,
  list: (p: Record<string, unknown>) => ["contributions", "list", p] as const,
  detail: (id: string) => ["contributions", "detail", id] as const,
};

export function useContributions(
  params: { page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: contributionKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/contributions", { params });
      return data;
    },
  });
}

export function useCreateContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      programId: string;
      amount: number;
      currency?: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post("/contributions", payload);
      return data.data;
    },
    onSuccess: () => {
      // Invalidate contributions list AND wallet balance after a contribution
      qc.invalidateQueries({ queryKey: contributionKeys.all() });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
