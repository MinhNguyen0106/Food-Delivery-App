import apiClient, { unwrapResponse } from "@/services/api.client";
import type {
  ReviewModerationResult,
  ReviewRecord,
  ReviewStatus,
} from "@/types/service-api";

export const reviewService = {
  async getRestaurantReviews(): Promise<ReviewRecord[]> {
    return unwrapResponse(
      await apiClient.get<ReviewRecord[]>("/reviews/restaurant/mine"),
    );
  },

  async getReviews(status?: ReviewStatus): Promise<ReviewRecord[]> {
    return unwrapResponse(
      await apiClient.get<ReviewRecord[]>("/reviews", {
        params: { status },
      }),
    );
  },

  async getReview(id: number): Promise<ReviewRecord> {
    return unwrapResponse(
      await apiClient.get<ReviewRecord>(`/reviews/${id}`),
    );
  },

  async setModerationStatus(
    id: number,
    status: Exclude<ReviewStatus, "PENDING">,
  ): Promise<ReviewModerationResult> {
    return unwrapResponse(
      await apiClient.patch<ReviewModerationResult>(
        `/reviews/${id}/status`,
        { status },
      ),
    );
  },
};
