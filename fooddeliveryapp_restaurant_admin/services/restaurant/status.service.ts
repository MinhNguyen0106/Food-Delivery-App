import apiClient, { unwrapResponse } from "@/services/api.client";
import type { RestaurantStatus } from "@/types/restaurant/index";

export const restaurantStatusService = {
  list: async () =>
    unwrapResponse<RestaurantStatus[]>(
      await apiClient.get("/restaurant_statuses"),
    ),
  getById: async (id: number) =>
    unwrapResponse<RestaurantStatus>(
      await apiClient.get(`/restaurant_statuses/${id}`),
    ),
  create: async (payload: Omit<RestaurantStatus, "status_id">) =>
    unwrapResponse<undefined>(
      await apiClient.post("/restaurant_statuses", payload),
    ),
  update: async (
    id: number,
    payload: Partial<Omit<RestaurantStatus, "status_id">>,
  ) =>
    unwrapResponse<undefined>(
      await apiClient.put(`/restaurant_statuses/${id}`, payload),
    ),
  remove: async (id: number) =>
    unwrapResponse<undefined>(
      await apiClient.delete(`/restaurant_statuses/${id}`),
    ),
};
