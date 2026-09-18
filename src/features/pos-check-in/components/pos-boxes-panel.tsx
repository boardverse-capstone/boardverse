'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ScanBarcode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CommonPagination } from '@/components/common/pagination';
import { PageHeader } from '@/components/common/page-header';
import {
  INVENTORY_STATUS_COLORS,
  INVENTORY_STATUS_FILTERS,
  INVENTORY_STATUS_LABELS,
} from '@/core/constants/inventory';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useInventoryList } from '@/features/staff-cafe/hooks/useInventoryList';
import { useStaffCafe } from '../hooks/usePosCheckIn';
import { usePosBoxByBarcode, usePosBoxes } from '../hooks/usePosBoxes';
import type { PosGameBox } from '../types/pos-check-in.interface';

const DEFAULT_LIMIT = 20;

interface PosBoxesPanelProps {
  /** When set, skip useStaffCafe and use this cafe. */
  cafeId?: string;
  /** Hide page header — embed inside Kho game tabs. */
  embedded?: boolean;
  /** Pre-select game template filter. */
  initialGameTemplateId?: string;
}

export function PosBoxesPanel({
  cafeId: cafeIdProp,
  embedded = false,
  initialGameTemplateId,
}: PosBoxesPanelProps = {}) {
  const { data: cafe, isLoading: cafeLoading } = useStaffCafe();
  const cafeId = cafeIdProp ?? cafe?.id;

  const [gameTemplateId, setGameTemplateId] = useState(initialGameTemplateId ?? 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookupBarcode, setLookupBarcode] = useState('');

  const { data: inventoryPage } = useInventoryList(cafeId, {
    page: 1,
    limit: 100,
  });

  const gameOptions = useMemo(() => {
    const items = inventoryPage?.data ?? [];
    const byTemplate = new Map<string, string>();
    for (const item of items) {
      if (!item.gameTemplateId || byTemplate.has(item.gameTemplateId)) continue;
      byTemplate.set(item.gameTemplateId, item.name || item.gameTemplateId);
    }
    return Array.from(byTemplate.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [inventoryPage?.data]);

  const {
    data: boxes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = usePosBoxes(cafeId, gameTemplateId === 'all' ? undefined : gameTemplateId);

  const {
    data: lookedUpBox,
    isFetching: lookupFetching,
    isError: lookupError,
    error: lookupErr,
    isSuccess: lookupSuccess,
  } = usePosBoxByBarcode(cafeId, lookupBarcode, Boolean(lookupBarcode));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boxes.filter((box) => {
      if (statusFilter !== 'all' && box.status !== statusFilter) return false;
      if (!q) return true;
      return (
        box.barcode.toLowerCase().includes(q) ||
        (box.gameName?.toLowerCase().includes(q) ?? false) ||
        (box.gameTemplateId?.toLowerCase().includes(q) ?? false) ||
        box.id.toLowerCase().includes(q)
      );
    });
  }, [boxes, search, statusFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  const meta = useMemo(() => {
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    };
  }, [filtered.length, page, limit]);

  const columns = useMemo<ColumnDef<PosGameBox>[]>(
    () => [
      {
        accessorKey: 'barcode',
        header: 'Barcode',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.barcode || '—'}</span>
        ),
      },
      {
        accessorKey: 'gameName',
        header: 'Game',
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <div className="truncate font-mono text-xs font-extrabold uppercase tracking-wide text-violet-950">
              ► {row.original.gameName || '—'}
            </div>
            {row.original.gameTemplateId ? (
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-violet-500">
                <span className="mr-1">#</span>{row.original.gameTemplateId.slice(0, 8)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const raw = row.original.status;
          const ledColor: Record<string, string> = {
            AVAILABLE: 'bg-emerald-500',
            INUSE: 'bg-sky-500',
            RENTED: 'bg-blue-500',
            MAINTENANCE: 'bg-amber-500',
            DAMAGED: 'bg-rose-500',
            Retired: 'bg-neutral-500',
          };
          return (
            <Badge
              variant="outline"
              className={[
                'relative inline-flex items-center gap-1.5 border-2 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]',
                INVENTORY_STATUS_COLORS[raw] ?? '',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block size-1.5 animate-pulse rounded-full shadow-[0_0_6px_currentColor]',
                  ledColor[raw] ?? 'bg-neutral-500',
                ].join(' ')}
              />
              {INVENTORY_STATUS_LABELS[raw] ?? raw}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'inventoryId',
        header: 'Inventory',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-violet-300 bg-violet-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-violet-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
            <span className="text-violet-400">▸</span>
            {row.original.inventoryId
              ? `${row.original.inventoryId.slice(0, 8)}…`
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'id',
        header: 'Box ID',
        cell: ({ row }) => (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-violet-500">
            <span className="mr-1 text-violet-400">#</span>
            {row.original.id ? `${row.original.id.slice(0, 8)}…` : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const runBarcodeLookup = () => {
    const next = barcodeInput.trim();
    if (!next) return;
    setLookupBarcode(next);
  };

  if (!cafeIdProp && cafeLoading) {
    return <div className="text-sm text-muted-foreground">Đang tải thông tin quán...</div>;
  }

  if (!cafeId) {
    return (
      <div className="text-sm text-muted-foreground">
        Chưa chọn quán. Không thể tra cứu hộp game.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <PageHeader
          title="Hộp game POS"
          description={
            cafe
              ? `${cafe.name} — hộp vật lý (barcode + trạng thái)`
              : 'Danh sách hộp game vật lý (barcode + trạng thái).'
          }
        />
      ) : null}

      {/* BARCODE SCANNER — style game */}
      <div className="relative overflow-hidden rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-4 shadow-[3px_3px_0_rgba(139,92,246,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.04)_3px,rgba(255,255,255,0.04)_4px)]" />
        <span className="pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full bg-violet-500 shadow-[0_0_8px_currentColor]" />
        <span className="pointer-events-none absolute left-3 top-3 size-2 animate-pulse rounded-full bg-fuchsia-500 shadow-[0_0_8px_currentColor] [animation-delay:0.3s]" />

        <div className="relative flex items-center gap-2 font-mono text-xs font-extrabold uppercase tracking-widest text-violet-900">
          <ScanBarcode className="h-4 w-4 text-violet-600" />
          <span className="text-yellow-400">►</span>
          Tra cứu theo barcode
          <span className="ml-auto flex items-center gap-1 text-[10px] text-violet-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_6px_currentColor]" />
            READY
          </span>
        </div>
        <div className="relative mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="▸ VD: BV-CATAN-001"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runBarcodeLookup();
            }}
            className="min-w-0 flex-1 border-2 border-violet-300 bg-white font-mono text-xs font-bold focus-visible:border-violet-500 focus-visible:ring-violet-300"
            autoComplete="off"
          />
          <button
            type="button"
            disabled={!barcodeInput.trim() || lookupFetching}
            onClick={runBarcodeLookup}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md border-2 border-violet-700 bg-gradient-to-b from-violet-500 to-violet-700 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),2px_2px_0_rgba(0,0,0,0.15)] transition-all hover:from-violet-400 hover:to-violet-600 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]"
          >
            <span className="text-yellow-300">►</span>
            {lookupFetching ? 'Đang tra cứu...' : 'Tra cứu'}
          </button>
          {lookupBarcode ? (
            <button
              type="button"
              onClick={() => {
                setLookupBarcode('');
                setBarcodeInput('');
              }}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-slate-700 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1),2px_2px_0_rgba(0,0,0,0.1)] hover:from-slate-200 hover:to-slate-300"
            >
              ✕ Xóa
            </button>
          ) : null}
        </div>

        {lookupBarcode && lookupFetching ? (
          <p className="relative mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-violet-700">
            <span className="size-1.5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_6px_currentColor]" />
            Đang tra cứu <span className="rounded border border-violet-300 bg-white px-1.5 py-0.5 font-mono text-violet-900">{lookupBarcode}</span>…
          </p>
        ) : null}

        {lookupBarcode && lookupError ? (
          <p className="relative mt-3 rounded-md border-2 border-rose-400 bg-gradient-to-r from-rose-100 to-pink-100 p-2 font-mono text-xs font-bold uppercase tracking-wide text-rose-700 shadow-[2px_2px_0_rgba(244,63,94,0.4)]">
            <span className="mr-1">⚠</span>
            {(lookupErr as Error)?.message || 'Không tìm thấy hộp game với barcode này.'}
          </p>
        ) : null}

        {lookupBarcode && lookupSuccess && lookedUpBox ? (
          <div className="relative mt-3 grid gap-2 rounded-lg border-2 border-violet-300 bg-gradient-to-br from-white via-violet-50/60 to-purple-50/40 p-3 text-sm shadow-[2px_2px_0_rgba(139,92,246,0.3)] sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-600">
                <span className="mr-1 text-yellow-400">▸</span>Barcode
              </p>
              <p className="font-mono text-xs font-extrabold uppercase tracking-wide text-violet-950">
                {lookedUpBox.barcode}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-600">
                <span className="mr-1 text-yellow-400">▸</span>Trạng thái
              </p>
              <Badge
                variant="outline"
                className={INVENTORY_STATUS_COLORS[lookedUpBox.status] ?? ''}
              >
                {INVENTORY_STATUS_LABELS[lookedUpBox.status] ?? lookedUpBox.status}
              </Badge>
            </div>
            <div>
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-600">
                <span className="mr-1 text-yellow-400">▸</span>Game
              </p>
              <p className="font-mono text-xs font-extrabold uppercase tracking-wide text-violet-950">
                ► {lookedUpBox.gameName || '—'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-600">
                <span className="mr-1 text-yellow-400">▸</span>Inventory
              </p>
              <p className="font-mono text-[11px] font-bold tracking-wider text-violet-700 break-all">
                {lookedUpBox.inventoryId || '—'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-600">
                <span className="mr-1 text-yellow-400">▸</span>Box ID
              </p>
              <p className="font-mono text-[11px] font-bold tracking-wider text-violet-700 break-all">
                {lookedUpBox.id || '—'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* FILTER BAR — style game */}
      <div className="relative overflow-hidden rounded-xl border-2 border-violet-400 bg-gradient-to-r from-violet-100/60 via-white to-purple-100/60 p-3 shadow-[2px_2px_0_rgba(139,92,246,0.3)]">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
        <span className="pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_6px_currentColor]" />

        <div className="relative flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <Input
              placeholder="▸ Lọc danh sách: barcode, tên game..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchInput);
                  setPage(1);
                }
              }}
              className="min-w-0 flex-1 border-2 border-violet-300 bg-white font-mono text-xs font-bold focus-visible:border-violet-500 focus-visible:ring-violet-300"
            />
            <button
              type="button"
              onClick={() => {
                setSearch(searchInput);
                setPage(1);
              }}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md border-2 border-violet-700 bg-gradient-to-b from-violet-500 to-violet-700 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),2px_2px_0_rgba(0,0,0,0.15)] hover:from-violet-400 hover:to-violet-600"
            >
              <span className="text-yellow-300">►</span> Lọc
            </button>
          </div>

          <Select
            value={gameTemplateId}
            onValueChange={(value) => {
              setGameTemplateId(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-2 border-violet-300 bg-white font-mono text-xs font-bold md:w-[240px]">
              <SelectValue placeholder="Lọc theo game" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs font-bold">
                ► Tất cả tựa game
              </SelectItem>
              {gameOptions.map((game) => (
                <SelectItem key={game.id} value={game.id} className="font-mono text-xs font-bold">
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-2 border-violet-300 bg-white font-mono text-xs font-bold md:w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {INVENTORY_STATUS_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="font-mono text-xs font-bold">
                  {item.label}
                </SelectItem>
              ))}
              <SelectItem value="Retired" className="font-mono text-xs font-bold">
                Ngưng dùng
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border-2 border-rose-400 bg-gradient-to-r from-rose-100 via-pink-50 to-fuchsia-100 p-3 font-mono text-xs font-bold text-rose-700 shadow-[2px_2px_0_rgba(244,63,94,0.4)]">
          <span className="mr-1">⚠</span>
          {(error as Error)?.message || 'Không thể tải danh sách hộp game.'}{' '}
          <button
            type="button"
            className="underline decoration-2 underline-offset-2"
            onClick={() => void refetch()}
          >
            ► Thử lại
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border-2 border-violet-300 bg-violet-50/60 p-3 font-mono text-xs font-bold uppercase tracking-widest text-violet-700 shadow-[2px_2px_0_rgba(139,92,246,0.3)]">
          <span className="size-2 animate-pulse rounded-full bg-violet-500 shadow-[0_0_6px_currentColor]" />
          Đang tải danh sách hộp game…
        </div>
      ) : (
        <>
          <PartnerDataTable
            columns={columns}
            data={paged}
            emptyMessage="▸ Chưa có hộp game nào trong kho POS."
          />

          <CommonPagination
            meta={meta}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
