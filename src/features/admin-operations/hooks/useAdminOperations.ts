'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminOperationsService } from '../services/admin-operations.service';
import type {
  OverrideReservationRefundRequest,
  RunReservationJobPayload,
} from '../types/admin-operations.interface';

export function useRunReservationJob() {
  return useMutation({
    mutationFn: (payload: RunReservationJobPayload) =>
      AdminOperationsService.runReservationJob(payload),
    onSuccess: (result) => {
      toast.success(`Đã xử lý ${result.processed} reservation.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể chạy reservation job.');
    },
  });
}

export function useOverrideReservationRefund() {
  return useMutation({
    mutationFn: ({
      reservationId,
      payload,
    }: {
      reservationId: string;
      payload: OverrideReservationRefundRequest;
    }) =>
      AdminOperationsService.overrideReservationRefund(
        reservationId,
        payload,
      ),
    onSuccess: (result) => {
      toast.success(
        `Đã hoàn ${result.actualRefundAmount.toLocaleString('vi-VN')} BVC.`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Override refund thất bại.');
    },
  });
}
