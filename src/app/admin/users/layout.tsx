import React from 'react';
import { IconUsers } from '@tabler/icons-react';

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl py-4 sm:py-6 md:py-8">
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 p-4 text-white shadow-lg sm:mb-8 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur sm:size-12">
            <IconUsers className="size-6 sm:size-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              Quản lý người dùng
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
