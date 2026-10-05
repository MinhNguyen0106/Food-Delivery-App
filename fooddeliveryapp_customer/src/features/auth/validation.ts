import type { RegisterInput } from '@/types/auth';

export type LoginErrors = Partial<Record<'email' | 'password', string>>;
export type RegisterErrors = Partial<
  Record<
    'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'dateOfBirth',
    string
  >
>;

export function utf8ByteLength(value: string): number {
  return Array.from(value).reduce((byteLength, character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) return byteLength + 1;
    if (codePoint <= 0x7ff) return byteLength + 2;
    if (codePoint <= 0xffff) return byteLength + 3;
    return byteLength + 4;
  }, 0);
}

export function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    errors.email = 'Vui lòng nhập email.';
  } else if (
    normalizedEmail.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    errors.email = 'Vui lòng nhập email hợp lệ.';
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu.';
  } else {
    const passwordBytes = utf8ByteLength(password);
    if (passwordBytes < 8 || passwordBytes > 72) {
      errors.password = 'Mật khẩu cần dài từ 8 đến 72 byte.';
    }
  }

  return errors;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateRegistration(
  input: RegisterInput,
  confirmPassword: string,
): RegisterErrors {
  const errors: RegisterErrors = {};
  const email = input.email.trim();
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên.';
  } else if (fullName.length > 100) {
    errors.fullName = 'Họ và tên không được vượt quá 100 ký tự.';
  }

  if (!email) {
    errors.email = 'Vui lòng nhập email.';
  } else if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Vui lòng nhập email hợp lệ (tối đa 150 ký tự).';
  }

  if (!/^\+?\d{8,15}$/.test(phone)) {
    errors.phone = 'Số điện thoại cần có 8–15 chữ số, có thể bắt đầu bằng dấu +.';
  }

  const passwordBytes = utf8ByteLength(input.password);
  if (passwordBytes < 8 || passwordBytes > 72) {
    errors.password = 'Mật khẩu cần dài từ 8 đến 72 byte.';
  }

  if (confirmPassword !== input.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.';
  }

  if (input.dateOfBirth && !isValidDate(input.dateOfBirth)) {
    errors.dateOfBirth = 'Ngày sinh cần đúng định dạng YYYY-MM-DD.';
  }

  return errors;
}
