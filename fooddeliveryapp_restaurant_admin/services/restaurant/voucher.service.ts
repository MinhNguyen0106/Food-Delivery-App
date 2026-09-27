import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  CreateVoucherPayload,
  UpdateVoucherPayload,
  Voucher,
} from "@/types/restaurant/index";

export const restaurantVoucherService = {
  list: async () => unwrapResponse<Voucher[]>(await apiClient.get("/vouchers")),
  getById: async (id: number) =>
    unwrapResponse<Voucher>(await apiClient.get(`/vouchers/${id}`)),
  create: async (payload: CreateVoucherPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/vouchers", payload)),
  update: async (id: number, payload: UpdateVoucherPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/vouchers/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/vouchers/${id}`)),
};
