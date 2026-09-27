import apiClient, { unwrapResponse } from "@/services/api.client";
import type { AdminOrder } from "@/types/admin";

export const adminOrderService = {
  list: async () => unwrapResponse<AdminOrder[]>(await apiClient.get("/orders")),
  getById: async (id: number) =>
    unwrapResponse<AdminOrder>(await apiClient.get(`/orders/${id}`)),
  update: async (id: number, payload: Partial<AdminOrder>) =>
    unwrapResponse<undefined>(await apiClient.put(`/orders/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/orders/${id}`)),
};
