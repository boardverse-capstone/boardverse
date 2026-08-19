'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ListBackButton } from '@/components/common/list-back-button';
import { PageHeader } from '@/components/common/page-header';
import { ROUTES } from '@/core/constants/routes';
import { AdminTournamentDetailPanel } from '@/features/admin-tournament/components/admin-tournament-detail-panel';
import { useAdminTournamentDetail } from '@/features/admin-tournament/hooks/useAdminTournamentDetail';

interface AdminTournamentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminTournamentDetailPage({
  params,
}: AdminTournamentDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError } = useAdminTournamentDetail(id);

  return (
    <div className="space-y-6">
      <ListBackButton fallbackPath={ROUTES.ADMIN.TOURNAMENTS} />
      <PageHeader
        title="Chi tiết giải đấu"
        description="Thông tin giải đấu, thao tác vòng đời và danh sách người tham gia."
      />
      <AdminTournamentDetailPanel
        tournament={data}
        isLoading={isLoading}
        isError={isError}
        onDeleted={() => router.push(ROUTES.ADMIN.TOURNAMENTS)}
      />
    </div>
  );
}
