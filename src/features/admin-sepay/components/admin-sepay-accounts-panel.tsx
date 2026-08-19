'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useCreateSePayAccount } from '../hooks/useCreateSePayAccount';
import { useDeleteSePayAccount } from '../hooks/useDeleteSePayAccount';
import { useSePayAccounts } from '../hooks/useSePayAccounts';
import { useSePayMaster } from '../hooks/useSePayMaster';
import { useUpdateSePayAccount } from '../hooks/useUpdateSePayAccount';
import { useUpdateSePayEnvironment } from '../hooks/useUpdateSePayEnvironment';
import type {
  CreateSePayAccountRequest,
  SePayAccount,
  SePayAccountType,
  SePayEnvironment,
  UpdateSePayAccountRequest,
} from '../types/sepay-account.interface';
import {
  SePayAccountFormDialog,
  type SePayAccountFormValues,
} from './sepay-account-form-dialog';

function accountNumberDisplay(account: SePayAccount) {
  return account.maskedAccountNumber || account.accountNumber || '—';
}

export function AdminSePayAccountsPanel() {
  const [accountType, setAccountType] = useState<SePayAccountType | 'all'>('all');
  const [isActive, setIsActive] = useState<boolean | 'all'>('all');
  const [cafeIdInput, setCafeIdInput] = useState('');
  const [cafeId, setCafeId] = useState('');

  const { data = [], isLoading, isError, refetch } = useSePayAccounts({
    accountType,
    cafeId,
    isActive,
  });
  const masterQuery = useSePayMaster();
  const createMutation = useCreateSePayAccount();
  const updateMutation = useUpdateSePayAccount();
  const deleteMutation = useDeleteSePayAccount();
  const environmentMutation = useUpdateSePayEnvironment();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SePayAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SePayAccount | null>(null);

  const columns = useMemo<ColumnDef<SePayAccount>[]>(
    () => [
      {
        accessorKey: 'accountType',
        header: 'Loại',
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.accountType === 'Master' ? 'Hệ thống' : 'Quán'}
          </Badge>
        ),
      },
      {
        accessorKey: 'cafeName',
        header: 'Quán',
        cell: ({ row }) =>
          row.original.accountType === 'Master'
            ? 'BoardVerse'
            : row.original.cafeName || row.original.cafeId?.slice(0, 8) || '—',
      },
      {
        accessorKey: 'bankCode',
        header: 'Ngân hàng',
      },
      {
        id: 'accountNumber',
        header: 'Số TK',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{accountNumberDisplay(row.original)}</span>
        ),
      },
      {
        accessorKey: 'accountHolder',
        header: 'Chủ TK',
      },
      {
        accessorKey: 'environment',
        header: 'Môi trường',
        cell: ({ row }) => (
          <Select
            value={row.original.environment === 'Test' ? 'Test' : 'Production'}
            onValueChange={(value) =>
              environmentMutation.mutate({
                id: row.original.id,
                environment: value as SePayEnvironment,
              })
            }
            disabled={environmentMutation.isPending}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Test">Test</SelectItem>
              <SelectItem value="Production">Production</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Đang hoạt động
            </Badge>
          ) : (
            <Badge variant="secondary">Ngừng</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingAccount(row.original);
                setFormOpen(true);
              }}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Sửa
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Xóa
            </Button>
          </div>
        ),
      },
    ],
    [environmentMutation],
  );

  const handleFormSubmit = (values: SePayAccountFormValues | UpdateSePayAccountRequest) => {
    if (editingAccount) {
      updateMutation.mutate(
        { id: editingAccount.id, payload: values as UpdateSePayAccountRequest },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingAccount(null);
          },
        },
      );
      return;
    }

    createMutation.mutate(values as CreateSePayAccountRequest, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    environmentMutation.isPending;

  const master = masterQuery.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tài khoản hệ thống</CardTitle>
        </CardHeader>
        <CardContent>
          {masterQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải tài khoản hệ thống...</p>
          ) : masterQuery.isError || !master ? (
            <p className="text-sm text-muted-foreground">
              Chưa có tài khoản hệ thống. Hãy tạo mới với loại tài khoản Hệ thống.
            </p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Ngân hàng:</span> {master.bankCode}
              </p>
              <p>
                <span className="text-muted-foreground">Số TK:</span>{' '}
                <span className="font-mono text-xs">{accountNumberDisplay(master)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Chủ TK:</span> {master.accountHolder}
              </p>
              <p>
                <span className="text-muted-foreground">Môi trường:</span> {master.environment}
              </p>
              <p>
                <span className="text-muted-foreground">Trạng thái:</span>{' '}
                {master.isActive ? 'Đang hoạt động' : 'Ngừng'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Loại tài khoản</Label>
            <Select
              value={accountType}
              onValueChange={(value) => setAccountType(value as SePayAccountType | 'all')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="Master">Hệ thống</SelectItem>
                <SelectItem value="Cafe">Quán</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select
              value={isActive === 'all' ? 'all' : isActive ? 'true' : 'false'}
              onValueChange={(value) => {
                if (value === 'all') setIsActive('all');
                else setIsActive(value === 'true');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="true">Đang hoạt động</SelectItem>
                <SelectItem value="false">Ngừng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-cafe-id">Mã quán</Label>
            <div className="flex gap-2">
              <Input
                id="filter-cafe-id"
                value={cafeIdInput}
                onChange={(e) => setCafeIdInput(e.target.value)}
                placeholder="Lọc theo cafeId"
                className="font-mono text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setCafeId(cafeIdInput.trim());
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setCafeId(cafeIdInput.trim())}
              >
                Lọc
              </Button>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingAccount(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo account
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Đang tải SePay accounts...</div>
      ) : isError ? (
        <div className="p-4 text-sm text-rose-600">
          Không thể tải SePay accounts.{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : (
        <PartnerDataTable
          columns={columns}
          data={data}
          emptyMessage="Chưa có SePay account nào."
        />
      )}

      <SePayAccountFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAccount(null);
        }}
        account={editingAccount}
        onSubmit={handleFormSubmit}
        isPending={isPending}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa SePay account?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa account{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.accountType}
                {deleteTarget ? ` — ${accountNumberDisplay(deleteTarget)}` : ''}
              </span>
              . Có thể ảnh hưởng payment flow đang pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
