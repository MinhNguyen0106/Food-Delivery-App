import type {
  Category,
  CreateCategoryPayload,
  Food,
  CreateFoodPayload,
  Order,
  OrderDetail,
  UpdateOrderPayload,
} from "@/types/restaurant/index";
import type { Food as CamelFood } from "@/types/food";
import type { Category as CamelCategory } from "@/types/category";
import type { Order as CamelOrder, OrderDetail as CamelOrderDetail, OrderStatus } from "@/types/order";
import type { CreateFoodInput } from "@/types/food";

export const foodMapper = {
  toCamelCase(food: Food): CamelFood {
    return {
      foodId: food.food_id,
      restaurantId: food.restaurant_id,
      categoryId: food.category_id,
      name: food.name,
      description: food.description ?? undefined,
      price: food.price,
      image: food.image ?? undefined,
      status: food.status_id === 1 ? "AVAILABLE" : "UNAVAILABLE",
      createdAt: food.created_at,
      updatedAt: food.updated_at,
    };
  },

  fromCreateInput(input: CreateFoodInput, restaurantId: number = 1): CreateFoodPayload {
    return {
      category_id: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      image: input.image,
      status_id: input.status === "UNAVAILABLE" ? 2 : 1,
      restaurant_id: restaurantId,
    };
  },
};

export const categoryMapper = {
  toCamelCase(category: Category): CamelCategory {
    return {
      categoryId: category.category_id,
      name: category.name,
      description: category.description ?? undefined,
      isActive: category.is_active,
      createdAt: category.created_at,
    };
  },

  fromCamelCase(category: CamelCategory): CreateCategoryPayload {
    return {
      name: category.name,
      description: category.description,
      is_active: category.isActive,
    };
  },
};

export const orderMapper = {
  toCamelCase(order: Order, details: OrderDetail[]): CamelOrder {
    return {
      orderId: order.order_id,
      orderCode: `ORD-${order.order_id}`,
      customerId: order.customer_id,
      restaurantId: order.restaurant_id,
      addressId: order.address_id,
      voucherId: order.voucher_id ?? undefined,
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      discount: order.discount,
      totalAmount: order.total_amount,
      status: mapOrderStatus(order.status_id),
      note: order.note ?? undefined,
      details: details.map(orderDetailMapper.toCamelCase),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  },

  fromCamelCase(order: CamelOrder): UpdateOrderPayload {
    return {
      status_id: mapOrderStatusToId(order.status),
      note: order.note,
    };
  },
};

export const orderDetailMapper = {
  toCamelCase(detail: OrderDetail): CamelOrderDetail {
    return {
      orderDetailId: detail.order_detail_id,
      orderId: detail.order_id,
      foodId: detail.food_id,
      quantity: detail.quantity,
      unitPrice: detail.unit_price,
      subtotal: detail.subtotal,
    };
  },
};

function mapOrderStatus(statusId: number): OrderStatus {
  const statusMap: Record<number, OrderStatus> = {
    1: "PENDING",
    2: "CONFIRMED",
    3: "PREPARING",
    4: "READY_FOR_PICKUP",
    5: "PICKED_UP",
    6: "DELIVERING",
    7: "COMPLETED",
    8: "CANCELLED",
    9: "REJECTED",
  };
  return statusMap[statusId] || "PENDING";
}

function mapOrderStatusToId(status: OrderStatus): number {
  const statusMap: Record<OrderStatus, number> = {
    PENDING: 1,
    CONFIRMED: 2,
    PREPARING: 3,
    READY_FOR_PICKUP: 4,
    PICKED_UP: 5,
    DELIVERING: 6,
    COMPLETED: 7,
    CANCELLED: 8,
    REJECTED: 9,
  };
  return statusMap[status] || 1;
}
