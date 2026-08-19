import { PageHeader } from '@/components/common/page-header';
import { AdminSePayAccountsPanel } from '@/features/admin-sepay/components/admin-sepay-accounts-panel';

export default function AdminSePayAccountsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tài khoản SePay"
        description="Quản lý tài khoản SePay hệ thống và của từng quán."
      />
      <AdminSePayAccountsPanel />
    </div>
  );
}
