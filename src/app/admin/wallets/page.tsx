import { Suspense } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { AdminWalletListTable } from '@/features/admin-wallet/components/admin-wallet-list-table';

function WalletsFallback() {
  return <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách wallets...</div>;
}

export default function AdminWalletsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallets"
        description="Danh sách tất cả wallets (phân trang). Lọc theo search, AccountStatus, RiskLevel."
      />
      <Suspense fallback={<WalletsFallback />}>
        <AdminWalletListTable />
      </Suspense>
    </div>
  );
}
