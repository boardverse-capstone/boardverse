import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLoading } from '@/features/auth/components/auth-loading';

export const metadata: Metadata = {
  title: 'Đăng nhập – BoardVerse Portal',
  description: 'Đăng nhập vào hệ thống quản trị BoardVerse dành cho Admin, Manager và Staff.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LoginForm />
    </Suspense>
  );
}
