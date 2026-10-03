'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Package, Timer, Users, X, ZoomIn } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { INVENTORY_CONDITION_LABELS } from '@/core/constants/inventory';
import { ROUTES } from '@/core/constants/routes';
import { useInventoryDetail } from '../hooks/useInventoryDetail';
import { formatCurrencyVnd, formatInventoryDate } from '../utils/inventory.mapper';
import { InventoryStatusBadge } from './inventory-status-badge';

interface InventoryDetailViewProps {
  cafeId: string;
  inventoryId: string;
}

export function InventoryDetailView({ cafeId, inventoryId }: InventoryDetailViewProps) {
  const { data, isLoading, isError, refetch } = useInventoryDetail(cafeId, inventoryId);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="relative space-y-4 overflow-hidden rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 p-6 shadow-[3px_3px_0_rgba(139,92,246,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
        <div className="relative space-y-3">
          <Skeleton className="h-6 w-48 rounded-lg border-2 border-violet-200" />
          <Skeleton className="h-48 w-full rounded-xl border-2 border-violet-200" />
          <Skeleton className="h-24 w-full rounded-xl border-2 border-violet-200" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-rose-400 bg-gradient-to-br from-rose-100 via-pink-50 to-fuchsia-100 p-6 shadow-[3px_3px_0_rgba(244,63,94,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
        <div className="relative flex flex-col items-center gap-3 py-4 text-center">
          <span className="relative inline-flex size-3 animate-pulse rounded-full bg-rose-500 shadow-[0_0_10px_currentColor]" />
          <p className="font-mono text-sm font-extrabold uppercase tracking-widest text-rose-700">
            ⚠ Không thể tải chi tiết kho game.
          </p>
          <button
            type="button"
            className="rounded-md border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)] hover:from-rose-400"
            onClick={() => refetch()}
          >
            ► Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* BACK BUTTON */}
      <Button
        variant="outline"
        size="sm"
        asChild
        className="border-2 border-violet-400 bg-white font-mono text-xs font-extrabold uppercase tracking-widest text-violet-700 shadow-[2px_2px_0_rgba(139,92,246,0.4)] hover:bg-violet-50 hover:shadow-[3px_3px_0_rgba(139,92,246,0.6)]"
      >
        <Link href={ROUTES.STAFF.INVENTORY}>
          <ArrowLeft className="mr-1.5 size-3.5" />
          ► Quay lại kho
        </Link>
      </Button>

      {/* GAME CARD (ảnh + title + barcode + condition) */}
        <div className="relative overflow-hidden rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 shadow-[3px_3px_0_rgba(139,92,246,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
          <span className="pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full bg-violet-500 shadow-[0_0_8px_currentColor]" />
          <span className="pointer-events-none absolute left-3 top-3 size-2 animate-pulse rounded-full bg-fuchsia-500 shadow-[0_0_8px_currentColor] [animation-delay:0.5s]" />
          <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
            {/* Cover image */}
            <div
              className="group relative aspect-square w-32 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border-2 border-violet-300 bg-gradient-to-br from-violet-200 via-purple-100 to-fuchsia-100 shadow-[2px_2px_0_rgba(139,92,246,0.3)] sm:w-40"
              onClick={() => data.gameTemplate.imageUrl && setLightboxSrc(data.gameTemplate.imageUrl)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxSrc(data.gameTemplate.imageUrl); }}
            >
              {data.gameTemplate.imageUrl ? (
                <>
                  <Image
                    src={data.gameTemplate.imageUrl}
                    alt={data.gameTemplate.title}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="160px"
                    priority
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                    <ZoomIn className="size-6 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </span>
                </>
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Package className="h-12 w-12 text-violet-400/60" />
                </div>
              )}
            </div>
            {/* Title + meta */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <h2 className="font-mono text-lg font-extrabold uppercase tracking-tight text-violet-950 sm:text-xl">
                ► {data.gameTemplate.title}
              </h2>
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-violet-700">
                <span className="size-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_currentColor]" />
                <span className="truncate">{data.barcode ?? '— KHÔNG CÓ BARCODE —'}</span>
              </div>
              {data.condition && (
                <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-violet-700">
                  <span className="mr-1 text-violet-400">▸</span>
                  Tình trạng: {INVENTORY_CONDITION_LABELS[data.condition] ?? data.condition}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <InventoryStatusBadge status={data.status} />
                {data.gameTemplate && (
                  <span className="relative inline-flex items-center gap-1 rounded-md border-2 border-cyan-400 bg-gradient-to-b from-cyan-100 to-cyan-200 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-cyan-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
                    <Users className="size-3 text-cyan-600" />
                    {data.gameTemplate.minPlayers}–{data.gameTemplate.maxPlayers} NGƯỜI
                  </span>
                )}
                {data.gameTemplate && (
                  <span className="relative inline-flex items-center gap-1 rounded-md border-2 border-amber-400 bg-gradient-to-b from-amber-100 to-yellow-200 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-amber-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
                    <Timer className="size-3 text-amber-600" />
                    {data.gameTemplate.playingTime} PHÚT
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Divider + Info grid ghép chung */}
          <div className="relative border-t-2 border-violet-300/60 bg-gradient-to-r from-violet-50/60 via-purple-50/60 to-fuchsia-50/60 px-4 py-3">
            <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-800">
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_currentColor]" />
              ► Thông tin hộp game
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Mã kho" value={data.inventoryId} mono />
              <InfoItem label="Mã quán" value={data.cafeId} mono />
              <InfoItem label="Ngày mua" value={formatInventoryDate(data.purchaseDate)} />
              {data.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoItem label="Ghi chú" value={data.notes} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DESCRIPTION CARD */}
        <div className="relative overflow-hidden rounded-xl border-2 border-cyan-400 bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50 shadow-[3px_3px_0_rgba(34,211,238,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
          <span className="pointer-events-none absolute right-2 top-2 size-2 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_8px_currentColor]" />
          <div className="relative border-b-2 border-cyan-400/60 bg-gradient-to-r from-cyan-100 to-sky-100 px-4 py-2">
            <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-cyan-900">
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_currentColor]" />
              ► Mô tả game
            </span>
          </div>
          <div className="relative p-4">
            <p className="font-mono text-xs font-semibold leading-relaxed text-cyan-900">
              {data.gameTemplate.description ?? '— CHƯA CÓ MÔ TẢ —'}
            </p>
          </div>
        </div>

        {/* COMPONENTS CARD */}
        <div className="relative overflow-hidden rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 shadow-[3px_3px_0_rgba(16,185,129,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
          <span className="pointer-events-none absolute right-2 top-2 size-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_currentColor]" />
          <div className="relative border-b-2 border-emerald-400/60 bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2">
            <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-emerald-900">
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_currentColor]" />
              ► Linh kiện & mức phạt
            </span>
          </div>
          <div className="relative p-4">
            {data.componentPenalties.length === 0 ? (
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
                <span className="mr-1">▸</span> Chưa có dữ liệu linh kiện.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border-2 border-emerald-300/60">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-emerald-400/60 bg-gradient-to-r from-emerald-100 to-teal-100 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100">
                      <TableHead className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                        ► Linh kiện
                      </TableHead>
                      <TableHead className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                        ► Loại
                      </TableHead>
                      <TableHead className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                        ► SL/hộp
                      </TableHead>
                      <TableHead className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                        ► Phạt/đv
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.componentPenalties.map((component, ci) => (
                      <TableRow
                        key={component.componentId}
                        className={`border-b border-emerald-200/60 transition-colors hover:bg-emerald-50/70 ${ci % 2 === 0 ? 'bg-transparent' : 'bg-emerald-50/30'}`}
                      >
                        <TableCell className="py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-950">
                          ▹ {component.componentName}
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          {component.type || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-emerald-800">
                          {component.quantityInBox}
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-xs font-extrabold uppercase tracking-widest text-amber-700">
                          {formatCurrencyVnd(component.penaltyFeePerUnit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* LIGHTBOX: click ảnh để phóng to */}
        {lightboxSrc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxSrc(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Ảnh phóng to"
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border-2 border-white/40 bg-black/60 p-2 text-white transition-colors hover:bg-black/80 hover:border-white/70"
              onClick={() => setLightboxSrc(null)}
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
            <div
              className="relative max-h-full max-w-full overflow-hidden rounded-xl border-4 border-white/30 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxSrc}
                alt="Ảnh game phóng to"
                width={600}
                height={600}
                className="max-h-[80vh] max-w-[80vw] object-contain"
                priority
              />
            </div>
          </div>
        )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-0.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">{label}</p>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-amber-500" />}
        <span className={mono ? 'font-mono text-[11px] font-bold uppercase tracking-wider text-amber-950 break-all' : 'font-mono text-xs font-bold uppercase tracking-wide text-amber-900'}>
          {value}
        </span>
      </div>
    </div>
  );
}
