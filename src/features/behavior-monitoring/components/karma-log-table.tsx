'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
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
import { UserManagementService } from '@/features/user-management/services/user-management.service';
import type { ManagedUser } from '@/features/user-management/types/user.interface';
import { useKarmaLogs } from '../hooks/useKarmaLogs';
import type { KarmaLogEntry, KarmaLogParams } from '../types/behavior.interface';

const DEFAULT_LIMIT = 20;

interface KarmaLogFiltersDraft {
  userId: string;
  username: string;
  behaviorType: string;
  fromLocal: string;
  toLocal: string;
}

const EMPTY_DRAFT: KarmaLogFiltersDraft = {
  userId: '',
  username: '',
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
  const [searchText, setSearchText] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  const userSearch = useQuery({
    queryKey: ['karma-log-user-search', submittedSearch],
    enabled: submittedSearch.length >= 2,
    queryFn: () =>
      UserManagementService.getUsers({
        page: 1,
        limit: 12,
        search: submittedSearch,
      }),
  });

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

  const selectUser = (user: ManagedUser) => {
    setDraft((prev) => ({
      ...prev,
      userId: user.id,
      username: user.username,
    }));
    setSearchText('');
    setSubmittedSearch('');
  };

  const applyFilters = () => {
    const fromUtc = toUtcIso(draft.fromLocal);
    const toUtc = toUtcIso(draft.toLocal);
    if (fromUtc && toUtc && new Date(fromUtc).getTime() > new Date(toUtc).getTime()) {
      setFilterError('Thời điểm bắt đầu không được lớn hơn thời điểm kết thúc.');
      return;
    }

    setFilterError(null);
    setApplied({ ...draft });
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_DRAFT);
    setApplied(EMPTY_DRAFT);
    setFilterError(null);
    setSearchText('');
    setSubmittedSearch('');
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

  const searchResults = userSearch.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="karma-filter-user">Người chơi</Label>
            {draft.userId ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2">
                <span className="text-sm font-medium">{draft.username}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, userId: '', username: '' }))
                  }
                >
                  <X className="size-4" />
                  Bỏ chọn
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const next = searchText.trim();
                    if (next.length < 2) {
                      toast.error('Nhập ít nhất 2 ký tự để tìm người chơi.');
                      return;
                    }
                    setSubmittedSearch(next);
                  }}
                >
                  <Input
                    id="karma-filter-user"
                    placeholder="Tìm theo tên, SĐT hoặc email..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="border-indigo-200 bg-white"
                  />
                  <Button type="submit" variant="outline" disabled={userSearch.isFetching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </form>
                {userSearch.isFetching ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Đang tìm...
                  </p>
                ) : null}
                {searchResults.length > 0 ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-white p-1">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-indigo-50"
                        onClick={() => selectUser(user)}
                      >
                        <span className="font-medium">{user.username}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {[user.phoneNumber, user.email].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
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
            <Label htmlFor="karma-filter-from">Từ thời điểm</Label>
            <Input
              id="karma-filter-from"
              type="datetime-local"
              value={draft.fromLocal}
              onChange={(e) => setDraft((prev) => ({ ...prev, fromLocal: e.target.value }))}
              className="border-indigo-200 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karma-filter-to">Đến thời điểm</Label>
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
