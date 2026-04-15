// apps/web/src/hooks/useApprovals.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

export const approvalKeys = {
  queue: (params: Record<string, unknown>) => ["approvals", "queue", params] as const,
  detail: (id: string) => ["approvals", "detail", id] as const,
};

export function useApprovalQueue(
  params: { status?: string; entityType?: string; page?: number } = {},
) {
  return useQuery({
    queryKey: approvalKeys.queue(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/approvals", { params });
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000, // auto-poll approval queue
  });
}

export function useResolveApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: "approved" | "rejected";
      notes?: string;
    }) => {
      const { data } = await apiClient.patch(`/approvals/${id}`, {
        decision,
        notes,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}
