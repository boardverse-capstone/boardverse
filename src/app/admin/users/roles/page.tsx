import { Suspense } from 'react';
import { UserAdminNav } from '@/features/user-management/components/user-admin-nav';
import { UserRoleTable } from '@/features/user-management/components/user-role-table';

export default function AdminUserRolesPage() {
  return (
    <div className="space-y-6">
      <UserAdminNav />
      <Suspense
        fallback={
          <div className="p-4 text-sm text-muted-foreground">Đang tải trang phân quyền...</div>
        }
      >
        <UserRoleTable />
      </Suspense>
    </div>
  );
}
