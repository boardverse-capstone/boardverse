// src/shared/validators/auth.validator.ts
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Re-export zodResolver với type workaround cho Zod v4 + @hookform/resolvers v5
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const zodResolverCompat = (schema: z.ZodTypeAny) => zodResolver(schema as any);

export const LoginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(3, 'Username hoặc Email phải có ít nhất 3 ký tự')
    .max(256, 'Username hoặc Email không được quá 256 ký tự'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(100, 'Mật khẩu không được quá 100 ký tự'),
});

export const RegisterSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username phải có ít nhất 3 ký tự')
      .max(100, 'Username không được quá 100 ký tự'),
    email: z
      .string()
      .email('Địa chỉ email không hợp lệ')
      .max(256, 'Email không được quá 256 ký tự'),
    password: z
      .string()
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .max(100, 'Mật khẩu không được quá 100 ký tự'),
    confirmPassword: z.string(),
    phoneNumber: z
      .string()
      .max(50, 'Số điện thoại không được quá 50 ký tự')
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Địa chỉ email không hợp lệ')
    .max(256, 'Email không được quá 256 ký tự'),
});

export const VerifyEmailSchema = z.object({
  token: z
    .string()
    .min(6, 'Mã xác thực phải có đúng 6 ký tự')
    .max(10, 'Mã xác thực không hợp lệ'),
});

export const ResetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(6, 'Mã reset phải có đúng 6 ký tự')
      .max(10, 'Mã reset không hợp lệ'),
    newPassword: z
      .string()
      .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
      .max(100, 'Mật khẩu không được quá 100 ký tự'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmNewPassword'],
  });

export type LoginFormValues = z.infer<typeof LoginSchema>;
export type RegisterFormValues = z.infer<typeof RegisterSchema>;
export type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;
export type VerifyEmailFormValues = z.infer<typeof VerifyEmailSchema>;
export type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;
