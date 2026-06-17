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
import { Textarea } from '@/components/ui/textarea';
import {
  ProfileUpdateSchema,
  profileToUpdateFormValues,
  toProfileUpdatePayload,
  zodResolverCompat,
  type ProfileUpdateFormValues,
} from '@/shared/validators/profile.validator';
import { toast } from 'sonner';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import type { UserProfile } from '../types/profile.interface';

interface ProfileUpdateDialogProps {
  profile: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileUpdateDialog({ profile, open, onOpenChange }: ProfileUpdateDialogProps) {
  const updateMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolverCompat(ProfileUpdateSchema),
    defaultValues: profileToUpdateFormValues(profile),
  });

  useEffect(() => {
    if (open) {
      reset(profileToUpdateFormValues(profile));
    }
  }, [open, profile, reset]);

  const onSubmit = (values: ProfileUpdateFormValues) => {
    const payload = toProfileUpdatePayload(values);

    if (Object.keys(payload).length === 0) {
      toast.error('Vui lòng thay đổi ít nhất một trường.');
      return;
    }

    updateMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cập nhật hồ sơ</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin hồ sơ của bạn. Các thay đổi sẽ được lưu qua API UserProfile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="update-gamerTag">Gamer tag</Label>
            <Input
              id="update-gamerTag"
              disabled={updateMutation.isPending}
              {...register('gamerTag')}
            />
            {errors.gamerTag && (
              <p className="text-xs text-destructive">{errors.gamerTag.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="update-firstName">Tên</Label>
              <Input
                id="update-firstName"
                disabled={updateMutation.isPending}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-lastName">Họ</Label>
              <Input
                id="update-lastName"
                disabled={updateMutation.isPending}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="update-bio">Giới thiệu</Label>
            <Textarea
              id="update-bio"
              rows={3}
              disabled={updateMutation.isPending}
              {...register('bio')}
            />
            {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="update-dateOfBirth">Ngày sinh</Label>
              <Input
                id="update-dateOfBirth"
                type="date"
                disabled={updateMutation.isPending}
                {...register('dateOfBirth')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-homeAddress">Địa chỉ</Label>
              <Input
                id="update-homeAddress"
                disabled={updateMutation.isPending}
                {...register('homeAddress')}
              />
              {errors.homeAddress && (
                <p className="text-xs text-destructive">{errors.homeAddress.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
