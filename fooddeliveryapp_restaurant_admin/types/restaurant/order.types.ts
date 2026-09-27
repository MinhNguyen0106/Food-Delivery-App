import type { DateTime, Id } from "@/types/api";

export interface Order {
  order_id: Id;
  customer_id: Id;
  restaurant_id: Id;
  address_id: Id;
  voucher_id?: Id | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total_amount: number;
  status_id: Id;
  note?: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}

export type CreateOrderPayload = Omit<Order, "order_id" | "created_at" | "updated_at">;
export type UpdateOrderPayload = Partial<CreateOrderPayload>;

export interface OrderDetail {
  order_detail_id: Id;
  order_id: Id;
  food_id: Id;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export type CreateOrderDetailPayload = Omit<OrderDetail, "order_detail_id">;
export type UpdateOrderDetailPayload = Partial<CreateOrderDetailPayload>;

export interface OrderStatusHistory {
  history_id: Id;
  order_id: Id;
  status_id: Id;
  changed_by?: Id | null;
  changed_at: DateTime;
}

export type CreateOrderStatusHistoryPayload = Omit<OrderStatusHistory, "history_id" | "changed_at">;
export type UpdateOrderStatusHistoryPayload = Partial<CreateOrderStatusHistoryPayload>;
