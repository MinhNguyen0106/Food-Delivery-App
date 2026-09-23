import { restaurantOrderService } from "@/services/restaurant/order.service";
import { orderMapper } from "@/services/mappers";
import type { Order, UpdateOrderStatusInput } from "@/types/order";

export const orderService = {
  async list(): Promise<Order[]> {
    const orders = await restaurantOrderService.list();
    const details = await restaurantOrderService.listDetails();

    return orders.map(order => {
      const orderDetails = details.filter(d => d.order_id === order.order_id);
      return orderMapper.toCamelCase(order, orderDetails);
    });
  },

  async getById(id: number): Promise<Order> {
    const order = await restaurantOrderService.getById(id);
    const details = await restaurantOrderService.listDetails();
    const orderDetails = details.filter(d => d.order_id === order.order_id);
    return orderMapper.toCamelCase(order, orderDetails);
  },

  async updateStatus(
    id: number,
    input: UpdateOrderStatusInput,
  ): Promise<Order> {
    const statusIdMap: Record<string, number> = {
      CONFIRMED: 2,
      PREPARING: 3,
      READY_FOR_PICKUP: 4,
      REJECTED: 9,
    };

    const statusId = statusIdMap[input.status] || 1;
    
    await restaurantOrderService.update(id, {
      status_id: statusId,
      note: input.note,
    });

    return orderService.getById(id);
  },

  async reject(id: number, note: string): Promise<Order> {
    await restaurantOrderService.update(id, {
      status_id: 9,
      note,
    });
    return orderService.getById(id);
  },
};
