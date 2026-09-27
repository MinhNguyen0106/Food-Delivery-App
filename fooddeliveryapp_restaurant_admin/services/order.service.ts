import { restaurantOrderService } from "@/services/restaurant/order.service";
import { orderMapper } from "@/services/mappers";
import type { Order, UpdateOrderStatusInput } from "@/types/order";

const statusIds: Record<string, number> = {
  CONFIRMED: 2, PREPARING: 3, READY_FOR_PICKUP: 4, REJECTED: 9,
};

export const orderService = {
  async list(): Promise<Order[]> {
    const [orders, details] = await Promise.all([
      restaurantOrderService.list(), restaurantOrderService.listDetails(),
    ]);
    return orders.map((order) =>
      orderMapper.toCamelCase(order, details.filter((detail) => detail.order_id === order.order_id)),
    );
  },
  async updateStatus(id: number, input: UpdateOrderStatusInput): Promise<Order> {
    await restaurantOrderService.update(id, { status_id: statusIds[input.status], note: input.note });
    const orders = await orderService.list();
    const updated = orders.find((order) => order.orderId === id);
    if (!updated) throw new Error("Không tìm thấy đơn hàng sau khi cập nhật");
    return updated;
  },
  reject(id: number, note: string) {
    return this.updateStatus(id, { status: "REJECTED", note });
  },
};
