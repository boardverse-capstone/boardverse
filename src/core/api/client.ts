// src/core/api/client.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/store/auth.store';
import type { ApiResponse } from '@/shared/types/api.interface';
import type { LoginResponse } from '@/features/auth/types/auth.interface';
import { ROUTES } from '@/core/constants/routes';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Axios instance chuẩn cho toàn bộ app */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Tự động đính Bearer token vào mọi request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// Unwrap envelope: trả về data bên trong { statusCode, message, data }
// Xử lý 401: tự động refresh token rồi retry request gốc
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  // Unwrap data envelope thành công
  (response) => {
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Nếu là lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu đang refresh → xếp hàng đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setToken, clearAuth } = useAuthStore.getState();

      if (!refreshToken) {
        clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = ROUTES.AUTH.LOGIN;
        }
        return Promise.reject(error);
      }

      try {
        // Gọi trực tiếp axios (không qua apiClient để tránh vòng lặp)
        const response = await axios.post<ApiResponse<LoginResponse>>(
          `${BASE_URL}/api/Auth/refresh-token`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const data = response.data.data as LoginResponse;
        setToken(data.token, data.refreshToken);
        processQueue(null, data.token);

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = ROUTES.AUTH.LOGIN;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Trả về message lỗi từ backend nếu có
    const message =
      error.response?.data?.message ?? error.message ?? 'Đã xảy ra lỗi không xác định.';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
