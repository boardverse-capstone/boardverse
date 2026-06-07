'use client';

import { use, useState } from 'react';
import { ListBackButton } from '@/components/common/list-back-button';
import { ROUTES } from '@/core/constants/routes';
import { UserAdminNav } from '@/features/user-management/components/user-admin-nav';
import { BlockUserDialog } from '@/features/user-management/components/block-user-dialog';
import { UserDetailPanel } from '@/features/user-management/components/user-detail-panel';
import { useUserDetail } from '@/features/user-management/hooks/useUserDetail';
import { useBlockUser } from '@/features/user-management/hooks/useBlockUser';
import { useUnblockUser } from '@/features/user-management/hooks/useUnblockUser';
import { toUserActionTarget } from '@/features/user-management/utils/user.mapper';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useUserDetail(id);
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const [blockOpen, setBlockOpen] = useState(false);

  const isActionPending = blockMutation.isPending || unblockMutation.isPending;
  const actionTarget = data ? toUserActionTarget(data) : null;

  const handleBlockConfirm = (reason: string) => {
    blockMutation.mutate(
      { id, payload: { reason } },
      { onSuccess: () => setBlockOpen(false) },
    );
  };

  return (
    <div className="space-y-6">
      <UserAdminNav />

      <ListBackButton
        fallbackPath={ROUTES.ADMIN.USERS}
        allowedPrefixes={[ROUTES.ADMIN.USERS, ROUTES.ADMIN.USER_ROLES]}
      />

      <UserDetailPanel
        user={data}
        isLoading={isLoading}
        isError={isError}
        isActionPending={isActionPending}
        onBlock={() => setBlockOpen(true)}
        onUnblock={() => unblockMutation.mutate(id)}
      />

      <BlockUserDialog
        user={actionTarget}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        onConfirm={handleBlockConfirm}
        isPending={blockMutation.isPending}
      />
    </div>
  );
}
