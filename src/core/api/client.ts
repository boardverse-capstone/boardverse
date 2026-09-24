// src/core/api/client.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/store/auth.store';
import type { ApiResponse } from '@/shared/types/api.interface';
import type { LoginResponse } from '@/features/auth/types/auth.interface';
import { buildLoginUrl, saveReturnUrl } from '@/features/auth/utils/redirect.util';

const BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? ''
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? '');

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
    // Gắn timestamp cho response interceptor biết đã gọi bao lâu
    (config as InternalAxiosRequestConfig & { _start?: number })._start =
      Date.now();
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

/**
 * Log Network-style cho MỌI response — đặc biệt giúp debug khi DevTools
 * Network tab bị filter mất (Next dev HMR / cùng origin localhost).
 * Log ở cả 2 nhánh: success và error.
 */
function logNetworkEntry(label: string, info: Record<string, unknown>) {
  // Không log request tới /Auth/* (token, refresh) để tránh spam console
  const url = String(info.url ?? "");
  if (url.includes("/Auth/")) return;
  // eslint-disable-next-line no-console
  console.info(`[api] ${label}`, info);
}

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
    const cfg = response.config as InternalAxiosRequestConfig & {
      _start?: number;
    };
    const dur = cfg._start ? Date.now() - cfg._start : undefined;
    const data = response.data;
    const inner = data?.data !== undefined ? data.data : data;
    logNetworkEntry(
      `← ${response.status} ${cfg.method?.toUpperCase() ?? "GET"} ${cfg.url ?? ""} (${dur ?? "?"}ms)`,
      {
        url: cfg.url,
        method: cfg.method?.toUpperCase(),
        status: response.status,
        durationMs: dur,
        envelope: data && typeof data === "object" ? Object.keys(data) : [],
        dataKeys: inner && typeof inner === "object" ? Object.keys(inner) : [],
        dataSize: inner ? JSON.stringify(inner).length : 0,
      },
    );
    return inner;
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
          const currentPath = window.location.pathname + window.location.search;
          saveReturnUrl(currentPath);
          window.location.replace(buildLoginUrl(currentPath));
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
          const currentPath = window.location.pathname + window.location.search;
          saveReturnUrl(currentPath);
          window.location.replace(buildLoginUrl(currentPath));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Trả về message lỗi từ backend nếu có (envelope + ProblemDetails)
    const data = error.response?.data as
      | (ApiResponse & { title?: string; detail?: string; errors?: unknown })
      | undefined;
    const fromErrors =
      data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors as Record<string, unknown>)
            .flat()
            .map(String)
            .filter(Boolean)
            .join('; ')
        : '';
    const message =
      data?.message ||
      data?.detail ||
      data?.title ||
      fromErrors ||
      error.message ||
      'Đã xảy ra lỗi không xác định.';
    logNetworkEntry(
      `← ${error.response?.status ?? "?"} ${error.config?.method?.toUpperCase() ?? "?"} ${error.config?.url ?? ""} ERROR`,
      {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        responseData: data,
        message,
      },
    );
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
