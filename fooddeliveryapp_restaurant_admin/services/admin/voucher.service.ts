import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  VoucherRecord,
  VoucherWriteInput,
} from "@/types/service-api";

export const adminVoucherService = {
  async list(): Promise<VoucherRecord[]> {
    return unwrapResponse(
      await apiClient.get<VoucherRecord[]>("/vouchers"),
    );
  },

  async getById(id: number): Promise<VoucherRecord> {
    return unwrapResponse(
      await apiClient.get<VoucherRecord>(`/vouchers/${id}`),
    );
  },

  async create(input: VoucherWriteInput): Promise<{ voucherId: number }> {
    return unwrapResponse(
      await apiClient.post<{ voucherId: number }>("/vouchers", input),
    );
  },

  async replaceVoucher(
    id: number,
    input: VoucherWriteInput,
  ): Promise<{ voucherId: number }> {
    return unwrapResponse(
      await apiClient.put<{ voucherId: number }>(`/vouchers/${id}`, input),
    );
  },

  async remove(id: number): Promise<{ voucherId: number }> {
    return unwrapResponse(
      await apiClient.delete<{ voucherId: number }>(`/vouchers/${id}`),
    );
  },
};
