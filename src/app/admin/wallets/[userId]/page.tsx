'use client';

import { use } from 'react';
import { ListBackButton } from '@/components/common/list-back-button';
import { PageHeader } from '@/components/common/page-header';
import { ROUTES } from '@/core/constants/routes';
import { AdminWalletDetailPanel } from '@/features/admin-wallet/components/admin-wallet-detail-panel';
import { AdminWalletTransactionsTable } from '@/features/admin-wallet/components/admin-wallet-transactions-table';
import { useAdminWalletDetail } from '@/features/admin-wallet/hooks/useAdminWalletDetail';

interface AdminWalletDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default function AdminWalletDetailPage({ params }: AdminWalletDetailPageProps) {
  const { userId } = use(params);
  const { data, isLoading, isError } = useAdminWalletDetail(userId);

  return (
    <div className="space-y-6">
      <ListBackButton fallbackPath={ROUTES.ADMIN.WALLETS} />
      <PageHeader
        title="Chi tiết wallet"
        description="Thông tin wallet và người dùng (GET /api/v1/admin/wallet/{userId})."
      />
      <AdminWalletDetailPanel wallet={data} isLoading={isLoading} isError={isError} />
      <AdminWalletTransactionsTable userId={userId} />
    </div>
  );
}
