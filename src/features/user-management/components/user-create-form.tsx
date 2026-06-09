'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CREATE_USER_ROLES } from '@/core/constants/user-management';
import { ROUTES } from '@/core/constants/routes';
import {
  CreateUserSchema,
  zodResolverCompat,
  type CreateUserFormValues,
} from '@/shared/validators/user-management.validator';
import { useCreateUser } from '../hooks/useCreateUser';

export function UserCreateForm() {
  const createMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolverCompat(CreateUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'User',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = (values: CreateUserFormValues) => {
    createMutation.mutate({
      username: values.username.trim(),
      email: values.email.trim(),
      password: values.password,
      role: values.role,
    });
  };

  return (
    <Card className="max-w-2xl border-indigo-100 shadow-sm">
      <CardHeader>
        <CardTitle>Tạo tài khoản mới</CardTitle>
       
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="vd: jonny, cafestaff"
              disabled={createMutation.isPending}
              {...register('username')}
            />
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vd: user@example.com"
              disabled={createMutation.isPending}
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Vai trò</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setValue('role', value, { shouldValidate: true, shouldDirty: true })
              }
              disabled={createMutation.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                {CREATE_USER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                disabled={createMutation.isPending}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu"
                disabled={createMutation.isPending}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={ROUTES.ADMIN.USERS}>Hủy</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
