// src/features/auth/services/auth.service.ts
import apiClient from '@/core/api/client';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../types/auth.interface';

export const AuthService = {
  /**
   * Đăng nhập – POST /api/Auth/login
   * Response interceptor đã unwrap envelope, trả về LoginResponse trực tiếp.
   */
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<never, LoginResponse>('/api/Auth/login', payload);
  },

  /**
   * Đăng ký – POST /api/Auth/register
   */
  register: async (payload: RegisterRequest): Promise<{ message: string }> => {
    return apiClient.post<never, { message: string }>('/api/Auth/register', payload);
  },

  /**
   * Đăng xuất – POST /api/Auth/logout
   */
  logout: async (payload: RefreshTokenRequest): Promise<void> => {
    return apiClient.post<never, void>('/api/Auth/logout', payload);
  },

  /**
   * Gia hạn access token – POST /api/Auth/refresh-token
   */
  refreshToken: async (payload: RefreshTokenRequest): Promise<LoginResponse> => {
    return apiClient.post<never, LoginResponse>('/api/Auth/refresh-token', payload);
  },

  /**
   * Gửi email xác thực OTP – POST /api/Auth/send-email-verification
   */
  sendEmailVerification: async (email: string): Promise<null> => {
    return apiClient.post<never, null>('/api/Auth/send-email-verification', { email });
  },

  /**
   * Xác thực email bằng OTP code – POST /api/Auth/verify-email
   */
  verifyEmail: async (token: string): Promise<null> => {
    return apiClient.post<never, null>('/api/Auth/verify-email', { token });
  },

  /**
   * Yêu cầu đặt lại mật khẩu – POST /api/Auth/request-password-reset
   */
  requestPasswordReset: async (email: string): Promise<null> => {
    return apiClient.post<never, null>('/api/Auth/request-password-reset', { email });
  },

  /**
   * Đặt lại mật khẩu – POST /api/Auth/reset-password
   */
  resetPassword: async (payload: ResetPasswordRequest): Promise<null> => {
    return apiClient.post<never, null>('/api/Auth/reset-password', payload);
  },

  /**
   * Đổi mật khẩu (yêu cầu Bearer token) – POST /api/Auth/change-password
   */
  changePassword: async (payload: ChangePasswordRequest): Promise<null> => {
    return apiClient.post<never, null>('/api/Auth/change-password', payload);
  },
} as const;
