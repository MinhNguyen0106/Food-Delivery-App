import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  AdminOrderDetailRecord,
  AdminOrderRecord,
  CustomerAdminRecord,
  OrderStatus,
  RestaurantAdminRecord,
  ShipperAdminRecord,
} from "@/types/service-api";

export interface CustomerFilters {
  q?: string;
  status?: "ACTIVE" | "LOCKED";
}

export interface RestaurantFilters {
  q?: string;
  status?: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
}

export interface ShipperFilters {
  q?: string;
  accountStatus?: "ACTIVE" | "LOCKED";
  availability?: "OFFLINE" | "ONLINE" | "BUSY";
}

export interface AdminOrderFilters {
  q?: string;
  status?: OrderStatus;
  from?: string;
  to?: string;
}

export interface CreateAdminShipperInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export interface CreateAdminShipperResult {
  userId: number;
  shipperId: number;
  email: string;
  role: "SHIPPER";
  fullName: string;
  phone: string;
  accountStatus: "ACTIVE";
  availability: "OFFLINE";
}

export interface CreateAdminRestaurantInput {
  email: string;
  password: string;
  name: string;
  address: string;
  phone: string;
  description?: string;
  latitude: number;
  longitude: number;
  openingTime?: string;
  closingTime?: string;
}

export interface CreateAdminRestaurantResult {
  userId: number;
  restaurantId: number;
  email: string;
  role: "RESTAURANT";
  name: string;
  status: "PENDING";
  accountStatus: "ACTIVE";
}

export const adminService = {
  async getCustomers(
    filters: CustomerFilters = {},
  ): Promise<CustomerAdminRecord[]> {
    return unwrapResponse(
      await apiClient.get<CustomerAdminRecord[]>("/admin/customers", {
        params: { q: filters.q, status: filters.status },
      }),
    );
  },

  async getCustomer(id: number): Promise<CustomerAdminRecord> {
    return unwrapResponse(
      await apiClient.get<CustomerAdminRecord>(`/admin/customers/${id}`),
    );
  },

  async setCustomerStatus(
    id: number,
    status: NonNullable<CustomerFilters["status"]>,
  ): Promise<{ id: number; accountStatus: "ACTIVE" | "LOCKED" }> {
    return unwrapResponse(
      await apiClient.patch<{ id: number; accountStatus: "ACTIVE" | "LOCKED" }>(
        `/admin/customers/${id}/status`,
        { status },
      ),
    );
  },

  async getRestaurants(
    filters: RestaurantFilters = {},
  ): Promise<RestaurantAdminRecord[]> {
    return unwrapResponse(
      await apiClient.get<RestaurantAdminRecord[]>("/admin/restaurants", {
        params: { q: filters.q, status: filters.status },
      }),
    );
  },

  async getRestaurant(id: number): Promise<RestaurantAdminRecord> {
    return unwrapResponse(
      await apiClient.get<RestaurantAdminRecord>(`/admin/restaurants/${id}`),
    );
  },

  async createRestaurant(
    input: CreateAdminRestaurantInput,
  ): Promise<CreateAdminRestaurantResult> {
    return unwrapResponse(
      await apiClient.post<CreateAdminRestaurantResult>(
        "/admin/restaurants",
        input,
      ),
    );
  },

  async setRestaurantStatus(
    id: number,
    status: NonNullable<RestaurantFilters["status"]>,
  ): Promise<{
    restaurantId: number;
    previousStatus: RestaurantFilters["status"];
    status: RestaurantFilters["status"];
  }> {
    return unwrapResponse(
      await apiClient.patch<{
        restaurantId: number;
        previousStatus: RestaurantFilters["status"];
        status: RestaurantFilters["status"];
      }>(`/admin/restaurants/${id}/status`, { status }),
    );
  },

  async getShippers(
    filters: ShipperFilters = {},
  ): Promise<ShipperAdminRecord[]> {
    return unwrapResponse(
      await apiClient.get<ShipperAdminRecord[]>("/admin/shippers", {
        params: {
          q: filters.q,
          accountStatus: filters.accountStatus,
          availability: filters.availability,
        },
      }),
    );
  },

  async getShipper(id: number): Promise<ShipperAdminRecord> {
    return unwrapResponse(
      await apiClient.get<ShipperAdminRecord>(`/admin/shippers/${id}`),
    );
  },

  async createShipper(
    input: CreateAdminShipperInput,
  ): Promise<CreateAdminShipperResult> {
    return unwrapResponse(
      await apiClient.post<CreateAdminShipperResult>("/admin/shippers", input),
    );
  },

  async setShipperAccountStatus(
    id: number,
    status: NonNullable<ShipperFilters["accountStatus"]>,
  ): Promise<{ id: number; accountStatus: "ACTIVE" | "LOCKED" }> {
    return unwrapResponse(
      await apiClient.patch<{ id: number; accountStatus: "ACTIVE" | "LOCKED" }>(
        `/admin/shippers/${id}/account-status`,
        { status },
      ),
    );
  },

  async getOrders(
    filters: AdminOrderFilters = {},
  ): Promise<AdminOrderRecord[]> {
    return unwrapResponse(
      await apiClient.get<AdminOrderRecord[]>("/admin/orders", {
        params: {
          q: filters.q,
          status: filters.status,
          from: filters.from,
          to: filters.to,
        },
      }),
    );
  },

  async getOrder(id: number): Promise<AdminOrderDetailRecord> {
    return unwrapResponse(
      await apiClient.get<AdminOrderDetailRecord>(`/admin/orders/${id}`),
    );
  },
};
