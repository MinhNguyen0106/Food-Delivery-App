export type FoodStatus = "AVAILABLE" | "UNAVAILABLE";

export interface Food {
  foodId: number;
  restaurantId: number;
  categoryId: number;
  category?: {
    categoryId: number;
    name: string;
  };
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  status: FoodStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoodInput {
  name: string;
  description?: string | null;
  price: number;
  categoryId: number;
  image?: string | null;
}
