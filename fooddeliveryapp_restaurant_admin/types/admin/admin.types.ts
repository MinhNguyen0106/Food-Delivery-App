import type { DateTime, Id } from "@/types/api";

export interface Admin {
  admin_id: Id;
  user_id: Id;
  full_name: string;
}

export type CreateAdminPayload = Omit<Admin, "admin_id">;
export type UpdateAdminPayload = Partial<CreateAdminPayload>;

export interface CatalogStatus {
  status_id: Id;
  status_name: string;
}

export interface UserRole {
  role_id: Id;
  role_name: string;
}

export interface UserStatus {
  status_id: Id;
  status_name: string;
}

export interface AdminRestaurant {
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

export type UpdateAdminRestaurantPayload = Partial<Omit<AdminRestaurant, "restaurant_id">>;

export interface AdminOrder {
  order_id: Id;
  customer_id: Id;
  restaurant_id: Id;
  address_id: Id;
  voucher_id?: Id | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total_amount: number;
  status_id: Id;
  note?: string | null;
  created_at: DateTime;
  updated_at: DateTime;
}
