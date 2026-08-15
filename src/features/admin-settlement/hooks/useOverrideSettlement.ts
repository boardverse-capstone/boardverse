'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminSettlementService } from '../services/admin-settlement.service';
import type { OverrideSettlementRequest } from '../types/admin-settlement.interface';

export function useOverrideSettlement() {
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
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Override settlement thất bại.');
    },
  });
}
