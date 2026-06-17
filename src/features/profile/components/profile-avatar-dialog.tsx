'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  ProfileAvatarUpdateSchema,
  profileToAvatarFormValues,
  toProfileAvatarPayload,
  zodResolverCompat,
  type ProfileAvatarUpdateFormValues,
} from '@/shared/validators/profile.validator';
import { useUpdateProfileAvatar } from '../hooks/useUpdateProfileAvatar';
import type { UserProfile } from '../types/profile.interface';

interface ProfileAvatarDialogProps {
  profile: UserProfile;
  displayName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileAvatarDialog({
  profile,
  displayName,
  open,
  onOpenChange,
}: ProfileAvatarDialogProps) {
  const avatarMutation = useUpdateProfileAvatar();
  const initials = displayName.slice(0, 2).toUpperCase();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProfileAvatarUpdateFormValues>({
    resolver: zodResolverCompat(ProfileAvatarUpdateSchema),
    defaultValues: profileToAvatarFormValues(profile),
  });

  const avatarUrl = useWatch({ control, name: 'avatarUrl' });

  useEffect(() => {
    if (open) {
      reset(profileToAvatarFormValues(profile));
    }
  }, [open, profile, reset]);

  const onSubmit = (values: ProfileAvatarUpdateFormValues) => {
    const payload = toProfileAvatarPayload(values);

    if (payload.avatarUrl === (profile.avatarUrl ?? '')) {
      onOpenChange(false);
      return;
    }

    avatarMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const previewUrl = avatarUrl?.trim() || profile.avatarUrl || undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật avatar</DialogTitle>
          <DialogDescription>
            Nhập URL ảnh đại diện mới (https). Ảnh sẽ được lưu qua API UserProfile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-url">URL ảnh đại diện</Label>
            <Input
              id="avatar-url"
              type="url"
              placeholder="https://..."
              disabled={avatarMutation.isPending}
              {...register('avatarUrl')}
            />
            {errors.avatarUrl && (
              <p className="text-xs text-destructive">{errors.avatarUrl.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={avatarMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={avatarMutation.isPending}>
              {avatarMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu avatar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
