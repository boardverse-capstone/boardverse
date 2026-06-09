import React from 'react';
import { IconUsers } from '@tabler/icons-react';

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <IconUsers className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Quản lý tài khoản người dùng
            </h1>
            <p className="mt-1 text-sm text-white/85">
              Xem thông tin và khóa/mở khóa tài khoản Player, Cafe Manager và Cafe Staff
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
