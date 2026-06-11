'use client';

import { use, useState } from 'react';
import { ListBackButton } from '@/components/common/list-back-button';
import { ROUTES } from '@/core/constants/routes';
import { BlockUserDialog } from '@/features/user-management/components/block-user-dialog';
import { DisableUserDialog } from '@/features/user-management/components/disable-user-dialog';
import { UserDetailPanel } from '@/features/user-management/components/user-detail-panel';
import { UserUpdateForm } from '@/features/user-management/components/user-update-form';
import { useUserDetail } from '@/features/user-management/hooks/useUserDetail';
import { useBlockUser } from '@/features/user-management/hooks/useBlockUser';
import { useDisableUser } from '@/features/user-management/hooks/useDisableUser';
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
  const disableMutation = useDisableUser();

  const [blockOpen, setBlockOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const isActionPending =
    blockMutation.isPending || unblockMutation.isPending || disableMutation.isPending;
  const actionTarget = data ? toUserActionTarget(data) : null;

  const handleBlockConfirm = (reason: string) => {
    blockMutation.mutate(
      { id, payload: { reason } },
      { onSuccess: () => setBlockOpen(false) },
    );
  };

  return (
    <div className="space-y-6">
      <ListBackButton fallbackPath={ROUTES.ADMIN.USERS} />

      <UserDetailPanel
        user={data}
        isLoading={isLoading}
        isError={isError}
        isActionPending={isActionPending}
        onBlock={() => setBlockOpen(true)}
        onUnblock={() => unblockMutation.mutate(id)}
        onDisable={() => setDisableOpen(true)}
      />

      {data && <UserUpdateForm user={data} />}

      <BlockUserDialog
        user={actionTarget}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        onConfirm={handleBlockConfirm}
        isPending={blockMutation.isPending}
      />

      <DisableUserDialog
        user={actionTarget}
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onConfirm={() => {
          if (!data) return;
          disableMutation.mutate(
            { id, username: data.username },
            { onSuccess: () => setDisableOpen(false) },
          );
        }}
        isPending={disableMutation.isPending}
      />
    </div>
  );
}
