// src/shared/utils/token.util.ts
import type { DecodedToken, AuthUser } from '@/features/auth/types/auth.interface';

/**
 * Decode JWT payload mà không verify signature.
 * Chỉ dùng để đọc thông tin client-side, không dùng cho authentication.
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Thay thế ký tự base64url sang base64 chuẩn
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Thêm padding cho base64 hợp lệ
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    // Giải mã hỗ trợ ký tự UTF-8 (tiếng Việt, unicode...)
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Chuẩn hóa DecodedToken thành AuthUser object dễ dùng.
 */
export function normalizeUser(decoded: DecodedToken): AuthUser {
  return {
    id: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
    username: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
    email: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
    role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
    provider: decoded.provider,
  };
}

/**
 * Kiểm tra token có hết hạn chưa.
 */
export function isTokenExpired(decoded: DecodedToken): boolean {
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}
