"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MANAGER_CAFE_QUERY_KEYS,
  ManagerCafeService,
} from "../services/manager-cafe.service";
import type {
  AddCafeStaffInput,
  CreateSePayAccountInput,
  DepositRefundPolicy,
  PricingConfig,
  SePayConfig,
  UpdateDepositRefundPolicyInput,
  UpdatePricingConfigInput,
  UpdateSePayConfigInput,
} from "../types/manager-cafe.interface";

/**
 * useCafeMe — đọc cafe aggregate của manager hiện tại.
 * Đây là **nguồn chính thức** cho cả:
 *   - `operationalStatus`, `canActivate`, `activationBlockers` (form activate)
 *   - Hồ sơ vận hành (`operationalProfile`) — form vận hành hydrate từ đây,
 *     không cần gọi GET /partner/me/operational-profile riêng.
 */
export function useCafeMe() {
  return useQuery({
    queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
    queryFn: () => ManagerCafeService.getMe(),
    staleTime: 30_000,
  });
}

/**
 * useActivateCafe — mutation POST /api/manager/cafes/me/activate.
 * Sau khi thành công, invalidate `manager-cafe-me` để form re-hydrate
 * với operationalStatus mới.
 */
export function useActivateCafe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ManagerCafeService.activate(),
    onSuccess: () => {
      toast.success("Đã kích hoạt cơ sở.");
      void queryClient.invalidateQueries({
        queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
      });
    },
    onError: (error: Error) => {
      // Toast handled ở dialog-level cho network/5xx; im lặng cho 422
      // (sẽ được dialog hiển thị inline). 401/403 đã có interceptor xử lý.
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Kích hoạt thất bại.");
      }
    },
  });
}

/**
 * useDeactivateCafe — mutation POST /api/manager/cafes/me/deactivate.
 * ACTIVE → DATA_BLANK (tạm dừng hoạt động, vẫn có thể kích hoạt lại).
 */
export function useDeactivateCafe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ManagerCafeService.deactivate(),
    onSuccess: () => {
      toast.success("Đã tạm dừng cơ sở.");
      void queryClient.invalidateQueries({
        queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
      });
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Tạm dừng thất bại.");
      }
    },
  });
}

/**
 * useCloseCafe — mutation POST /api/manager/cafes/me/close.
 * ACTIVE/DATA_BLANK → INACTIVE (ngừng kinh doanh, có thể mở lại bằng reopen).
 */
export function useCloseCafe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ManagerCafeService.close(),
    onSuccess: () => {
      toast.success("Đã ngừng kinh doanh cơ sở.");
      void queryClient.invalidateQueries({
        queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
      });
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Ngừng kinh doanh thất bại.");
      }
    },
  });
}

/**
 * useReopenCafe — mutation POST /api/manager/cafes/me/reopen.
 * INACTIVE → ACTIVE khi đủ điều kiện ràng buộc.
 */
export function useReopenCafe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ManagerCafeService.reopen(),
    onSuccess: () => {
      toast.success("Đã mở lại cơ sở.");
      void queryClient.invalidateQueries({
        queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
      });
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Mở lại cơ sở thất bại.");
      }
    },
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * SePay config — GET /api/sepay-accounts/my-cafe
 * ────────────────────────────────────────────────────────────────────── */

export function useSePayConfig(cafeId: string | undefined) {
  return useQuery({
    queryKey: [MANAGER_CAFE_QUERY_KEYS.sepayConfig(cafeId ?? "_")],
    queryFn: () => ManagerCafeService.getSePayConfig(),
    enabled: !!cafeId,
    staleTime: 60_000,
  });
}

export function useUpdateSePayConfig(cafeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    SePayConfig | null,
    Error,
    UpdateSePayConfigInput
  >({
    mutationFn: (input) => {
      if (!cafeId) throw new Error("Thiếu cafeId");
      return ManagerCafeService.updateSePayConfig(cafeId, input);
    },
    onSuccess: () => {
      toast.success("Đã lưu cấu hình SePay.");
      if (cafeId) {
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.sepayConfig(cafeId)],
        });
      }
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Lưu cấu hình SePay thất bại.");
      }
    },
  });
}

/**
 * useCreateSePayAccount — POST /api/sepay-accounts/my-cafe.
 * Dùng cho lần đầu tiên Manager tạo SePay account. Sau khi tạo,
 * invalidate cả `sepayConfig` (để GET trả về config mới) lẫn `me`
 * (vì cafe aggregate có thể đã đánh dấu setup complete).
 */
