import apiClient, {
  assertSuccess,
  unwrapResponse,
} from "@/services/api.client";
import type { CreateFoodInput, Food } from "@/types/food";
import type {
  FoodRecord,
  FoodStatusRecord,
} from "@/types/service-api";

type FoodWriteInput = Partial<CreateFoodInput>;

export interface FoodFilters {
  q?: string;
  restaurantId?: number;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
}

function toFood(record: FoodRecord): Food {
  return {
    foodId: record.food_id,
    restaurantId: record.restaurant_id,
    categoryId: record.category_id,
    category: {
      categoryId: record.category_id,
      name: record.category_name,
    },
    name: record.name,
    description: record.description,
    price: Number(record.price),
    image: record.image,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toApiFoodInput(input: FoodWriteInput) {
  return {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.categoryId !== undefined && {
      category_id: input.categoryId,
    }),
    ...(input.description !== undefined && {
      description: input.description,
    }),
    ...(input.price !== undefined && { price: input.price }),
    ...(input.image !== undefined && { image: input.image }),
  };
}

export const restaurantMenuService = {
  async listFoods(filters: FoodFilters = {}): Promise<Food[]> {
    const records = unwrapResponse(
      await apiClient.get<FoodRecord[]>("/foods", {
        params: {
          q: filters.q,
          restaurantId: filters.restaurantId,
          categoryId: filters.categoryId,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        },
      }),
    );
    return records.map(toFood);
  },

  async getFood(id: number): Promise<Food> {
    return toFood(
      unwrapResponse(await apiClient.get<FoodRecord>(`/foods/${id}`)),
    );
  },

  async createFood(
    input: CreateFoodInput,
  ): Promise<{ id: number; message?: string }> {
    const response = await apiClient.post<never>(
      "/foods",
      toApiFoodInput(input),
    );
    const result = assertSuccess(response);
    if (typeof result.id !== "number") {
      throw new Error("Food creation response did not include its ID");
    }
    return { id: result.id, message: result.message };
  },

  async updateFood(
    id: number,
    input: FoodWriteInput,
  ): Promise<{ message?: string }> {
    const body = toApiFoodInput(input);
    if (Object.keys(body).length === 0) {
      throw new Error("At least one Food field must be provided");
    }
    const response = await apiClient.put<never>(
      `/foods/${id}`,
      body,
    );
    return { message: assertSuccess(response).message };
  },

  async updateFoodStatus(
    id: number,
    statusId: number,
  ): Promise<{ message?: string }> {
    const response = await apiClient.put<never>(`/foods/${id}`, {
      status_id: statusId,
    });
    return { message: assertSuccess(response).message };
  },

  async deleteFood(id: number): Promise<{ message?: string }> {
    const response = await apiClient.delete<never>(`/foods/${id}`);
    return { message: assertSuccess(response).message };
  },

  async listFoodStatuses(): Promise<FoodStatusRecord[]> {
    return unwrapResponse(
      await apiClient.get<FoodStatusRecord[]>("/food_statuses"),
    );
  },
};
