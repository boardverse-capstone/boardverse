import { Suspense } from 'react';
import { PartnerPendingTable } from '@/features/partner/components/partner-pending-table';

export default function PendingRegistrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách đơn đăng ký...</div>
      }
    >
      <PartnerPendingTable />
    </Suspense>
  );
}
