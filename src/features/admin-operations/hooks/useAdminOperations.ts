'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminOperationsService } from '../services/admin-operations.service';
import type {
  OverrideReservationRefundRequest,
  ReleaseSessionDepositPayload,
  RunReservationJobPayload,
  SystemJobType,
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

export function useRunSystemJob() {
  return useMutation({
    mutationFn: (job: SystemJobType) =>
      AdminOperationsService.runSystemJob(job),
    onSuccess: () => {
      toast.success('Tác vụ hệ thống đã chạy xong.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể chạy tác vụ hệ thống.');
    },
  });
}

export function useReleaseSessionDeposit() {
  return useMutation({
    mutationFn: (payload: ReleaseSessionDepositPayload) =>
      AdminOperationsService.releaseSessionDeposit(payload),
    onSuccess: (result) => {
      toast.success(`Settlement đã chuyển sang ${result.status}.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể retry chuyển settlement.');
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
