import { Suspense } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { KarmaLogTable } from '@/features/behavior-monitoring/components/karma-log-table';

function KarmaLogsFallback() {
  return <div className="p-4 text-sm text-muted-foreground">Đang tải Karma...</div>;
}

export default function AdminKarmaLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Karma"
        description="Theo dõi biến động điểm Karma, tìm kiếm và lọc theo loại hành vi vi phạm."
      />
      <Suspense fallback={<KarmaLogsFallback />}>
        <KarmaLogTable />
      </Suspense>
    </div>
  );
}
