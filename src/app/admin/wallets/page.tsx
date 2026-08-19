import { Suspense } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { AdminWalletListTable } from '@/features/admin-wallet/components/admin-wallet-list-table';

function WalletsFallback() {
  return <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách ví...</div>;
}

export default function AdminWalletsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ví BVC"
        description="Danh sách ví người dùng. Lọc theo tìm kiếm, trạng thái tài khoản và mức rủi ro."
      />
      <Suspense fallback={<WalletsFallback />}>
        <AdminWalletListTable />
      </Suspense>
    </div>
  );
}
