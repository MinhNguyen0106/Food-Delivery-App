import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  AdminRestaurant,
  UpdateAdminRestaurantPayload,
} from "@/types/admin";

export const adminRestaurantService = {
  list: async () =>
    unwrapResponse<AdminRestaurant[]>(await apiClient.get("/restaurants")),
  getById: async (id: number) =>
    unwrapResponse<AdminRestaurant>(await apiClient.get(`/restaurants/${id}`)),
  create: async (payload: Omit<AdminRestaurant, "restaurant_id">) =>
    unwrapResponse<undefined>(await apiClient.post("/restaurants", payload)),
  update: async (id: number, payload: UpdateAdminRestaurantPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/restaurants/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/restaurants/${id}`)),
};
