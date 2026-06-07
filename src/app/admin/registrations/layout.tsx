import React from 'react';
import { IconCoffee } from '@tabler/icons-react';

export default function RegistrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <IconCoffee className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Kiểm duyệt đơn đăng ký đối tác
            </h1>
            <p className="mt-1 text-sm text-white/85">
              Xem hồ sơ, duyệt hoặc từ chối đơn đăng ký quán cafe
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
