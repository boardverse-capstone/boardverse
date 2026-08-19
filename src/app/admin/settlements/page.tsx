import { PageHeader } from '@/components/common/page-header';
import { AdminSettlementOverridePanel } from '@/features/admin-settlement/components/admin-settlement-override-panel';

export default function AdminSettlementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Giải ngân"
        description="Ghi đè thủ công các khoản giải ngân thất bại sau khi đã thử lại hết lần (bắt buộc ghi lý do)."
      />
      <AdminSettlementOverridePanel />
    </div>
  );
}
