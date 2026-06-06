import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata: Metadata = {
  title: 'Quên mật khẩu – BoardVerse Portal',
  description: 'Đặt lại mật khẩu tài khoản BoardVerse của bạn.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
