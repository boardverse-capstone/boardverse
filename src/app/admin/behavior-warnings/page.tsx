import { Suspense } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { AdminModerationPanels } from '@/features/behavior-monitoring/components/admin-moderation-panels';
import { BehaviorWarningCards } from '@/features/behavior-monitoring/components/behavior-warning-cards';

export default function AdminBehaviorWarningsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cảnh báo hành vi"
        description="Tài khoản có Karma dưới ngưỡng an toàn — xử lý cảnh báo hoặc khóa tài khoản."
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Đang tải...</div>}>
        <BehaviorWarningCards />
      </Suspense>
      <AdminModerationPanels />
    </div>
  );
}
