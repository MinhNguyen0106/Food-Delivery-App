import type { Id } from "@/types/api";

export interface Restaurant {
  restaurant_id: Id;
  user_id: Id;
  name: string;
  address: string;
  phone: string;
  description?: string | null;
  status_id: Id;
  latitude: number;
  longitude: number;
  image?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
}

export type CreateRestaurantPayload = Omit<Restaurant, "restaurant_id">;
export type UpdateRestaurantPayload = Partial<CreateRestaurantPayload>;

export interface RestaurantStatus {
  status_id: Id;
  status_name: string;
}
