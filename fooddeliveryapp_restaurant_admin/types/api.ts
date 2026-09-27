export type Id = number;
export type DateTime = string;

export interface ApiError {
  message: string;
  status?: number;
}

export interface MutationResult {
  success: boolean;
  message?: string;
  id?: Id;
  affectedRows?: number;
}
