import { Suspense } from 'react';
import { KarmaLogTable } from '@/features/behavior-monitoring/components/karma-log-table';

function KarmaLogsFallback() {
  return <div className="p-4 text-sm text-muted-foreground">Đang tải nhật ký uy tín...</div>;
}

export default function AdminKarmaLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nhật ký Uy tín Toàn hệ thống</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi biến động điểm Karma, tìm kiếm và lọc theo loại hành vi vi phạm.
        </p>
      </div>
      <Suspense fallback={<KarmaLogsFallback />}>
        <KarmaLogTable />
      </Suspense>
    </div>
  );
}
