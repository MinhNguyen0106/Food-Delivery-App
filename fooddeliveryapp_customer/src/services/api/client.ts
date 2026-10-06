export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!configuredUrl) {
    throw new Error(
      'Chưa cấu hình EXPO_PUBLIC_API_BASE_URL. Hãy thêm URL backend vào file .env.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL phải là một URL HTTP hoặc HTTPS hợp lệ.');
  }

  if (
    (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') ||
    parsedUrl.search.length > 0 ||
    parsedUrl.hash.length > 0
  ) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL phải là một URL HTTP hoặc HTTPS hợp lệ.');
  }

  const path = parsedUrl.pathname.replace(/\/+$/, '');
  const basePath = path.endsWith('/api') ? path : `${path}/api`;
  return `${parsedUrl.origin}${basePath}`;
}

export function resolveApiAssetUrl(path: string | null): string {
  if (!path) {
    return '';
  }

  try {
    return new URL(path).toString();
  } catch {
    if (!path.startsWith('/uploads/')) {
      return '';
    }
    const apiUrl = new URL(getApiBaseUrl());
    const serviceRootPath = apiUrl.pathname.replace(/\/api\/?$/, '');
    const serviceRoot = new URL(`${serviceRootPath}/`, apiUrl.origin);
    return new URL(path.slice(1), serviceRoot).toString();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
    token?: string;
    allowMessageOnlySuccess?: boolean;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const url = `${getApiBaseUrl()}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Không thể kết nối đến máy chủ. Kiểm tra URL backend và kết nối mạng. (${error.message})`,
      );
    }
    throw new Error('Không thể kết nối đến máy chủ. Kiểm tra URL backend và kết nối mạng.');
  }

  const responseText = await response.text();
  let payload: unknown;

  try {
    payload = responseText.length > 0 ? JSON.parse(responseText) : null;
  } catch {
    if (!response.ok) {
      throw new ApiError(`Yêu cầu thất bại (HTTP ${response.status}).`, response.status);
    }
    throw new Error('Máy chủ trả về dữ liệu không đúng định dạng JSON.');
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : `Yêu cầu thất bại (HTTP ${response.status}).`;
    const code =
      isRecord(payload) && typeof payload.error === 'string' ? payload.error : undefined;
    throw new ApiError(message, response.status, code);
  }

  if (!isRecord(payload) || payload.success !== true) {
    throw new Error('Máy chủ trả về response thành công không đúng cấu trúc API.');
  }

  if ('data' in payload) {
    return payload.data as T;
  }

  if (options.allowMessageOnlySuccess && typeof payload.message === 'string') {
    return undefined as T;
  }

  throw new Error('Máy chủ trả về response thành công không đúng cấu trúc API.');

}

export function getErrorMessage(
  error: unknown,
  context?: 'login' | 'change-password',
): string {
  if (error instanceof ApiError) {
    if (context === 'login' && (error.status === 401 || error.status === 403)) {
      return 'Tài khoản hoặc mật khẩu không đúng.';
    }
    if (error.status === 401) {
      if (error.code === 'INVALID_TOKEN' || error.code === 'UNAUTHENTICATED') {
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      }
      if (error.code === 'INVALID_CREDENTIALS' && context === 'change-password') {
        return 'Mật khẩu hiện tại chưa chính xác.';
      }
      return error.message;
    }
    if (error.status === 403) {
      return error.code === 'ACCOUNT_LOCKED' || error.code === 'ACCOUNT_SUSPENDED'
        ? 'Tài khoản hiện không hoạt động.'
        : 'Tài khoản không được phép truy cập chức năng này.';
    }
    if (error.status === 409) {
      const conflictMessages: Record<string, string> = {
        ACCOUNT_EXISTS: 'Email hoặc số điện thoại đã được sử dụng.',
        ADDRESS_LIMIT_REACHED: 'Bạn chỉ có thể lưu tối đa 3 địa chỉ. Hãy xóa một địa chỉ cũ nếu muốn thêm địa chỉ mới.',
        EMPTY_CART: 'Giỏ hàng đang trống.',
        CART_RESTAURANT_MISMATCH: 'Giỏ hàng chỉ có thể chứa món từ một nhà hàng.',
        FOOD_UNAVAILABLE: 'Một món trong giỏ hiện không còn phục vụ.',
        ADDRESS_IN_USE: 'Địa chỉ đang được đơn hàng sử dụng nên chưa thể xóa.',
        ORDER_NOT_COMPLETED: 'Chỉ đơn đã hoàn thành mới có thể được đánh giá.',
        REVIEW_ALREADY_EXISTS: 'Đơn hàng này đã được đánh giá.',
        INVALID_TRANSITION: 'Đơn hàng đã thay đổi trạng thái và không thể thực hiện thao tác này.',
        VOUCHER_INVALID: 'Mã ưu đãi không hợp lệ.',
        VOUCHER_INACTIVE: 'Mã ưu đãi hiện không hoạt động.',
        VOUCHER_EXPIRED: 'Mã ưu đãi đã hết hạn.',
        VOUCHER_EXHAUSTED: 'Mã ưu đãi đã hết lượt sử dụng.',
        VOUCHER_MINIMUM_NOT_MET: 'Đơn hàng chưa đạt giá trị tối thiểu của mã ưu đãi.',
      };
      return error.code ? conflictMessages[error.code] ?? error.message : error.message;
    }
    if (error.status === 400) {
      return 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại các trường.';
    }
    return error.message;
  }

  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}
