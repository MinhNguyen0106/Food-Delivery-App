import apiClient, { unwrapResponse } from "@/services/api.client";
import type { RestaurantRecord } from "@/types/service-api";

export interface RestaurantCategoryRecord {
  category_id: number;
  name: string;
  description: string | null;
}

export interface RestaurantFilters {
  q?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  isOpen?: boolean;
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
}

export const restaurantInfoService = {
  async getRestaurants(
    filters: RestaurantFilters = {},
  ): Promise<RestaurantRecord[]> {
    return unwrapResponse(
      await apiClient.get<RestaurantRecord[]>("/restaurants", {
        params: {
          q: filters.q,
          categoryId: filters.categoryId,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          minRating: filters.minRating,
          isOpen: filters.isOpen,
          latitude: filters.latitude,
          longitude: filters.longitude,
          maxDistanceKm: filters.maxDistanceKm,
        },
      }),
    );
  },

  async getById(id: number): Promise<RestaurantRecord> {
    return unwrapResponse(
      await apiClient.get<RestaurantRecord>(`/restaurants/${id}`),
    );
  },

  async getCategories(id: number): Promise<RestaurantCategoryRecord[]> {
    return unwrapResponse(
      await apiClient.get<RestaurantCategoryRecord[]>(
        `/restaurants/${id}/categories`,
      ),
    );
  },
};
