'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INVENTORY_CONDITION_LABELS } from '@/core/constants/inventory';
import { ROUTES } from '@/core/constants/routes';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { formatCurrencyVnd } from '../utils/inventory.mapper';
import type { InventoryListItem } from '../types/cafe.interface';
import { InventoryStatusBadge } from './inventory-status-badge';

export function createInventoryColumns(cafeId: string): ColumnDef<InventoryListItem>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tên game
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt={row.original.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                N/A
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.minPlayers > 0
                ? `${row.original.minPlayers}–${row.original.maxPlayers} người`
                : null}
              {row.original.boxQuantity > 0
                ? `${row.original.minPlayers > 0 ? ' · ' : ''}${row.original.boxQuantity} hộp`
                : null}
              {!row.original.minPlayers && !row.original.boxQuantity
                ? (row.original.barcode ?? '—')
                : null}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => <InventoryStatusBadge status={row.original.status} />,
    },
    {
      id: 'tinhTrang',
      header: 'Tình trạng',
      cell: ({ row }) => {
        const condition = row.original.condition;
        if (condition) {
          return INVENTORY_CONDITION_LABELS[condition] ?? condition;
        }
        // API inventory hiện không trả condition — dùng isActive
        return row.original.isActive ? (
          <span className="text-emerald-700">Đang hoạt động</span>
        ) : (
          <span className="text-muted-foreground">Ngưng</span>
        );
      },
    },
    {
      id: 'components',
      header: 'Linh kiện',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.componentPenalties.length} mục
        </span>
      ),
    },
    {
      id: 'maxPenalty',
      header: 'Phạt tối đa',
      cell: ({ row }) => {
        const maxFee = row.original.componentPenalties.reduce(
          (max, item) => Math.max(max, item.penaltyFee),
          0,
        );
        return maxFee > 0 ? formatCurrencyVnd(maxFee) : '—';
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={ROUTES.STAFF.INVENTORY_DETAIL(cafeId, row.original.inventoryId)}>
            <Eye className="mr-2 h-4 w-4" />
            Chi tiết
          </Link>
        </Button>
      ),
    },
  ];
}

interface InventoryListTableProps {
  cafeId: string;
  data: InventoryListItem[];
  isLoading?: boolean;
}

export function InventoryListTable({ cafeId, data, isLoading }: InventoryListTableProps) {
  const columns = createInventoryColumns(cafeId);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải kho game...</div>;
  }

  return (
    <PartnerDataTable
      columns={columns}
      data={data}
      emptyMessage="Không có mục nào trong kho game."
    />
  );
}
