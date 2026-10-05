import type { DateTime, Id } from "@/types/api";

export interface AdminCategory {
  category_id: Id;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: DateTime;
}

export interface CreateAdminCategoryPayload {
  name: string;
  description?: string | null;
  is_active?: boolean | 0 | 1;
}

export type UpdateAdminCategoryPayload = Partial<CreateAdminCategoryPayload>;
