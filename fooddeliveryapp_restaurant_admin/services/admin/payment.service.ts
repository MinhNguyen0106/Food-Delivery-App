import apiClient, { unwrapResponse } from "@/services/api.client";
import type { Payment, PaymentMethod } from "@/types/restaurant/index";

export const adminPaymentService = {
  list: async () => unwrapResponse<Payment[]>(await apiClient.get("/payments")),
  getById: async (id: number) => unwrapResponse<Payment>(await apiClient.get(`/payments/${id}`)),
  create: async (payload: Omit<Payment, "payment_id">) =>
    unwrapResponse<undefined>(await apiClient.post("/payments", payload)),
  update: async (id: number, payload: Partial<Payment>) =>
    unwrapResponse<undefined>(await apiClient.put(`/payments/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/payments/${id}`)),
  listMethods: async () =>
    unwrapResponse<PaymentMethod[]>(await apiClient.get("/payment_methods")),
  createMethod: async (payload: Omit<PaymentMethod, "method_id">) =>
    unwrapResponse<undefined>(await apiClient.post("/payment_methods", payload)),
  updateMethod: async (id: number, payload: Partial<Omit<PaymentMethod, "method_id">>) =>
    unwrapResponse<undefined>(await apiClient.put(`/payment_methods/${id}`, payload)),
  removeMethod: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/payment_methods/${id}`)),
};
