import apiClient, { unwrapResponse } from "@/services/api.client";
import type { CatalogStatus, UserRole, UserStatus } from "@/types/admin";

type StatusResource =
  | "restaurant_statuses"
  | "food_statuses"
  | "order_statuses"
  | "payment_statuses"
  | "review_statuses"
  | "voucher_statuses";

async function listStatus(resource: StatusResource) {
  return unwrapResponse<CatalogStatus[]>(await apiClient.get(`/${resource}`));
}

async function getStatus(resource: StatusResource, id: number) {
  return unwrapResponse<CatalogStatus>(await apiClient.get(`/${resource}/${id}`));
}

async function createStatus(resource: StatusResource, payload: Omit<CatalogStatus, "status_id">) {
  return unwrapResponse<undefined>(await apiClient.post(`/${resource}`, payload));
}

async function updateStatus(
  resource: StatusResource,
  id: number,
  payload: Partial<Omit<CatalogStatus, "status_id">>,
) {
  return unwrapResponse<undefined>(await apiClient.put(`/${resource}/${id}`, payload));
}

async function removeStatus(resource: StatusResource, id: number) {
  return unwrapResponse<undefined>(await apiClient.delete(`/${resource}/${id}`));
}

export const adminStatusCatalogService = {
  listRestaurantStatuses: () => listStatus("restaurant_statuses"),
  getRestaurantStatus: (id: number) => getStatus("restaurant_statuses", id),
  createRestaurantStatus: (payload: Omit<CatalogStatus, "status_id">) => createStatus("restaurant_statuses", payload),
  updateRestaurantStatus: (id: number, payload: Partial<Omit<CatalogStatus, "status_id">>) => updateStatus("restaurant_statuses", id, payload),
  removeRestaurantStatus: (id: number) => removeStatus("restaurant_statuses", id),
  listFoodStatuses: () => listStatus("food_statuses"),
  getFoodStatus: (id: number) => getStatus("food_statuses", id),
  createFoodStatus: (payload: Omit<CatalogStatus, "status_id">) => createStatus("food_statuses", payload),
  updateFoodStatus: (id: number, payload: Partial<Omit<CatalogStatus, "status_id">>) => updateStatus("food_statuses", id, payload),
  removeFoodStatus: (id: number) => removeStatus("food_statuses", id),
  listOrderStatuses: () => listStatus("order_statuses"),
  getOrderStatus: (id: number) => getStatus("order_statuses", id),
  createOrderStatus: (payload: Omit<CatalogStatus, "status_id">) => createStatus("order_statuses", payload),
  updateOrderStatus: (id: number, payload: Partial<Omit<CatalogStatus, "status_id">>) => updateStatus("order_statuses", id, payload),
  removeOrderStatus: (id: number) => removeStatus("order_statuses", id),
  listPaymentStatuses: () => listStatus("payment_statuses"),
  getPaymentStatus: (id: number) => getStatus("payment_statuses", id),
  createPaymentStatus: (payload: Omit<CatalogStatus, "status_id">) => createStatus("payment_statuses", payload),
  updatePaymentStatus: (id: number, payload: Partial<Omit<CatalogStatus, "status_id">>) => updateStatus("payment_statuses", id, payload),
  removePaymentStatus: (id: number) => removeStatus("payment_statuses", id),
  listReviewStatuses: () => listStatus("review_statuses"),
  getReviewStatus: (id: number) => getStatus("review_statuses", id),
  createReviewStatus: (payload: Omit<CatalogStatus, "status_id">) => createStatus("review_statuses", payload),
  updateReviewStatus: (id: number, payload: Partial<Omit<CatalogStatus, "status_id">>) => updateStatus("review_statuses", id, payload),
  removeReviewStatus: (id: number) => removeStatus("review_statuses", id),
  listVoucherStatuses: () => listStatus("voucher_statuses"),
  getVoucherStatus: (id: number) => getStatus("voucher_statuses", id),
  createVoucherStatus: (payload: Omit<CatalogStatus, "status_id">) => createStatus("voucher_statuses", payload),
  updateVoucherStatus: (id: number, payload: Partial<Omit<CatalogStatus, "status_id">>) => updateStatus("voucher_statuses", id, payload),
  removeVoucherStatus: (id: number) => removeStatus("voucher_statuses", id),
  listUserRoles: async () =>
    unwrapResponse<UserRole[]>(await apiClient.get("/user_roles")),
  getUserRole: async (id: number) =>
    unwrapResponse<UserRole>(await apiClient.get(`/user_roles/${id}`)),
  createUserRole: async (payload: Omit<UserRole, "role_id">) =>
    unwrapResponse<undefined>(await apiClient.post("/user_roles", payload)),
  updateUserRole: async (id: number, payload: Partial<Omit<UserRole, "role_id">>) =>
    unwrapResponse<undefined>(await apiClient.put(`/user_roles/${id}`, payload)),
  removeUserRole: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/user_roles/${id}`)),
  listUserStatuses: async () =>
    unwrapResponse<UserStatus[]>(await apiClient.get("/user_statuses")),
  getUserStatus: async (id: number) =>
    unwrapResponse<UserStatus>(await apiClient.get(`/user_statuses/${id}`)),
  createUserStatus: async (payload: Omit<UserStatus, "status_id">) =>
    unwrapResponse<undefined>(await apiClient.post("/user_statuses", payload)),
  updateUserStatus: async (id: number, payload: Partial<Omit<UserStatus, "status_id">>) =>
    unwrapResponse<undefined>(await apiClient.put(`/user_statuses/${id}`, payload)),
  removeUserStatus: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/user_statuses/${id}`)),
};
