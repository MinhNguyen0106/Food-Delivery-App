import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  AdminSummaryRecord,
  RevenueRecord,
} from "@/types/service-api";

export interface RevenueFilters {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
}

export interface AdminRevenueFilters {
  from?: string;
  to?: string;
  groupBy?: "day" | "month";
}

export const reportService = {
  async getAdminSummary(): Promise<AdminSummaryRecord> {
    return unwrapResponse(
      await apiClient.get<AdminSummaryRecord>("/reports/admin/summary"),
    );
  },

  async getAdminRevenue(
    filters: AdminRevenueFilters = {},
  ): Promise<RevenueRecord[]> {
    return unwrapResponse(
      await apiClient.get<RevenueRecord[]>("/reports/admin/revenue", {
        params: {
          from: filters.from,
          to: filters.to,
          groupBy: filters.groupBy,
        },
      }),
    );
  },

  async getRestaurantRevenue(
    filters: RevenueFilters = {},
  ): Promise<RevenueRecord[]> {
    return unwrapResponse(
      await apiClient.get<RevenueRecord[]>("/reports/restaurant/revenue", {
        params: {
          from: filters.from,
          to: filters.to,
          groupBy: filters.groupBy,
        },
      }),
    );
  },
};
