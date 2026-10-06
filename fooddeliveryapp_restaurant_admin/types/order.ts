export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface OrderDetail {
  orderDetailId: number;
  foodId: number;
  quantity: number;
  subtotal: number;
  food?: { name: string };
}

export interface Order {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  createdAt: string;
  totalAmount: number;
  note?: string | null;
  details: OrderDetail[];
}

export interface UpdateOrderStatusInput {
  status: Exclude<OrderStatus, "PENDING">;
  note?: string;
}
