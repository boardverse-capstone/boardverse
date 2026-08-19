// src/shared/types/api.interface.ts

/**
 * Cấu trúc envelope chuẩn của mọi API response từ BoardVerse backend.
 * data có thể là null khi endpoint không trả về payload.
 */
export interface ApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data: T | null;
  timestamp: string;
  path: string;
}
