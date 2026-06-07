// src/features/auth/store/auth.store.ts
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '../types/auth.interface';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  _hasHydrated: boolean;

  /** Lưu token, refreshToken và thông tin user vào store */
  setAuth: (token: string, refreshToken: string, user: AuthUser) => void;

  /** Cập nhật token mới sau khi refresh (giữ nguyên refreshToken nếu không thay đổi) */
  setToken: (token: string, refreshToken: string) => void;

  /** Xóa toàn bộ auth state (logout) */
  clearAuth: () => void;

  /** Đánh dấu đã đọc xong token từ localStorage (sau F5) */
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      _hasHydrated: false,

      setAuth: (token, refreshToken, user) => set({ token, refreshToken, user }),
      setToken: (token, refreshToken) => set({ token, refreshToken }),
      clearAuth: () => set({ token: null, refreshToken: null, user: null }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'boardverse-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
