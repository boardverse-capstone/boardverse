'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md border-2 border-orange-300 bg-muted shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt={row.original.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="flex size-full items-center justify-center font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
                N/A
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-mono text-xs font-extrabold uppercase tracking-wide text-orange-950">
              ► {row.original.name}
            </div>
            <div className="truncate font-mono text-[10px] font-bold uppercase tracking-widest text-orange-500">
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
          <span className="text-orange-700">Đang hoạt động</span>
        ) : (
          <span className="text-muted-foreground">Ngưng</span>
        );
      },
    },
    {
      id: 'components',
      header: 'Linh kiện',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 rounded-md border-2 border-orange-300 bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
          <span className="size-1.5 animate-pulse rounded-full bg-orange-500 shadow-[0_0_4px_currentColor]" />
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
        return maxFee > 0 ? (
          <span className="font-mono text-xs font-extrabold uppercase tracking-wide text-amber-700">
            ⚠ {formatCurrencyVnd(maxFee)}
          </span>
        ) : (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-orange-400">
            ▸ —
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          asChild
        >
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
  const router = useRouter();
  const columns = createInventoryColumns(cafeId);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải kho game...</div>;
  }

  return (
    <PartnerDataTable
      columns={columns}
      data={data}
      emptyMessage="Không có mục nào trong kho game."
      onRowClick={(item) => router.push(ROUTES.STAFF.INVENTORY_DETAIL(cafeId, item.inventoryId))}
    />
  );
}
