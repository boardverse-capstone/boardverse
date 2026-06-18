'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CommonPagination } from '@/components/common/pagination';
import {
  KARMA_BEHAVIOR_FILTERS,
  KARMA_BEHAVIOR_LABELS,
} from '@/core/constants/behavior-monitoring';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useKarmaLogs } from '../hooks/useKarmaLogs';
import type { KarmaLogEntry } from '../types/behavior.interface';

const DEFAULT_LIMIT = 10;

const columns: ColumnDef<KarmaLogEntry>[] = [
  {
    accessorKey: 'userId',
    header: 'ID người chơi',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.userId.slice(0, 8)}…</span>
    ),
  },
  {
    accessorKey: 'displayName',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Tên hiển thị
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'currentKarma',
    header: 'Karma hiện tại',
    cell: ({ row }) => (
      <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
        {row.original.currentKarma.toLocaleString('vi-VN')}
      </Badge>
    ),
  },
  {
    accessorKey: 'behaviorType',
    header: 'Loại hành vi',
    cell: ({ row }) => KARMA_BEHAVIOR_LABELS[row.original.behaviorType] ?? row.original.behaviorType,
  },
  {
    accessorKey: 'delta',
    header: 'Biến động',
    cell: ({ row }) => {
      const delta = row.original.delta;
      if (delta === 0) return <span className="text-muted-foreground">0</span>;
      const positive = delta > 0;
      return (
        <span className={positive ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
          {positive ? `+${delta}` : delta}
        </span>
      );
    },
  },
  {
    accessorKey: 'recordedAt',
    header: 'Thời gian ghi nhận',
    cell: ({ row }) => new Date(row.original.recordedAt).toLocaleString('vi-VN'),
  },
];

export function KarmaLogTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [behaviorType, setBehaviorType] = useState('all');

  const { data, isLoading, isError, refetch } = useKarmaLogs({
    page,
    limit,
    search,
    behaviorType,
  });

  const tableColumns = useMemo(() => columns, []);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải Karma...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải nhật ký.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Tìm theo ID hoặc tên người dùng..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="min-w-0 flex-1 border-indigo-200"
          />
          <Button variant="outline" onClick={handleSearch} className="shrink-0">
            Tìm kiếm
          </Button>
        </div>
        <Select value={behaviorType} onValueChange={(v) => { setBehaviorType(v); setPage(1); }}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder="Lọc hành vi" />
          </SelectTrigger>
          <SelectContent>
            {KARMA_BEHAVIOR_FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PartnerDataTable
        columns={tableColumns}
        data={data?.data ?? []}
        emptyMessage="Không có bản ghi karma phù hợp."
      />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSize={limit}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
