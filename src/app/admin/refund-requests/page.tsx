import { Suspense } from 'react';
import { AdminRefundRequestsPanel } from '@/features/admin-wallet/components/admin-refund-requests-panel';

function RefundsFallback() {
  return <div className="p-4 text-sm text-muted-foreground">Đang tải yêu cầu hoàn...</div>;
}

export default function AdminRefundRequestsPage() {
  return (
    <Suspense fallback={<RefundsFallback />}>
      <AdminRefundRequestsPanel />
    </Suspense>
  );
}
