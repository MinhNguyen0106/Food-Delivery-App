import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  CreateOrderDetailPayload,
  CreateOrderPayload,
  CreateOrderStatusHistoryPayload,
  Order,
  OrderDetail,
  OrderStatusHistory,
  UpdateOrderDetailPayload,
  UpdateOrderPayload,
  UpdateOrderStatusHistoryPayload,
} from "@/types/restaurant/index";

export const restaurantOrderService = {
  list: async () => unwrapResponse<Order[]>(await apiClient.get("/orders")),
  getById: async (id: number) =>
    unwrapResponse<Order>(await apiClient.get(`/orders/${id}`)),
  create: async (payload: CreateOrderPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/orders", payload)),
  update: async (id: number, payload: UpdateOrderPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/orders/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/orders/${id}`)),
  listDetails: async () =>
    unwrapResponse<OrderDetail[]>(await apiClient.get("/order_details")),
  getDetail: async (id: number) =>
    unwrapResponse<OrderDetail>(await apiClient.get(`/order_details/${id}`)),
  createDetail: async (payload: CreateOrderDetailPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/order_details", payload)),
  updateDetail: async (id: number, payload: UpdateOrderDetailPayload) =>
    unwrapResponse<undefined>(
      await apiClient.put(`/order_details/${id}`, payload),
    ),
  removeDetail: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/order_details/${id}`)),
  listStatusHistory: async () =>
    unwrapResponse<OrderStatusHistory[]>(
      await apiClient.get("/order_status_history"),
    ),
  getStatusHistory: async (id: number) =>
    unwrapResponse<OrderStatusHistory>(
      await apiClient.get(`/order_status_history/${id}`),
    ),
  createStatusHistory: async (payload: CreateOrderStatusHistoryPayload) =>
    unwrapResponse<undefined>(
      await apiClient.post("/order_status_history", payload),
    ),
  updateStatusHistory: async (
    id: number,
    payload: UpdateOrderStatusHistoryPayload,
  ) =>
    unwrapResponse<undefined>(
      await apiClient.put(`/order_status_history/${id}`, payload),
    ),
  removeStatusHistory: async (id: number) =>
    unwrapResponse<undefined>(
      await apiClient.delete(`/order_status_history/${id}`),
    ),
};
