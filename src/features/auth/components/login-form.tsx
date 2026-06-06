'use client';

// src/features/auth/components/login-form.tsx
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useLogin } from '../hooks/useLogin';
import { LoginSchema, zodResolverCompat, type LoginFormValues } from '@/shared/validators/auth.validator';
import { ROUTES } from '@/core/constants/routes';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolverCompat(LoginSchema),
    defaultValues: {
      usernameOrEmail: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    login(values);
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* ─── Form Panel ─────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
              <p className="text-balance text-sm text-muted-foreground">
                Đăng nhập vào hệ thống quản trị BoardVerse
              </p>
            </div>

            {/* Username / Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="usernameOrEmail">Username hoặc Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="usernameOrEmail"
                  type="text"
                  placeholder="admin@boardverse.com"
                  className="pl-9"
                  autoComplete="username"
                  disabled={isPending}
                  {...register('usernameOrEmail')}
                />
              </div>
              {errors.usernameOrEmail && (
                <p className="text-xs text-destructive">{errors.usernameOrEmail.message}</p>
              )}
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
                  autoComplete="current-password"
                  disabled={isPending}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>

            <div className="text-center">
              <Link
                href={ROUTES.AUTH.FORGOT_PASSWORD}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </form>

          {/* ─── Decorative Panel ───────────────────────── */}
          <div className="relative hidden bg-muted md:flex flex-col items-center justify-center p-8 gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
              {/* BoardVerse Logo SVG */}
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
                  <path
                    d="M22 21.75C22.4142 21.75 22.75 21.4142 22.75 21C22.75 20.5858 22.4142 20.25 22 20.25V21.75ZM22 20.25H11V21.75H22V20.25ZM8.75 18V12H7.25V18H8.75ZM11 20.25C9.75736 20.25 8.75 19.2426 8.75 18H7.25C7.25 20.0711 8.92893 21.75 11 21.75V20.25Z"
                    fill="currentColor"
                  />
                  <circle cx="13.1" cy="26.1" r="1.7" stroke="currentColor" />
                  <circle cx="22.1" cy="26.1" r="1.7" stroke="currentColor" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">BoardVerse Portal</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Hệ thống quản trị dành cho Admin, Manager và Staff của nền tảng board game.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="px-6 text-center text-xs text-muted-foreground">
        Bằng cách đăng nhập, bạn đồng ý với{' '}
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
