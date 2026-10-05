import apiClient, { assertSuccess, unwrapResponse } from "@/services/api.client";
import type { ActorProfile } from "@/types/service-api";

export interface LoginResult {
  token: string;
  expiresIn: number;
  user: ActorProfile;
}

export interface AdminProfileUpdate {
  email?: string;
  fullName?: string;
}

export interface RegisterCustomerInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  dateOfBirth?: string | null;
}

export interface RegisterCustomerResult {
  user: {
    userId: number;
    customerId: number;
    email: string;
    role: "CUSTOMER";
    fullName: string;
    phone: string;
    dateOfBirth: string | null;
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    const result = unwrapResponse(
      await apiClient.post<LoginResult>("/auth/login", { email, password }),
    );
    if (typeof window !== "undefined") {
      window.localStorage.setItem("accessToken", result.token);
      window.localStorage.removeItem("token");
    }
    return result;
  },

  async registerCustomer(input: RegisterCustomerInput): Promise<RegisterCustomerResult> {
    return unwrapResponse(
      await apiClient.post<RegisterCustomerResult>("/auth/register", input),
    );
  },

  async getProfile(): Promise<ActorProfile> {
    return unwrapResponse(
      await apiClient.get<ActorProfile>("/auth/me"),
    );
  },

  async updateRestaurantEmail(email: string): Promise<ActorProfile> {
    if (!email.trim()) throw new Error("Restaurant email must not be empty");
    return unwrapResponse(
      await apiClient.patch<ActorProfile>("/auth/me", { email }),
    );
  },

  async updateAdminProfile(
    fields: AdminProfileUpdate,
  ): Promise<ActorProfile> {
    if (Object.keys(fields).length === 0) {
      throw new Error("At least one Admin profile field must be provided");
    }
    return unwrapResponse(
      await apiClient.patch<ActorProfile>("/auth/me", fields),
    );
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const response = await apiClient.post<never>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    assertSuccess(response);
  },

  async logout(): Promise<void> {
    try {
      const response = await apiClient.post<never>("/auth/logout");
      assertSuccess(response);
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("token");
      }
    }
  },
};
