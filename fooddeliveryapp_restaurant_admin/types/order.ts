export type OrderStatus =
  | "SCHEDULED"
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
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
  scheduledFor?: string | null;
  totalAmount: number;
  note?: string | null;
  customerName?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  deliveryAddress?: string | null;
  details: OrderDetail[];
}

export interface UpdateOrderStatusInput {
  status: Exclude<OrderStatus, "PENDING">;
  note?: string;
}
