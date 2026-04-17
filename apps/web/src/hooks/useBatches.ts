// apps/web/src/hooks/useBatches.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

const keys = {
  all: () => ["batches"] as const,
  list: (f: Record<string, unknown>) => ["batches", "list", f] as const,
  detail: (id: string) => ["batches", id] as const,
};

export function useBatches(filters: { programId?: string; status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get("/distribution/batches", { params: filters });
      return data;
    },
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/distribution/batches/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { programId: string; totalAmount: number; notes?: string }) => {
      const { data } = await apiClient.post("/distribution/batches", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  });
}

export function useAddBatchItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      batchId,
      items,
    }: {
      batchId: string;
      items: { beneficiaryId: string; entitlementAmount: number }[];
    }) => {
      const { data } = await apiClient.post(`/distribution/batches/${batchId}/items`, { items });
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: keys.detail(v.batchId) }),
  });
}

export function useSubmitBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data } = await apiClient.post(`/distribution/batches/${batchId}/submit`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  });
}

export function useConfirmDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      batchId,
      itemId,
      deliveryProofUrl,
    }: {
      batchId: string;
      itemId: string;
      deliveryProofUrl: string;
    }) => {
      const { data } = await apiClient.patch(
        `/distribution/batches/${batchId}/items/${itemId}/confirm`,
        { deliveryProofUrl },
      );
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: keys.detail(v.batchId) }),
  });
}
