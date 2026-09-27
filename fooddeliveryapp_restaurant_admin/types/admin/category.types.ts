import type { DateTime, Id } from "@/types/api";

export interface AdminCategory {
  category_id: Id;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: DateTime;
}

export type CreateAdminCategoryPayload = Omit<AdminCategory, "category_id" | "created_at">;
export type UpdateAdminCategoryPayload = Partial<CreateAdminCategoryPayload>;
