import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  CreateRestaurantPayload,
  Restaurant,
  UpdateRestaurantPayload,
} from "@/types/restaurant/index";

export const restaurantProfileService = {
  list: async () => unwrapResponse<Restaurant[]>(await apiClient.get("/restaurants")),
  getById: async (id: number) =>
    unwrapResponse<Restaurant>(await apiClient.get(`/restaurants/${id}`)),
  create: async (payload: CreateRestaurantPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/restaurants", payload)),
  update: async (id: number, payload: UpdateRestaurantPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/restaurants/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/restaurants/${id}`)),
};
