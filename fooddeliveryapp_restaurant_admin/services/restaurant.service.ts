import { restaurantOrderService } from "@/services/restaurant/order.service";

export interface RestaurantDashboard {
  todayRevenue: number;
  todayOrderCount: number;
  pendingOrderCount: number;
  completedOrderCount: number;
}

export const restaurantService = {
  async getDashboard(): Promise<RestaurantDashboard> {
    const orders = await restaurantOrderService.list();
    return {
      todayRevenue: orders.reduce((total, order) => total + Number(order.total_amount), 0),
      todayOrderCount: orders.length,
      pendingOrderCount: orders.filter((order) => order.status_id === 1).length,
      completedOrderCount: orders.filter((order) => order.status_id === 7).length,
    };
  },
};
