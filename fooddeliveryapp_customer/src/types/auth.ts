export interface CustomerUser {
  userId: number;
  email: string;
  role: string;
  customer?: {
    customerId?: number;
    fullName?: string;
    phone?: string;
    dateOfBirth?: string | null;
  };
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: CustomerUser;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  dateOfBirth?: string;
}

export interface RegisterResponse {
  user: {
    userId: number;
    customerId: number;
    email: string;
    role: string;
    fullName: string;
    phone: string;
    dateOfBirth?: string | null;
  };
}
