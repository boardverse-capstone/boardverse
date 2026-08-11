import { Suspense } from 'react';
import { AdminCafeListTable } from '@/features/admin-cafe/components/admin-cafe-list-table';

export default function AdminCafesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Đang tải...</div>}>
      <AdminCafeListTable />
    </Suspense>
  );
}
