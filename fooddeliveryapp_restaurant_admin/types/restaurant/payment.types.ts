import type { DateTime, Id } from "@/types/api";

export interface Payment {
  payment_id: Id;
  order_id: Id;
  method_id: Id;
  amount: number;
  status_id: Id;
  paid_at?: DateTime | null;
}

export type CreatePaymentPayload = Omit<Payment, "payment_id">;
export type UpdatePaymentPayload = Partial<CreatePaymentPayload>;

export interface PaymentMethod {
  method_id: Id;
  method_name: string;
}
