'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, RotateCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { KarmaLogEntry, KarmaLogParams } from '../types/behavior.interface';

const DEFAULT_LIMIT = 20;

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface KarmaLogFiltersDraft {
  userId: string;
  behaviorType: string;
  fromLocal: string;
  toLocal: string;
}

const EMPTY_DRAFT: KarmaLogFiltersDraft = {
  userId: '',
  behaviorType: 'all',
  fromLocal: '',
  toLocal: '',
};

function toUtcIso(localValue: string): string | undefined {
  if (!localValue.trim()) return undefined;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

const columns: ColumnDef<KarmaLogEntry>[] = [
  {
    accessorKey: 'userId',
    header: 'ID người chơi',
    cell: ({ row }) => (
      <span className="font-mono text-xs" title={row.original.userId}>
        {row.original.userId.slice(0, 8)}…
      </span>
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
    header: 'Karma sau',
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
  const [draft, setDraft] = useState<KarmaLogFiltersDraft>(EMPTY_DRAFT);
  const [applied, setApplied] = useState<KarmaLogFiltersDraft>(EMPTY_DRAFT);
  const [filterError, setFilterError] = useState<string | null>(null);

  const queryParams = useMemo<KarmaLogParams>(() => {
    return {
      page,
      limit,
      userId: applied.userId.trim() || undefined,
      behaviorType: applied.behaviorType,
      fromUtc: toUtcIso(applied.fromLocal),
      toUtc: toUtcIso(applied.toLocal),
    };
  }, [page, limit, applied]);

  const { data, isLoading, isError, refetch, isFetching } = useKarmaLogs(queryParams);
  const tableColumns = useMemo(() => columns, []);

  const applyFilters = () => {
    const userId = draft.userId.trim();
    if (userId && !GUID_RE.test(userId)) {
      setFilterError('userId phải là UUID hợp lệ.');
      return;
    }

    const fromUtc = toUtcIso(draft.fromLocal);
    const toUtc = toUtcIso(draft.toLocal);
    if (fromUtc && toUtc && new Date(fromUtc).getTime() > new Date(toUtc).getTime()) {
      setFilterError('fromUtc không được lớn hơn toUtc.');
      return;
    }

    setFilterError(null);
    setApplied({ ...draft, userId });
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_DRAFT);
    setApplied(EMPTY_DRAFT);
    setFilterError(null);
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
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="karma-filter-userId">User ID</Label>
            <Input
              id="karma-filter-userId"
              placeholder="UUID người dùng"
              value={draft.userId}
              onChange={(e) => setDraft((prev) => ({ ...prev, userId: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="border-indigo-200 bg-white font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karma-filter-category">Nhóm hành vi vi phạm</Label>
            <Select
              value={draft.behaviorType}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, behaviorType: value }))}
            >
              <SelectTrigger id="karma-filter-category" className="w-full border-indigo-200 bg-white">
                <SelectValue placeholder="Tất cả" />
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

          <div className="space-y-1.5">
            <Label htmlFor="karma-filter-from">Từ thời điểm (fromUtc)</Label>
            <Input
              id="karma-filter-from"
              type="datetime-local"
              value={draft.fromLocal}
              onChange={(e) => setDraft((prev) => ({ ...prev, fromLocal: e.target.value }))}
              className="border-indigo-200 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karma-filter-to">Đến thời điểm (toUtc)</Label>
            <Input
              id="karma-filter-to"
              type="datetime-local"
              value={draft.toLocal}
              onChange={(e) => setDraft((prev) => ({ ...prev, toLocal: e.target.value }))}
              className="border-indigo-200 bg-white"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={applyFilters} disabled={isFetching}>
            <Search className="mr-2 h-4 w-4" />
            Áp dụng lọc
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters} disabled={isFetching}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Xóa lọc
          </Button>
          {filterError ? <p className="text-sm text-rose-600">{filterError}</p> : null}
        </div>
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
