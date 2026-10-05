import { apiRequest } from '@/services/api/client';
import type {
  LoginResponse,
  RegisterInput,
  RegisterResponse,
} from '@/types/auth';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (
    !data ||
    typeof data.token !== 'string' ||
    data.token.length === 0 ||
    !Number.isFinite(data.expiresIn) ||
    data.expiresIn <= 0 ||
    typeof data.user?.role !== 'string' ||
    typeof data.user.userId !== 'number' ||
    typeof data.user.email !== 'string'
  ) {
    throw new Error('Máy chủ trả về thông tin đăng nhập không đúng cấu trúc.');
  }

  if (data.user.role !== 'CUSTOMER') {
    throw new Error('Tài khoản này không có quyền truy cập ứng dụng khách hàng.');
  }

  return data;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const data = await apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: input,
  });

  if (
    !data ||
    !data.user ||
    typeof data.user.userId !== 'number' ||
    typeof data.user.customerId !== 'number' ||
    typeof data.user.email !== 'string' ||
    typeof data.user.role !== 'string'
  ) {
    throw new Error('Máy chủ trả về thông tin đăng ký không đúng cấu trúc.');
  }

  if (data.user.role !== 'CUSTOMER') {
    throw new Error('Máy chủ không tạo đúng loại tài khoản khách hàng.');
  }

  return data;
}
