import type { DateTime, Id } from "@/types/api";

export interface Category {
  category_id: Id;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: DateTime;
}

export type CreateCategoryPayload = Omit<Category, "category_id" | "created_at">;
export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export interface Food {
  food_id: Id;
  restaurant_id: Id;
  category_id: Id;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  status_id: Id;
  created_at: DateTime;
  updated_at: DateTime;
}

export type CreateFoodPayload = Omit<Food, "food_id" | "created_at" | "updated_at">;
export type UpdateFoodPayload = Partial<CreateFoodPayload>;
