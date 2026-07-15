'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { CommonPagination } from '@/components/common/pagination';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INVENTORY_STATUS_FILTERS } from '@/core/constants/inventory';
import { InventoryListTable } from './inventory-list-table';
import { NearbyCafesPanel } from './nearby-cafes-panel';
import { useInventoryList } from '../hooks/useInventoryList';
import { useNearbyCafes, useStaffWorkingCafe } from '../hooks/useStaffCafe';
import { useSelectedCafeId } from '../hooks/useSelectedCafeId';

const DEFAULT_LIMIT = 10;

export function InventoryWorkspace() {
  const searchParams = useSearchParams();
  const queryCafeId = searchParams.get('cafeId') ?? undefined;

  const { data: workingCafe } = useStaffWorkingCafe();
  const { data: nearbyCafes } = useNearbyCafes();
  const { cafeId, setCafeId } = useSelectedCafeId(
    queryCafeId ?? workingCafe?.id ?? nearbyCafes?.[0]?.id,
  );

  useEffect(() => {
    if (queryCafeId) setCafeId(queryCafeId);
  }, [queryCafeId, setCafeId]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const selectedCafe = useMemo(() => {
    const list = nearbyCafes ?? [];
    return list.find((cafe) => cafe.id === cafeId) ?? workingCafe;
  }, [nearbyCafes, cafeId, workingCafe]);

  const { data, isLoading, isError, refetch } = useInventoryList(cafeId, {
    page,
    limit,
    search,
    status,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Kho game"
        description={
          selectedCafe
            ? `${selectedCafe.name}${selectedCafe.address ? ` · ${selectedCafe.address}` : ''}`
            : 'Quản lý inventory board game của quán (Full Mode cho CafeStaff).'
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
            <Input
              placeholder="Tìm theo tên game hoặc barcode..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="min-w-0 flex-1 md:max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
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
              </SelectContent>
            </Select>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              onClick={handleSearch}
            >
              Tìm kiếm
            </button>
          </div>

          {isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Không thể tải kho game.{' '}
              <button type="button" className="underline" onClick={() => refetch()}>
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <InventoryListTable cafeId={cafeId ?? ''} data={data?.data ?? []} isLoading={isLoading} />
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
            </>
          )}
        </div>

        <NearbyCafesPanel
          selectedCafeId={cafeId}
          onSelectCafe={(cafe) => {
            setCafeId(cafe.id);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
