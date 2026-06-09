import { z } from 'zod';
import { zodResolverCompat } from './auth.validator';

export const CreateUserSchema = z
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
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(128, 'Mật khẩu không được quá 128 ký tự'),
    confirmPassword: z.string(),
    role: z.string().min(1, 'Vui lòng chọn vai trò'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export type CreateUserFormValues = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username không được để trống')
      .max(100, 'Username không được quá 100 ký tự'),
    email: z
      .string()
      .email('Địa chỉ email không hợp lệ')
      .max(256, 'Email không được quá 256 ký tự'),
    password: z.string().max(128, 'Mật khẩu không được quá 128 ký tự'),
    confirmPassword: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.password) return;

    if (data.password.length < 8) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu phải có ít nhất 8 ký tự',
        path: ['password'],
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Xác nhận mật khẩu không khớp',
        path: ['confirmPassword'],
      });
    }
  });

export type UpdateUserFormValues = z.infer<typeof UpdateUserSchema>;
export { zodResolverCompat };
