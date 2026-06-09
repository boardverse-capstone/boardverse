import { Suspense } from 'react';
import { UserListTable } from '@/features/user-management/components/user-list-table';

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách tài khoản...</div>
      }
    >
      <UserListTable />
    </Suspense>
  );
}
