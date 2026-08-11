'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ScanBarcode } from 'lucide-react';
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
            <div className="font-medium">{row.original.gameName || '—'}</div>
            {row.original.gameTemplateId ? (
              <div className="font-mono text-[11px] text-muted-foreground">
                {row.original.gameTemplateId.slice(0, 8)}…
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={INVENTORY_STATUS_COLORS[row.original.status] ?? ''}
          >
            {INVENTORY_STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'inventoryId',
        header: 'Inventory',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground">
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
          <span className="font-mono text-[11px] text-muted-foreground">
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

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanBarcode className="h-4 w-4" />
          Tra cứu theo barcode
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="VD: BV-CATAN-001"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runBarcodeLookup();
            }}
            className="min-w-0 flex-1 font-mono"
            autoComplete="off"
          />
          <Button
            type="button"
            className="shrink-0"
            disabled={!barcodeInput.trim() || lookupFetching}
            onClick={runBarcodeLookup}
          >
            {lookupFetching ? 'Đang tra cứu...' : 'Tra cứu'}
          </Button>
          {lookupBarcode ? (
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setLookupBarcode('');
                setBarcodeInput('');
              }}
            >
              Xóa
            </Button>
          ) : null}
        </div>

        {lookupBarcode && lookupFetching ? (
          <p className="text-sm text-muted-foreground">Đang tra cứu `{lookupBarcode}`...</p>
        ) : null}

        {lookupBarcode && lookupError ? (
          <p className="text-sm text-rose-600">
            {(lookupErr as Error)?.message || 'Không tìm thấy hộp game với barcode này.'}
          </p>
        ) : null}

        {lookupBarcode && lookupSuccess && lookedUpBox ? (
          <div className="grid gap-2 rounded-md border bg-background p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Barcode</p>
              <p className="font-mono font-medium">{lookedUpBox.barcode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trạng thái</p>
              <Badge
                variant="outline"
                className={INVENTORY_STATUS_COLORS[lookedUpBox.status] ?? ''}
              >
                {INVENTORY_STATUS_LABELS[lookedUpBox.status] ?? lookedUpBox.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Game</p>
              <p className="font-medium">{lookedUpBox.gameName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inventory</p>
              <p className="font-mono text-xs break-all">
                {lookedUpBox.inventoryId || '—'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Box ID</p>
              <p className="font-mono text-xs break-all">{lookedUpBox.id || '—'}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Lọc danh sách: barcode, tên game..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
          >
            Lọc
          </Button>
        </div>

        <Select
          value={gameTemplateId}
          onValueChange={(value) => {
            setGameTemplateId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-[240px]">
            <SelectValue placeholder="Lọc theo game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả tựa game</SelectItem>
            {gameOptions.map((game) => (
              <SelectItem key={game.id} value={game.id}>
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
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_STATUS_FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
            <SelectItem value="Retired">Ngưng dùng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="text-sm text-rose-600">
          {(error as Error)?.message || 'Không thể tải danh sách hộp game.'}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Đang tải danh sách hộp game...</div>
      ) : (
        <>
          <PartnerDataTable
            columns={columns}
            data={paged}
            emptyMessage="Chưa có hộp game nào trong kho POS."
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
