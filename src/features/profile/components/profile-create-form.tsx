'use client';

import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ProfileCreateSchema,
  toProfileCreatePayload,
  zodResolverCompat,
  type ProfileCreateFormValues,
} from '@/shared/validators/profile.validator';
import { useCreateProfile } from '../hooks/useCreateProfile';

interface ProfileCreateFormProps {
  defaultGamerTag?: string;
}

export function ProfileCreateForm({ defaultGamerTag = '' }: ProfileCreateFormProps) {
  const createMutation = useCreateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileCreateFormValues>({
    resolver: zodResolverCompat(ProfileCreateSchema),
    defaultValues: {
      gamerTag: defaultGamerTag,
      bio: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      homeAddress: '',
    },
  });

  const onSubmit = (values: ProfileCreateFormValues) => {
    createMutation.mutate(toProfileCreatePayload(values));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Bạn chưa có hồ sơ. Điền thông tin bên dưới để tạo hồ sơ mới.
      </p>

      <div className="space-y-2">
        <Label htmlFor="profile-gamerTag">
          Gamer tag <span className="text-destructive">*</span>
        </Label>
        <Input
          id="profile-gamerTag"
          placeholder="vd: jonny_gamer"
          disabled={createMutation.isPending}
          {...register('gamerTag')}
        />
        {errors.gamerTag && (
          <p className="text-xs text-destructive">{errors.gamerTag.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-firstName">Tên</Label>
          <Input
            id="profile-firstName"
            disabled={createMutation.isPending}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-lastName">Họ</Label>
          <Input
            id="profile-lastName"
            disabled={createMutation.isPending}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-bio">Giới thiệu</Label>
        <Textarea
          id="profile-bio"
          rows={3}
          placeholder="Một vài dòng về bạn..."
          disabled={createMutation.isPending}
          {...register('bio')}
        />
        {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-dateOfBirth">Ngày sinh</Label>
          <Input
            id="profile-dateOfBirth"
            type="date"
            disabled={createMutation.isPending}
            {...register('dateOfBirth')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-homeAddress">Địa chỉ</Label>
          <Input
            id="profile-homeAddress"
            placeholder="Địa chỉ liên hệ"
            disabled={createMutation.isPending}
            {...register('homeAddress')}
          />
          {errors.homeAddress && (
            <p className="text-xs text-destructive">{errors.homeAddress.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
        {createMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang tạo hồ sơ...
          </>
        ) : (
          'Tạo hồ sơ'
        )}
      </Button>
    </form>
  );
}
