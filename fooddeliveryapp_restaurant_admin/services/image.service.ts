import apiClient, { unwrapResponse } from "@/services/api.client";
import type { ImageResult } from "@/types/service-api";

function imageForm(file: File): FormData {
  const form = new FormData();
  form.append("image", file);
  return form;
}

export const imageService = {
  async uploadRestaurantImage(id: number, file: File): Promise<ImageResult> {
    return unwrapResponse(
      await apiClient.put<ImageResult>(
        `/restaurants/${id}/image`,
        imageForm(file),
      ),
    );
  },

  async deleteRestaurantImage(id: number): Promise<ImageResult> {
    return unwrapResponse(
      await apiClient.delete<ImageResult>(`/restaurants/${id}/image`),
    );
  },

  async uploadFoodImage(id: number, file: File): Promise<ImageResult> {
    return unwrapResponse(
      await apiClient.put<ImageResult>(`/foods/${id}/image`, imageForm(file)),
    );
  },

  async deleteFoodImage(id: number): Promise<ImageResult> {
    return unwrapResponse(
      await apiClient.delete<ImageResult>(`/foods/${id}/image`),
    );
  },
};
