import { restaurantProfileService } from "@/services/restaurant/profile.service";
import type { Restaurant } from "@/types/restaurant";

export interface RestaurantDashboard {
  todayRevenue: number;
  todayOrderCount: number;
  pendingOrderCount: number;
  completedOrderCount: number;
}

export const restaurantService = {
  async getDashboard(): Promise<RestaurantDashboard> {
    const restaurants = await restaurantProfileService.list();
    if (!restaurants || restaurants.length === 0) {
      return {
        todayRevenue: 0,
        todayOrderCount: 0,
        pendingOrderCount: 0,
        completedOrderCount: 0,
      };
    }

    return {
      todayRevenue: Math.floor(Math.random() * 5000000),
      todayOrderCount: Math.floor(Math.random() * 20),
      pendingOrderCount: Math.floor(Math.random() * 8),
      completedOrderCount: Math.floor(Math.random() * 12),
    };
  },

  async list(): Promise<Restaurant[]> {
    const restaurants = await restaurantProfileService.list();
    return restaurants.map(r => ({
      restaurantId: r.restaurant_id,
      userId: r.user_id,
      name: r.name,
      address: r.address,
      phone: r.phone,
      description: r.description,
      status: mapRestaurantStatus(r.status_id),
      latitude: r.latitude,
      longitude: r.longitude,
      image: r.image,
      openingTime: r.opening_time,
      closingTime: r.closing_time,
    }));
  },

  async getById(id: number): Promise<Restaurant> {
    const restaurant = await restaurantProfileService.getById(id);
    return {
      restaurantId: restaurant.restaurant_id,
      userId: restaurant.user_id,
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone,
      description: restaurant.description,
      status: mapRestaurantStatus(restaurant.status_id),
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      image: restaurant.image,
      openingTime: restaurant.opening_time,
      closingTime: restaurant.closing_time,
    };
  },
};

function mapRestaurantStatus(statusId: number): "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" {
  const statusMap: Record<number, "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED"> = {
    1: "PENDING",
    2: "ACTIVE",
    3: "REJECTED",
    4: "SUSPENDED",
  };
  return statusMap[statusId] || "PENDING";
}
