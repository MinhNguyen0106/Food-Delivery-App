import axios from "axios";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  id?: number;
  affectedRows?: number;
  error?: string;
}

export function unwrapResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(
      response.data.message ?? response.data.error ?? "API request failed",
    );
  }
  return response.data.data as T;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("accessToken") ?? localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "API request failed";
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
