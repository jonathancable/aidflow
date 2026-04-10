// apps/web/src/hooks/usePrograms.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

export const programKeys = {
  all: () => ["programs"] as const,
  list: (f: Record<string, unknown>) => ["programs", "list", f] as const,
  detail: (id: string) => ["programs", "detail", id] as const,
  funding: (id: string) => ["programs", "funding", id] as const,
};

export function usePrograms(
  filters: { status?: string; region?: string; page?: number } = {},
) {
  return useQuery({
    queryKey: programKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get("/programs", { params: filters });
      return data;
    },
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: programKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/programs/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useProgramFunding(programId: string) {
  return useQuery({
    queryKey: programKeys.funding(programId),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/programs/${programId}/funding-status`,
      );
      return data.data;
    },
    enabled: !!programId,
    staleTime: 30_000,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      type: string;
      budgetTarget: number;
      region?: string;
      description?: string;
    }) => {
      const { data } = await apiClient.post("/programs", payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: programKeys.all() }),
  });
}
