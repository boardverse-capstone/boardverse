'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { INVENTORY_STATUS_FILTERS } from '@/core/constants/inventory';
import { PosBoxesPanel } from '@/features/pos-check-in/components/pos-boxes-panel';
import { InventoryListTable } from './inventory-list-table';
import { useInventoryList } from '../hooks/useInventoryList';
import { useStaffWorkingCafe } from '../hooks/useStaffCafe';
import { useSelectedCafeId } from '../hooks/useSelectedCafeId';

const DEFAULT_LIMIT = 10;

type InventoryTab = 'titles' | 'boxes';

function resolveTab(value: string | null): InventoryTab {
  return value === 'boxes' ? 'boxes' : 'titles';
}

export function InventoryWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryCafeId = searchParams.get('cafeId') ?? undefined;
  const activeTab = resolveTab(searchParams.get('tab'));

  const { data: workingCafe } = useStaffWorkingCafe();
  const { cafeId, setCafeId } = useSelectedCafeId(queryCafeId ?? workingCafe?.id);

  // Ưu tiên cafe từ query / working staff API — ghi đè localStorage mock cũ (cafe-demo-*)
  useEffect(() => {
    if (queryCafeId) {
      setCafeId(queryCafeId);
      return;
    }
    if (workingCafe?.id) {
      setCafeId(workingCafe.id);
    }
  }, [queryCafeId, workingCafe?.id, setCafeId]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const selectedCafe = useMemo(() => workingCafe, [workingCafe]);

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

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === 'boxes') next.set('tab', 'boxes');
    else next.delete('tab');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Kho game"
        description={
          selectedCafe
            ? `${selectedCafe.name}${selectedCafe.address ? ` · ${selectedCafe.address}` : ''}`
            : 'Tựa game trong kho và hộp vật lý (barcode).'
        }
      />

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="relative inline-flex h-12 w-fit items-center justify-center gap-1 rounded-lg border-2 border-violet-500 bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 p-1 shadow-[3px_3px_0_rgba(139,92,246,0.4)]">
          {/* CRT scanlines */}
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
          {/* LED góc */}
          <span className="pointer-events-none absolute -left-1 -top-1 size-2 animate-pulse rounded-full bg-yellow-300 shadow-[0_0_6px_currentColor]" />
          <span className="pointer-events-none absolute -right-1 -bottom-1 size-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_6px_currentColor] [animation-delay:0.3s]" />
          <TabsTrigger
            value="titles"
            className="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10 hover:text-white data-[state=active]:border-2 data-[state=active]:border-yellow-300 data-[state=active]:bg-gradient-to-b data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),0_0_10px_rgba(250,204,21,0.5)]"
          >
            ► Tựa Game
          </TabsTrigger>
          <TabsTrigger
            value="boxes"
            className="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10 hover:text-white data-[state=active]:border-2 data-[state=active]:border-yellow-300 data-[state=active]:bg-gradient-to-b data-[state=active]:from-fuchsia-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),0_0_10px_rgba(250,204,21,0.5)]"
          >
            ► Hộp Vật Lý
          </TabsTrigger>
        </TabsList>

        <TabsContent value="titles" className="mt-4 space-y-4">
          <div className="relative flex flex-col gap-3 overflow-hidden rounded-lg border-2 border-violet-400 bg-gradient-to-r from-violet-100/60 via-white to-purple-100/60 p-3 shadow-[2px_2px_0_rgba(139,92,246,0.3)] md:flex-row md:flex-wrap md:items-end">
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
            <span className="pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_6px_currentColor]" />
            <Input
              placeholder="▸ Tìm theo tên game hoặc barcode..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="min-w-0 flex-1 border-2 border-violet-300 bg-white font-mono text-xs font-bold focus-visible:border-violet-500 focus-visible:ring-violet-300 md:max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
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
              </SelectContent>
            </Select>
            <button
              type="button"
              className="group inline-flex h-9 items-center justify-center gap-1.5 rounded-md border-2 border-violet-700 bg-gradient-to-b from-violet-500 to-violet-600 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_2px_0_rgba(0,0,0,0.15)] hover:from-violet-500 hover:to-violet-500"
              onClick={handleSearch}
            >
              <span className="text-yellow-300">►</span> Tìm Kiếm
            </button>
          </div>

          {isError ? (
            <div className="rounded-lg border-2 border-rose-400 bg-gradient-to-r from-rose-100 via-pink-50 to-fuchsia-100 p-4 font-mono text-xs font-bold text-rose-700 shadow-[2px_2px_0_rgba(244,63,94,0.4)]">
              <span className="mr-2">⚠</span> Không thể tải kho game.{' '}
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
        </TabsContent>

        <TabsContent value="boxes" className="mt-4">
          <PosBoxesPanel cafeId={cafeId} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
