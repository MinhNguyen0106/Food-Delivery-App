import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  Admin,
  CreateAdminPayload,
  UpdateAdminPayload,
} from "@/types/admin";

export const adminService = {
  list: async () => unwrapResponse<Admin[]>(await apiClient.get("/admins")),
  getById: async (id: number) => unwrapResponse<Admin>(await apiClient.get(`/admins/${id}`)),
  create: async (payload: CreateAdminPayload) =>
    unwrapResponse<undefined>(await apiClient.post("/admins", payload)),
  update: async (id: number, payload: UpdateAdminPayload) =>
    unwrapResponse<undefined>(await apiClient.put(`/admins/${id}`, payload)),
  remove: async (id: number) =>
    unwrapResponse<undefined>(await apiClient.delete(`/admins/${id}`)),
};
