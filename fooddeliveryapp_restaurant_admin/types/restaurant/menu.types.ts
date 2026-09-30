import type { CategoryRecord, FoodRecord } from "@/types/service-api";

export type Category = CategoryRecord;
export type Food = FoodRecord;

export interface CreateFoodPayload {
  category_id: number;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  status_id?: number;
}

export type UpdateFoodPayload = Partial<CreateFoodPayload>;
