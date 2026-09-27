import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  Payment,
  PaymentMethod,
  CreatePaymentPayload,
  UpdatePaymentPayload,
} from "@/types/restaurant/index";

export const restaurantPaymentService = {
  list: async () => unwrapResponse<Payment[]>(await apiClient.get("/payments")),
  getById: async (id: number) => unwrapResponse<Payment>(await apiClient.get(`/payments/${id}`)),
  create: async (payload: CreatePaymentPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/payments", payload)),
  update: async (id: number, payload: UpdatePaymentPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/payments/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/payments/${id}`)),
  listMethods: async () =>
    unwrapResponse<PaymentMethod[]>(await apiClient.get("/payment_methods")),
  getMethod: async (id: number) =>
    unwrapResponse<PaymentMethod>(await apiClient.get(`/payment_methods/${id}`)),
  createMethod: async (payload: Omit<PaymentMethod, "method_id">) =>
    unwrapResponse<undefined>(await apiClient.post("/payment_methods", payload)),
  updateMethod: async (id: number, payload: Partial<Omit<PaymentMethod, "method_id">>) =>
    unwrapResponse<undefined>(await apiClient.put(`/payment_methods/${id}`, payload)),
  removeMethod: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/payment_methods/${id}`)),
};
