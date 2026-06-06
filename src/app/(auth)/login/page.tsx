import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập – BoardVerse Portal',
  description: 'Đăng nhập vào hệ thống quản trị BoardVerse dành cho Admin, Manager và Staff.',
};

export default function LoginPage() {
  return <LoginForm />;
}
