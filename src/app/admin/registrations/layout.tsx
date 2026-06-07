import React from 'react';

export default function RegistrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Kiểm duyệt đơn đăng ký đối tác</h1>
      {children}
    </div>
  );
}
