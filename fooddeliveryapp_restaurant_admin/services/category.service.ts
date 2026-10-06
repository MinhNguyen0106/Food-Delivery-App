import apiClient, {
  assertSuccess,
  unwrapResponse,
} from "@/services/api.client";
import type {
  CreateAdminCategoryPayload,
  UpdateAdminCategoryPayload,
} from "@/types/admin";
import type { CategoryRecord } from "@/types/service-api";

export const categoryService = {
  async getCategories(): Promise<CategoryRecord[]> {
    return unwrapResponse(
      await apiClient.get<CategoryRecord[]>("/categories"),
    );
  },

  async getCategoryById(id: number): Promise<CategoryRecord> {
    return unwrapResponse(
      await apiClient.get<CategoryRecord>(`/categories/${id}`),
    );
  },

  async createCategory(
    input: CreateAdminCategoryPayload,
  ): Promise<{ id: number; message?: string }> {
    const result = assertSuccess(
      await apiClient.post<never>("/categories", input),
    );
    if (typeof result.id !== "number") {
      throw new Error("Category creation response did not include its ID");
    }
    return { id: result.id, message: result.message };
  },

  async updateCategory(
    id: number,
    input: UpdateAdminCategoryPayload,
  ): Promise<{ message?: string }> {
    if (Object.keys(input).length === 0) {
      throw new Error("At least one Category field must be provided");
    }
    const result = assertSuccess(
      await apiClient.put<never>(`/categories/${id}`, input),
    );
    return { message: result.message };
  },

  async deleteCategory(id: number): Promise<{ message?: string }> {
    const result = assertSuccess(
      await apiClient.delete<never>(`/categories/${id}`),
    );
    return { message: result.message };
  },
};
