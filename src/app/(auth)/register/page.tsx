import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Đăng ký – BoardVerse Portal',
  description: 'Tạo tài khoản mới trên hệ thống BoardVerse.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
