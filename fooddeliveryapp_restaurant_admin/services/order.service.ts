import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  Order as FrontendOrder,
  OrderDetail as FrontendOrderDetail,
} from "@/types/order";
import type {
  OrderDetailRecord,
  OrderHistoryRecord,
  OrderItemRecord,
  OrderStatus,
  OrderSummaryRecord,
  OrderTransitionResult,
} from "@/types/service-api";

function mapItem(item: OrderItemRecord): FrontendOrderDetail {
  return {
    orderDetailId: item.order_detail_id,
    foodId: item.food_id,
    quantity: item.quantity,
    subtotal: Number(item.subtotal),
    food: { name: item.food_name },
  };
}

function mapOrder(
  record: OrderSummaryRecord | OrderDetailRecord,
): FrontendOrder {
  return {
    orderId: record.order_id,
    orderCode: record.order_code,
    status: record.status,
    createdAt: record.created_at,
    scheduledFor: "scheduled_for" in record ? record.scheduled_for ?? null : null,
    totalAmount: Number(record.total_amount),
    note: record.note,
    customerName: "customer_name" in record ? record.customer_name ?? null : null,
    receiverName: "receiver_name" in record ? record.receiver_name ?? null : null,
    receiverPhone: "receiver_phone" in record ? record.receiver_phone ?? null : null,
    deliveryAddress: "full_address" in record ? record.full_address ?? null : null,
    details: "items" in record ? record.items.map(mapItem) : [],
  };
}

function transition(
  id: number,
  action: "confirm" | "reject" | "prepare" | "ready-for-pickup",
  note?: string,
): Promise<{ data: import("@/services/api.client").ApiEnvelope<OrderTransitionResult> }> {
  return apiClient.post<OrderTransitionResult>(
    `/orders/${id}/${action}`,
    note === undefined ? undefined : { note },
  );
}

export const orderService = {
  async list(status?: OrderStatus): Promise<FrontendOrder[]> {
    const records = unwrapResponse(
      await apiClient.get<OrderSummaryRecord[]>("/orders", {
        params: { status },
      }),
    );
    return records.map(mapOrder);
  },

  async getById(id: number): Promise<FrontendOrder> {
    return mapOrder(
      unwrapResponse(
        await apiClient.get<OrderDetailRecord>(`/orders/${id}`),
      ),
    );
  },

  async getHistory(id: number): Promise<OrderHistoryRecord[]> {
    return unwrapResponse(
      await apiClient.get<OrderHistoryRecord[]>(`/orders/${id}/history`),
    );
  },

  async confirmOrder(
    id: number,
    estimatedDeliveryMinutes: number,
  ): Promise<OrderTransitionResult> {
    return unwrapResponse(
      await apiClient.post<OrderTransitionResult>(`/orders/${id}/confirm`, {
        estimated_delivery_minutes: estimatedDeliveryMinutes,
      }),
    );
  },

  async rejectOrder(id: number, note?: string): Promise<OrderTransitionResult> {
    return unwrapResponse(await transition(id, "reject", note));
  },

  async prepareOrder(id: number, note?: string): Promise<OrderTransitionResult> {
    return unwrapResponse(await transition(id, "prepare", note));
  },

  async markReadyForPickup(
    id: number,
    note?: string,
  ): Promise<OrderTransitionResult> {
    return unwrapResponse(await transition(id, "ready-for-pickup", note));
  },
};
