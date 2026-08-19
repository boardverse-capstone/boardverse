'use client';

// src/features/auth/components/register-form.tsx
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Loader2, Mail, Lock, User, Phone } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AuthService } from '../services/auth.service';
import { RegisterSchema, zodResolverCompat, type RegisterFormValues } from '@/shared/validators/auth.validator';
import { ROUTES } from '@/core/constants/routes';

export function RegisterForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();

  const { mutate: register, isPending } = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      AuthService.register({
        username: values.username,
        email: values.email,
        password: values.password,
        phoneNumber: values.phoneNumber || undefined,
      }),
    onSuccess: () => {
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push(ROUTES.AUTH.LOGIN);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Đăng ký thất bại. Vui lòng thử lại.');
    },
  });

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolverCompat(RegisterSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    register(values);
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* ─── Form Panel ─────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 flex flex-col gap-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
              <p className="text-sm text-balance text-muted-foreground">
                Điền thông tin để đăng ký tài khoản mới
              </p>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  className="pl-9"
                  disabled={isPending}
                  {...formRegister('username')}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-9"
                  autoComplete="email"
                  disabled={isPending}
                  {...formRegister('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (optional) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="phoneNumber">
                Số điện thoại{' '}
                <span className="text-muted-foreground text-xs">(tùy chọn)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="0901234567"
                  className="pl-9"
                  disabled={isPending}
                  {...formRegister('phoneNumber')}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...formRegister('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...formRegister('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link
                href={ROUTES.AUTH.LOGIN}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Đăng nhập
              </Link>
            </p>
          </form>

          {/* ─── Decorative Panel ───────────────────────── */}
          <div className="relative hidden bg-muted md:flex flex-col items-center justify-center p-8 gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-primary"
                >
                  <path
                    d="M26 24.75C26.4142 24.75 26.75 24.4142 26.75 24C26.75 23.5858 26.4142 23.25 26 23.25V24.75ZM26 23.25H11V24.75H26V23.25ZM8.75 21V15H7.25V21H8.75ZM11 23.25C9.75736 23.25 8.75 22.2426 8.75 21H7.25C7.25 23.0711 8.92893 24.75 11 24.75V23.25Z"
                    fill="currentColor"
                  />
                  <path
                    d="M1.5 3.25C1.08579 3.25 0.75 3.58579 0.75 4C0.75 4.41421 1.08579 4.75 1.5 4.75V3.25ZM1.5 4.75H6V3.25H1.5V4.75ZM7.25 6V21H8.75V6H7.25ZM6 4.75C6.69036 4.75 7.25 5.30964 7.25 6H8.75C8.75 4.48122 7.51878 3.25 6 3.25V4.75Z"
                    fill="currentColor"
                  />
                  <circle cx="13.1" cy="26.1" r="1.7" stroke="currentColor" />
                  <circle cx="22.1" cy="26.1" r="1.7" stroke="currentColor" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">BoardVerse Portal</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Tạo tài khoản để bắt đầu sử dụng hệ thống quản trị BoardVerse.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="px-6 text-center text-xs text-muted-foreground">
        Bằng cách đăng ký, bạn đồng ý với{' '}
        <Link href="#" className="underline underline-offset-4 hover:text-primary">
          Điều khoản sử dụng
        </Link>{' '}
        và{' '}
        <Link href="#" className="underline underline-offset-4 hover:text-primary">
          Chính sách bảo mật
        </Link>
        .
      </p>
    </div>
  );
}