export function useCreateSePayAccount(cafeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    SePayConfig | null,
    Error,
    CreateSePayAccountInput
  >({
    mutationFn: (input) => ManagerCafeService.createSePayAccount(input),
    onSuccess: () => {
      toast.success("Đã tạo tài khoản SePay.");
      if (cafeId) {
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.sepayConfig(cafeId)],
        });
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
        });
      }
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Tạo tài khoản SePay thất bại.");
      }
    },
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Deposit refund policy — GET/PATCH /api/cafes/{id}/deposit-refund-policy
 * ────────────────────────────────────────────────────────────────────── */

export function useDepositRefundPolicy(cafeId: string | undefined) {
  return useQuery({
    queryKey: [MANAGER_CAFE_QUERY_KEYS.depositRefund(cafeId ?? "_")],
    queryFn: () =>
      cafeId
        ? ManagerCafeService.getDepositRefundPolicy(cafeId)
        : Promise.resolve(null),
    enabled: !!cafeId,
    staleTime: 60_000,
  });
}

export function useUpdateDepositRefundPolicy(cafeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    DepositRefundPolicy | null,
    Error,
    UpdateDepositRefundPolicyInput
  >({
    mutationFn: (input) => {
      if (!cafeId) throw new Error("Thiếu cafeId");
      return ManagerCafeService.updateDepositRefundPolicy(cafeId, input);
    },
    onSuccess: () => {
      toast.success("Đã cập nhật chính sách hoàn cọc.");
      if (cafeId) {
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.depositRefund(cafeId)],
        });
      }
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Cập nhật chính sách thất bại.");
      }
    },
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Pricing config — GET/PUT /api/cafes/{id}/pricing-config
 * BR-04: chỉ cho phép khi quán đóng cửa (IsPricingLocked=false).
 * ────────────────────────────────────────────────────────────────────── */

export function usePricingConfig(cafeId: string | undefined) {
  return useQuery({
    queryKey: [MANAGER_CAFE_QUERY_KEYS.pricingConfig(cafeId ?? "_")],
    queryFn: () =>
      cafeId
        ? ManagerCafeService.getPricingConfig(cafeId)
        : Promise.resolve(null),
    enabled: !!cafeId,
    staleTime: 60_000,
  });
}

export function useUpdatePricingConfig(cafeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    PricingConfig | null,
    Error,
    UpdatePricingConfigInput
  >({
    mutationFn: (input) => {
      if (!cafeId) throw new Error("Thiếu cafeId");
      return ManagerCafeService.updatePricingConfig(cafeId, input);
    },
    onSuccess: () => {
      toast.success("Đã cập nhật biểu phí.");
      if (cafeId) {
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.pricingConfig(cafeId)],
        });
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
        });
      }
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Cập nhật biểu phí thất bại.");
      }
    },
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Staff — GET/POST/DELETE /api/cafes/{cafeId}/staff
 * ────────────────────────────────────────────────────────────────────── */

export function useStaff(cafeId: string | undefined) {
  return useQuery({
    queryKey: [MANAGER_CAFE_QUERY_KEYS.staff(cafeId ?? "_")],
    queryFn: () =>
      cafeId ? ManagerCafeService.listStaff(cafeId) : Promise.resolve([]),
    enabled: !!cafeId,
    staleTime: 30_000,
  });
}

export function useAddStaff(cafeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCafeStaffInput) => {
      if (!cafeId) throw new Error("Thiếu cafeId");
      return ManagerCafeService.addStaff(cafeId, input);
    },
    onSuccess: () => {
      toast.success("Đã thêm nhân viên.");
      if (cafeId) {
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.staff(cafeId)],
        });
      }
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Thêm nhân viên thất bại.");
      }
    },
  });
}

export function useRemoveStaff(cafeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => {
      if (!cafeId) throw new Error("Thiếu cafeId");
      return ManagerCafeService.removeStaff(cafeId, staffId);
    },
    onSuccess: () => {
      toast.success("Đã gỡ nhân viên.");
      if (cafeId) {
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.staff(cafeId)],
        });
      }
    },
    onError: (error: Error) => {
      if (!/422|validation/i.test(error.message)) {
        toast.error(error.message ?? "Gỡ nhân viên thất bại.");
      }
    },
  });
}