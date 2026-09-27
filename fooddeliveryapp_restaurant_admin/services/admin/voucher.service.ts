import apiClient, { unwrapResponse } from "@/services/api.client";
import type { Voucher } from "@/types/restaurant/index";

export const adminVoucherService = {
  list: async () => unwrapResponse<Voucher[]>(await apiClient.get("/vouchers")),
  getById: async (id: number) => unwrapResponse<Voucher>(await apiClient.get(`/vouchers/${id}`)),
  create: async (payload: Omit<Voucher, "voucher_id">) =>
    unwrapResponse<undefined>(await apiClient.post("/vouchers", payload)),
  update: async (id: number, payload: Partial<Omit<Voucher, "voucher_id">>) =>
    unwrapResponse<undefined>(await apiClient.put(`/vouchers/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/vouchers/${id}`)),
};
