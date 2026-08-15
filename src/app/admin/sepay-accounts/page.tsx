import { PageHeader } from '@/components/common/page-header';
import { AdminSePayAccountsPanel } from '@/features/admin-sepay/components/admin-sepay-accounts-panel';

export default function AdminSePayAccountsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SePay accounts"
        description="Quản lý tài khoản SePay Master/Cafe (GET/POST/PUT/DELETE /api/sepay-accounts)."
      />
      <AdminSePayAccountsPanel />
    </div>
  );
}
