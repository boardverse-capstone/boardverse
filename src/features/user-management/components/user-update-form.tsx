'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  UpdateUserSchema,
  zodResolverCompat,
  type UpdateUserFormValues,
} from '@/shared/validators/user-management.validator';
import { useUpdateUser } from '../hooks/useUpdateUser';
import { UserRoleBadge } from './user-role-badge';
import type { ManagedUser } from '../types/user.interface';

interface UserUpdateFormProps {
  user: ManagedUser;
}

export function UserUpdateForm({ user }: UserUpdateFormProps) {
  const updateMutation = useUpdateUser(user.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolverCompat(UpdateUserSchema),
    defaultValues: {
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    reset({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
    });
  }, [user, reset]);

  const onSubmit = (values: UpdateUserFormValues) => {
    updateMutation.mutate({
      username: values.username.trim(),
      email: values.email.trim(),
      isActive: values.isActive,
      ...(values.password ? { password: values.password } : {}),
    });
  };

  return (
    <Card id="user-update-form" className="border-indigo-100 shadow-sm">
      <CardHeader>
        <CardTitle>Cập nhật tài khoản</CardTitle>
        <CardDescription>
          Chỉnh sửa username, email, mật khẩu và trạng thái hoạt động. Vai trò không thể thay đổi
          tại đây.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="update-username">Username</Label>
              <Input
                id="update-username"
                disabled={updateMutation.isPending}
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="update-email">Email</Label>
              <Input
                id="update-email"
                type="email"
                disabled={updateMutation.isPending}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vai trò hiện tại</Label>
            <div>
              <UserRoleBadge role={user.role} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3">
            <div>
              <Label htmlFor="update-isActive">Trạng thái hoạt động</Label>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Tài khoản đang được phép sử dụng' : 'Tài khoản đang bị vô hiệu hóa'}
              </p>
            </div>
            <Switch
              id="update-isActive"
              checked={isActive}
              disabled={updateMutation.isPending}
              onCheckedChange={(checked) =>
                setValue('isActive', checked, { shouldValidate: true, shouldDirty: true })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="update-password">Mật khẩu mới (tùy chọn)</Label>
              <Input
                id="update-password"
                type="password"
                placeholder="Để trống nếu không đổi"
                disabled={updateMutation.isPending}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="update-confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="update-confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                disabled={updateMutation.isPending}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
