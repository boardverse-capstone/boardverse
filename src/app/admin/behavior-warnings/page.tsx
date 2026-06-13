import { Suspense } from 'react';
import { BehaviorWarningCards } from '@/features/behavior-monitoring/components/behavior-warning-cards';

export default function AdminBehaviorWarningsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Danh sách Cảnh báo & Chế tài hành vi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tài khoản có Karma dưới ngưỡng an toàn — xử lý cảnh báo hoặc khóa tài khoản.
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Đang tải...</div>}>
        <BehaviorWarningCards />
      </Suspense>
    </div>
  );
}
