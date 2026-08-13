'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminWalletService,
  ADMIN_WALLET_QUERY_KEYS,
} from '../services/admin-wallet.service';
import type { AdminRefundListParams, ResolveRefundRequest } from '../types/refund.interface';

export function useAdminRefundRequests(params: AdminRefundListParams) {
  return useQuery({
    queryKey: [
      ADMIN_WALLET_QUERY_KEYS.refunds,
      params.page,
      params.limit,
      params.status,
      params.userId,
    ],
    queryFn: () => AdminWalletService.getRefundRequests(params),
    placeholderData: (previous) => previous,
    staleTime: 5000,
  });
}

export function useAdminRefundDetail(requestId: string | null) {
  return useQuery({
    queryKey: [ADMIN_WALLET_QUERY_KEYS.refundDetail, requestId],
    queryFn: () => AdminWalletService.getRefundRequestById(requestId!),
    enabled: Boolean(requestId?.trim()),
  });
}

export function useResolveRefundRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: ResolveRefundRequest;
    }) => AdminWalletService.resolveRefundRequest(requestId, payload),
    onSuccess: (data) => {
      toast.success(
        data.status === 'Approved'
          ? 'Đã duyệt hoàn BVC.'
          : 'Đã từ chối yêu cầu hoàn BVC.',
      );
      queryClient.invalidateQueries({ queryKey: [ADMIN_WALLET_QUERY_KEYS.refunds] });
      queryClient.invalidateQueries({
        queryKey: [ADMIN_WALLET_QUERY_KEYS.refundDetail, data.id],
      });
      queryClient.invalidateQueries({ queryKey: [ADMIN_WALLET_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_WALLET_QUERY_KEYS.detail] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_WALLET_QUERY_KEYS.transactions] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Xử lý yêu cầu hoàn thất bại.');
    },
  });
}
