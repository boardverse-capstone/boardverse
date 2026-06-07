import { Suspense } from 'react';
import { UserAdminNav } from '@/features/user-management/components/user-admin-nav';
import { UserListTable } from '@/features/user-management/components/user-list-table';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <UserAdminNav />
      <Suspense
        fallback={
          <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách tài khoản...</div>
        }
      >
        <UserListTable />
      </Suspense>
    </div>
  );
}
