import type { DateTime, Id } from "@/types/api";

export interface Voucher {
  voucher_id: Id;
  code: string;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  min_order_value?: number | null;
  start_at: DateTime;
  end_at: DateTime;
  status_id: Id;
}

export type CreateVoucherPayload = Omit<Voucher, "voucher_id">;
export type UpdateVoucherPayload = Partial<CreateVoucherPayload>;
