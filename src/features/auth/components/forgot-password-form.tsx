'use client';

// src/features/auth/components/forgot-password-form.tsx
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Link from 'next/link';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Progress } from '@/components/ui/progress';
import { AuthService } from '../services/auth.service';
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
  zodResolverCompat,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from '@/shared/validators/auth.validator';
import { ROUTES } from '@/core/constants/routes';

type Step = 1 | 2 | 3 | 4;

function calculatePasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return strength;
}

function strengthLabel(strength: number) {
  if (strength === 0) return '';
  if (strength < 50) return 'Yếu';
  if (strength < 75) return 'Trung bình';
  return 'Mạnh';
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 – Request reset email
  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolverCompat(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const requestReset = useMutation({
    mutationFn: (data: ForgotPasswordFormValues) => AuthService.requestPasswordReset(data.email),
    onSuccess: (_, variables) => {
      setEmail(variables.email);
      setStep(2);
      toast.success('Đã gửi mã xác thực đến email của bạn.');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Không thể gửi email. Vui lòng thử lại.');
    },
  });

  // Step 3 – Reset password
  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolverCompat(ResetPasswordSchema),
    defaultValues: { token: '', newPassword: '', confirmNewPassword: '' },
  });

  const newPasswordValue = useWatch({
    control: resetForm.control,
    name: 'newPassword',
  });
  const strength = calculatePasswordStrength(newPasswordValue ?? '');

  const resetPassword = useMutation({
    mutationFn: (data: ResetPasswordFormValues) =>
      AuthService.resetPassword({ token: data.token, newPassword: data.newPassword }),
    onSuccess: () => {
      setStep(4);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
    },
  });

  const handleOtpNext = () => {
    if (otpCode.length < 6) return;
    resetForm.setValue('token', otpCode);
    setStep(3);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 sm:p-8 w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="my-4 flex justify-center">
          <div className="bg-primary/10 border border-primary/20 rounded-full size-14 flex items-center justify-center">
            <svg
              width="32"
              height="32"
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
        </div>

        {/* Step 1 – Email */}
        {step === 1 && (
          <form
            onSubmit={emailForm.handleSubmit((d) => requestReset.mutate(d))}
            className="flex flex-col gap-6"
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold">Quên mật khẩu?</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Nhập email để nhận mã đặt lại mật khẩu
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="me@example.com"
                  className="pl-9"
                  autoComplete="email"
                  disabled={requestReset.isPending}
                  {...emailForm.register('email')}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={requestReset.isPending}>
              {requestReset.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi...</>
              ) : (
                'Gửi mã xác thực'
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href={ROUTES.AUTH.LOGIN} className="inline-flex items-center gap-1 hover:underline">
                <ArrowLeft className="h-3 w-3" /> Quay lại đăng nhập
              </Link>
            </p>
          </form>
        )}

        {/* Step 2 – OTP */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Kiểm tra email</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Nhập mã 6 chữ số đã gửi tới{' '}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
              <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-12 w-auto flex-1 rounded-md border-s text-lg"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button
              type="button"
              className="w-full"
              onClick={handleOtpNext}
              disabled={otpCode.length < 6}
            >
              Xác nhận mã
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Không nhận được mã?{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => requestReset.mutate({ email })}
                disabled={requestReset.isPending}
              >
                Gửi lại
              </Button>
            </p>
          </div>
        )}

        {/* Step 3 – New Password */}
        {step === 3 && (
          <form
            onSubmit={resetForm.handleSubmit((d) => resetPassword.mutate(d))}
            className="flex flex-col gap-6"
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold">Tạo mật khẩu mới</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Chọn mật khẩu mạnh cho tài khoản của bạn
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới"
                  className="pl-9 pr-9"
                  autoComplete="new-password"
                  disabled={resetPassword.isPending}
                  {...resetForm.register('newPassword')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Progress value={strength} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-right">{strengthLabel(strength)}</p>
              {resetForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {resetForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  className="pl-9"
                  disabled={resetPassword.isPending}
                  {...resetForm.register('confirmNewPassword')}
                />
              </div>
              {resetForm.formState.errors.confirmNewPassword && (
                <p className="text-xs text-destructive">
                  {resetForm.formState.errors.confirmNewPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={resetPassword.isPending || strength < 50}>
              {resetPassword.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đặt lại...</>
              ) : (
                'Đặt mật khẩu mới'
              )}
            </Button>
          </form>
        )}

        {/* Step 4 – Success */}
        {step === 4 && (
          <div className="flex flex-col items-center gap-6 text-center py-4">
            <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Thành công!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Mật khẩu của bạn đã được đặt lại thành công.
              </p>
            </div>
            <Link href={ROUTES.AUTH.LOGIN} className="w-full">
              <Button className="w-full">Quay lại đăng nhập</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
