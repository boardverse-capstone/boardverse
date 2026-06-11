import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { ListBackButton } from '@/components/common/list-back-button';
import { ROUTES } from '@/core/constants/routes';
import { UserCreateForm } from '@/features/user-management/components/user-create-form';

export default function AdminUserCreatePage() {
  return (
    <div className="space-y-6">
      <ListBackButton fallbackPath={ROUTES.ADMIN.USERS} label="Quay lại danh sách" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Thêm người dùng</h2>
         
        </div>
        <Button variant="outline" asChild>
         
        </Button>
      </div>

      <UserCreateForm />
    </div>
  );
}
