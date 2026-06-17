'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ProfileProgressUpdateSchema,
  profileToProgressFormValues,
  toProfileProgressPayload,
  zodResolverCompat,
  type ProfileProgressUpdateFormValues,
} from '@/shared/validators/profile.validator';
import { useUpdateProfileProgress } from '../hooks/useUpdateProfileProgress';
import type { UserProfile } from '../types/profile.interface';

interface ProfileProgressDialogProps {
  profile: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileProgressDialog({
  profile,
  open,
  onOpenChange,
}: ProfileProgressDialogProps) {
  const progressMutation = useUpdateProfileProgress();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileProgressUpdateFormValues>({
    resolver: zodResolverCompat(ProfileProgressUpdateSchema),
    defaultValues: profileToProgressFormValues(profile),
  });

  useEffect(() => {
    if (open) {
      reset(profileToProgressFormValues(profile));
    }
  }, [open, profile, reset]);

  const onSubmit = (values: ProfileProgressUpdateFormValues) => {
    const payload = toProfileProgressPayload(values);
    const unchanged =
      payload.globalElo === profile.globalElo && payload.level === profile.level;

    if (unchanged) {
      onOpenChange(false);
      return;
    }

    progressMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật tiến trình</DialogTitle>
          <DialogDescription>
            Chỉnh sửa điểm ELO và level của hồ sơ gamer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="progress-globalElo">Global ELO</Label>
            <Input
              id="progress-globalElo"
              type="number"
              min={0}
              disabled={progressMutation.isPending}
              {...register('globalElo')}
            />
            {errors.globalElo && (
              <p className="text-xs text-destructive">{errors.globalElo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="progress-level">Level</Label>
            <Input
              id="progress-level"
              type="number"
              min={1}
              disabled={progressMutation.isPending}
              {...register('level')}
            />
            {errors.level && (
              <p className="text-xs text-destructive">{errors.level.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={progressMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={progressMutation.isPending}>
              {progressMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu tiến trình'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
