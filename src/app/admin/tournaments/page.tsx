import { Suspense } from 'react';
import { AdminTournamentListTable } from '@/features/admin-tournament/components/admin-tournament-list-table';

function TournamentsFallback() {
  return <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách giải đấu...</div>;
}

export default function AdminTournamentsPage() {
  return (
    <Suspense fallback={<TournamentsFallback />}>
      <AdminTournamentListTable />
    </Suspense>
  );
}
