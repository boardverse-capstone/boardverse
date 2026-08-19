'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommonPagination } from '@/components/common/pagination';
import { WALLET_TRANSACTION_TYPE_LABELS } from '@/core/constants/admin-wallet';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useAdminWalletTransactions } from '../hooks/useAdminWalletTransactions';
import type { AdminWalletTransaction } from '../types/wallet.interface';
import { formatWalletBalance, formatWalletDate } from '../utils/wallet.mapper';

const DEFAULT_LIMIT = 20;

interface AdminWalletTransactionsTableProps {
  userId: string;
}

function formatAmount(amount: number) {
  const formatted = formatWalletBalance(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

const columns: ColumnDef<AdminWalletTransaction>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatWalletDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Loại',
    cell: ({ row }) => (
      <Badge variant="outline">
        {WALLET_TRANSACTION_TYPE_LABELS[row.original.type] ?? row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => {
      const amount = row.original.amount;
      return (
        <span
          className={
            amount > 0
              ? 'font-semibold tabular-nums text-emerald-600'
              : amount < 0
                ? 'font-semibold tabular-nums text-rose-600'
                : 'tabular-nums text-muted-foreground'
          }
        >
          {formatAmount(amount)}
        </span>
      );
    },
  },
  {
    accessorKey: 'balanceSnapshot',
    header: 'Số dư sau GD',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatWalletBalance(row.original.balanceSnapshot)}</span>
    ),
  },
  {
    accessorKey: 'relatedPaymentRef',
    header: 'Tham chiếu',
    cell: ({ row }) => {
      const refs = [
        row.original.relatedPaymentRef,
        row.original.relatedBookingId
          ? `booking:${row.original.relatedBookingId.slice(0, 8)}…`
          : null,
        row.original.relatedLobbyId
          ? `lobby:${row.original.relatedLobbyId.slice(0, 8)}…`
          : null,
      ].filter(Boolean);

      return (
        <span className="font-mono text-xs text-muted-foreground">
          {refs.length > 0 ? refs.join(' · ') : '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'note',
    header: 'Ghi chú',
    cell: ({ row }) => (
      <span className="line-clamp-2 text-sm text-muted-foreground">
        {row.original.note?.trim() || '—'}
      </span>
    ),
  },
];

export function AdminWalletTransactionsTable({ userId }: AdminWalletTransactionsTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const { data, isLoading, isError, refetch } = useAdminWalletTransactions({
    userId,
    page,
    limit,
  });

  const tableColumns = useMemo(() => columns, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lịch sử giao dịch BVC</CardTitle>
        <CardDescription>
          {data?.userDisplayName
            ? `Người dùng: ${data.userDisplayName}`
            : 'Lịch sử giao dịch ví của người dùng.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải lịch sử giao dịch...</p>
        ) : isError ? (
          <p className="text-sm text-rose-600">
            Không thể tải lịch sử giao dịch.{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>
              Thử lại
            </button>
          </p>
        ) : (
          <>
            <PartnerDataTable
              columns={tableColumns}
              data={data?.data ?? []}
              emptyMessage="Chưa có giao dịch nào."
            />
            {data?.meta && (
              <CommonPagination
                meta={data.meta}
                pageSize={limit}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setPage}
                onLimitChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
