import type {
  AdminOrderRecord,
  RestaurantAdminRecord,
} from "@/types/service-api";

export interface Admin {
  adminId: number;
  fullName: string;
}

export interface CatalogStatus {
  status_id: number;
  status_name: string;
}

export interface UserRole {
  role_id: number;
  role_name: string;
}

export interface UserStatus {
  status_id: number;
  status_name: string;
}

export type AdminRestaurant = RestaurantAdminRecord;
export type AdminOrder = AdminOrderRecord;
