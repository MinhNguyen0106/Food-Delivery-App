import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  AdminCategory,
  CreateAdminCategoryPayload,
  UpdateAdminCategoryPayload,
} from "@/types/admin";

export const adminCategoryService = {
  list: async () => unwrapResponse<AdminCategory[]>(await apiClient.get("/categories")),
  getById: async (id: number) =>
    unwrapResponse<AdminCategory>(await apiClient.get(`/categories/${id}`)),
  create: async (payload: CreateAdminCategoryPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/categories", payload)),
  update: async (id: number, payload: UpdateAdminCategoryPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/categories/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/categories/${id}`)),
};
