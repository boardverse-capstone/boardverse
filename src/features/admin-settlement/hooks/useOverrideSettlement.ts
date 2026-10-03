'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ADMIN_SETTLEMENT_QUERY_KEYS,
  AdminSettlementService,
} from '../services/admin-settlement.service';
import type { OverrideSettlementRequest } from '../types/admin-settlement.interface';

export function useOverrideSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      settlementId,
      payload,
    }: {
      settlementId: string;
      payload: OverrideSettlementRequest;
    }) => AdminSettlementService.overrideSettlement(settlementId, payload),
    onSuccess: (result) => {
      toast.success(`Đã override settlement ${result.id}.`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_SETTLEMENT_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_SETTLEMENT_QUERY_KEYS.failed] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Override settlement thất bại.');
    },
  });
}
