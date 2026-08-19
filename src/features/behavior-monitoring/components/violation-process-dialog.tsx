'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { PENALTY_TYPES } from '@/core/constants/behavior-monitoring';
import {
  ViolationProcessSchema,
  zodResolverCompat,
  type ViolationProcessFormValues,
} from '@/shared/validators/behavior-monitoring.validator';
import { useProcessViolation } from '../hooks/useProcessViolation';
import type { LowKarmaUser } from '../types/behavior.interface';

interface ViolationProcessDialogProps {
  user: LowKarmaUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViolationProcessDialog({ user, open, onOpenChange }: ViolationProcessDialogProps) {
  const mutation = useProcessViolation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ViolationProcessFormValues>({
    resolver: zodResolverCompat(ViolationProcessSchema),
    defaultValues: {
      penaltyType: 'warning',
      blockDays: undefined,
      reason: '',
    },
  });

  const penaltyType = watch('penaltyType');

  useEffect(() => {
    if (!open) {
      reset({ penaltyType: 'warning', blockDays: undefined, reason: '' });
    }
  }, [open, reset]);

  if (!user) return null;

  const onSubmit = (values: ViolationProcessFormValues) => {
    mutation.mutate(
      {
        userId: user.id,
        penaltyType: values.penaltyType,
        blockDays: values.penaltyType === 'timed_block' ? values.blockDays : undefined,
        reason: values.reason.trim(),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Xử lý vi phạm — {user.username}</DialogTitle>
            <DialogDescription>
              Karma hiện tại: <strong>{user.karmaPoints}</strong>. Chọn hình thức chế tài và nhập
              lý do kỷ luật.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="penaltyType">Hình thức phạt</Label>
            <Select
              value={penaltyType}
              onValueChange={(value) =>
                setValue('penaltyType', value as ViolationProcessFormValues['penaltyType'], {
                  shouldValidate: true,
                })
              }
              disabled={mutation.isPending}
            >
              <SelectTrigger id="penaltyType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PENALTY_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {penaltyType === 'timed_block' && (
            <div className="space-y-2">
              <Label htmlFor="blockDays">Số ngày Suspend (1–365)</Label>
              <Input
                id="blockDays"
                type="number"
                min={1}
                max={365}
                placeholder="Ví dụ: 7"
                disabled={mutation.isPending}
                {...register('blockDays', { valueAsNumber: true })}
              />
              {errors.blockDays && (
                <p className="text-xs text-destructive">{errors.blockDays.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="violation-reason">Lý do kỷ luật</Label>
            <Textarea
              id="violation-reason"
              rows={4}
              placeholder="Mô tả chi tiết hành vi vi phạm..."
              disabled={mutation.isPending}
              {...register('reason')}
            />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Spinner className="mr-2" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận xử phạt'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
