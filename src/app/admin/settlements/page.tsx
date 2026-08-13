import { PageHeader } from '@/components/common/page-header';
import { AdminSettlementOverridePanel } from '@/features/admin-settlement/components/admin-settlement-override-panel';

export default function AdminSettlementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlements"
        description="Override settlement thất bại sau khi retry hết lần (ghi lý do bắt buộc)."
      />
      <AdminSettlementOverridePanel />
    </div>
  );
}
