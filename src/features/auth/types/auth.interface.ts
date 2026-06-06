// src/features/auth/types/auth.interface.ts

/** Payload gửi lên khi đăng nhập */
export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

/** Dữ liệu trả về trong data field khi login thành công */
export interface LoginResponse {
  token: string;
  refreshToken: string;
}

/** Payload gửi lên khi đăng ký */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

/** Payload gửi lên khi yêu cầu refresh token */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Payload gửi lên khi đặt lại mật khẩu */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/** Payload gửi lên khi đổi mật khẩu */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * Thông tin được decode từ JWT token của BoardVerse backend.
 * Các claim sử dụng namespace URI đầy đủ theo chuẩn WS-Security.
 */
export interface DecodedToken {
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
  provider: string;
  exp: number;
  iss: string;
  aud: string;
}

/** Thông tin user được chuẩn hóa sau khi decode token */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  provider: string;
}
