export type ApiEnvelope<T> =
  | {
      success: true;
      data?: T;
      message?: string;
      id?: number;
    }
  | {
      success: false;
      message?: string;
      error?: string;
    };

export interface ApiRequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "/api-proxy"
).replace(/\/+$/, "");

function requestUrl(
  path: string,
  params?: ApiRequestConfig["params"],
): string {
  const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  const url = new URL(`${API_URL}${path}`, origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  config?: ApiRequestConfig,
): Promise<{ data: ApiEnvelope<T> }> {
  const headers = new Headers();
  const token =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("accessToken") ??
        window.localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(requestUrl(path, config?.params), {
    method,
    headers,
    body: requestBody,
    credentials: "omit",
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : text || `Request failed with status ${response.status}`;
    const code =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : undefined;
    throw new ApiClientError(message, response.status, code);
  }

  if (
    !isRecord(payload) ||
    typeof payload.success !== "boolean"
  ) {
    throw new ApiClientError(
      "The API returned an invalid response envelope",
      response.status,
    );
  }

  return { data: payload as ApiEnvelope<T> };
}

const apiClient = {
  get<T>(path: string, config?: ApiRequestConfig) {
    return request<T>("GET", path, undefined, config);
  },
  post<T>(path: string, body?: unknown, config?: ApiRequestConfig) {
    return request<T>("POST", path, body, config);
  },
  put<T>(path: string, body?: unknown, config?: ApiRequestConfig) {
    return request<T>("PUT", path, body, config);
  },
  patch<T>(path: string, body?: unknown, config?: ApiRequestConfig) {
    return request<T>("PATCH", path, body, config);
  },
  delete<T>(path: string, config?: ApiRequestConfig) {
    return request<T>("DELETE", path, undefined, config);
  },
};

export function unwrapResponse<T>(response: {
  data: ApiEnvelope<T>;
}): T {
  if (!response.data.success) {
    throw new ApiClientError(
      response.data.message ?? "API request failed",
      undefined,
      response.data.error,
    );
  }
  if (!("data" in response.data) || response.data.data === undefined) {
    throw new ApiClientError(
      response.data.message ?? "The API response did not include data",
    );
  }
  return response.data.data;
}

export function assertSuccess<T>(response: {
  data: ApiEnvelope<T>;
}): Extract<ApiEnvelope<T>, { success: true }> {
  if (!response.data.success) {
    throw new ApiClientError(
      response.data.message ?? "API request failed",
      undefined,
      response.data.error,
    );
  }
  return response.data;
}

export default apiClient;
