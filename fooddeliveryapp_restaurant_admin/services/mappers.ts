import type { Food as ApiFood } from "@/types/restaurant/menu.types";
import type { Order as ApiOrder, OrderDetail as ApiOrderDetail } from "@/types/restaurant/order.types";
import type { Food } from "@/types/food";
import type { Order, OrderDetail, OrderStatus } from "@/types/order";

const foodStatus: Record<number, Food["status"]> = { 1: "AVAILABLE", 2: "UNAVAILABLE" };
const orderStatus: Record<number, OrderStatus> = {
  1: "PENDING", 2: "CONFIRMED", 3: "PREPARING", 4: "READY_FOR_PICKUP",
  5: "PICKED_UP", 6: "DELIVERING", 7: "COMPLETED", 8: "CANCELLED", 9: "REJECTED",
};

export const foodMapper = {
  toCamelCase(food: ApiFood): Food {
    return {
      foodId: food.food_id, restaurantId: food.restaurant_id, categoryId: food.category_id,
      name: food.name, description: food.description, price: Number(food.price), image: food.image,
      status: foodStatus[food.status_id] ?? "UNAVAILABLE",
      createdAt: food.created_at, updatedAt: food.updated_at,
    };
  },
};

export const orderMapper = {
  toCamelCase(order: ApiOrder, details: ApiOrderDetail[] = []): Order {
    return {
      orderId: order.order_id, orderCode: `#${order.order_id}`,
      status: orderStatus[order.status_id] ?? "PENDING", createdAt: order.created_at,
      totalAmount: Number(order.total_amount), note: order.note,
      details: details.map((detail): OrderDetail => ({
        orderDetailId: detail.order_detail_id, foodId: detail.food_id,
        quantity: detail.quantity, subtotal: Number(detail.subtotal),
      })),
    };
  },
};
