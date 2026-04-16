// apps/web/src/hooks/useVendorOrders.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@lib/api-client";

export const vendorOrderKeys = {
  all: () => ["vendor-orders"] as const,
  list: (p: Record<string, unknown>) => ["vendor-orders", "list", p] as const,
};

export function useVendorOrders(params: { page?: number } = {}) {
  return useQuery({
    queryKey: vendorOrderKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get("/vendors/orders", { params });
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useAcknowledgeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/vendors/orders/${id}/acknowledge`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: vendorOrderKeys.all() }),
  });
}

export function useDeliverOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deliveryProofUrl }: { id: string; deliveryProofUrl: string }) => {
      const { data } = await apiClient.patch(`/vendors/orders/${id}/deliver`, {
        deliveryProofUrl,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: vendorOrderKeys.all() }),
  });
}
