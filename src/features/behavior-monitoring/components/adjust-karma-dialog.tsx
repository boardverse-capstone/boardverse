'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AdjustKarmaSchema,
  zodResolverCompat,
  type AdjustKarmaFormValues,
} from '@/shared/validators/behavior-monitoring.validator';
import { useAdjustKarma } from '../hooks/useAdjustKarma';

interface AdjustKarmaDialogProps {
  userId: string;
  username: string;
  currentKarma: number;
}

export function AdjustKarmaDialog({ userId, username, currentKarma }: AdjustKarmaDialogProps) {
  const mutation = useAdjustKarma(userId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AdjustKarmaFormValues>({
    resolver: zodResolverCompat(AdjustKarmaSchema),
    defaultValues: { delta: 0, reason: '' },
  });

  const delta = watch('delta');
  const previewKarma = Math.max(0, currentKarma + (Number(delta) || 0));

  useEffect(() => {
    if (!mutation.isSuccess) return;
    reset({ delta: 0, reason: '' });
  }, [mutation.isSuccess, reset]);

  const onSubmit = (values: AdjustKarmaFormValues) => {
    mutation.mutate(
      {
        userId,
        delta: values.delta,
        reason: values.reason.trim(),
        currentKarma,
      },
      { onSuccess: () => reset() },
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-violet-200 text-violet-800">
          <Scale className="mr-2 h-4 w-4" />
          Điều chỉnh Karma thủ công
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Điều chỉnh Karma — {username}</DialogTitle>
            <DialogDescription>
              Karma hiện tại: <strong>{currentKarma}</strong>. Nhập số nguyên âm hoặc dương để
              cộng/trừ điểm (PUT /api/UserManagement/{'{id}'}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="karma-delta">Điểm thay đổi (+/-)</Label>
            <Input
              id="karma-delta"
              type="number"
              step={1}
              placeholder="Ví dụ: -10 hoặc +5"
              disabled={mutation.isPending}
              {...register('delta', { valueAsNumber: true })}
            />
            {errors.delta && <p className="text-xs text-destructive">{errors.delta.message}</p>}
            <p className="text-xs text-muted-foreground">
              Karma sau điều chỉnh: <strong>{previewKarma}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="karma-reason">Lý do</Label>
            <Textarea
              id="karma-reason"
              rows={3}
              placeholder="Phục vụ xử lý khiếu nại, khiếu nại tranh chấp..."
              disabled={mutation.isPending}
              {...register('reason')}
            />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Áp dụng điều chỉnh'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
