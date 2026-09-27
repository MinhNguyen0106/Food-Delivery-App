import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  Category,
  CreateCategoryPayload,
  CreateFoodPayload,
  Food,
  UpdateCategoryPayload,
  UpdateFoodPayload,
} from "@/types/restaurant/index";

export const restaurantMenuService = {
  listFoods: async () => unwrapResponse<Food[]>(await apiClient.get("/foods")),
  getFood: async (id: number) =>
    unwrapResponse<Food>(await apiClient.get(`/foods/${id}`)),
  createFood: async (payload: CreateFoodPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/foods", payload)),
  updateFood: async (id: number, payload: UpdateFoodPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/foods/${id}`, payload)),
  removeFood: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/foods/${id}`)),
  listCategories: async () =>
    unwrapResponse<Category[]>(await apiClient.get("/categories")),
  getCategory: async (id: number) =>
    unwrapResponse<Category>(await apiClient.get(`/categories/${id}`)),
  createCategory: async (payload: CreateCategoryPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/categories", payload)),
  updateCategory: async (id: number, payload: UpdateCategoryPayload) =>
    unwrapResponse<undefined>(
      await apiClient.put(`/categories/${id}`, payload),
    ),
  removeCategory: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/categories/${id}`)),
};
