import { PageHeader } from '@/components/common/page-header';
import { AdminReportsPortal } from '@/features/admin-reports/components/admin-reports-portal';

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo"
        description="Tổng quan, lobby failures, deposits và hiệu suất cafe."
      />
      <AdminReportsPortal />
    </div>
  );
}
