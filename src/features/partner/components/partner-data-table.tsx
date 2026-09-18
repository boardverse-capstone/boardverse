'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PartnerDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
}

export function PartnerDataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = 'Không có đơn đăng ký nào cần xử lý.',
  onRowClick,
}: PartnerDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-violet-400 bg-white shadow-[3px_3px_0_rgba(139,92,246,0.35),0_8px_24px_rgba(0,0,0,0.08)]">
      {/* CRT scanlines nhẹ */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.04)_3px,rgba(255,255,255,0.04)_4px)]" />
      {/* LED góc trên-phải */}
      <span className="pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full bg-violet-500 shadow-[0_0_8px_currentColor]" />
      <span className="pointer-events-none absolute left-3 top-3 size-2 animate-pulse rounded-full bg-fuchsia-500 shadow-[0_0_8px_currentColor] [animation-delay:0.3s]" />
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b-2 border-violet-700/30 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600"
            >
              {headerGroup.headers.map((header, hIdx) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-10 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white",
                    "[text-shadow:1px_1px_0_rgba(0,0,0,0.3)]",
                  )}
                >
                  {header.isPlaceholder ? null : (
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-yellow-300 shadow-[0_0_4px_currentColor]" />
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row, rowIdx) => (
              <TableRow
                key={row.id}
                className={cn(
                  'border-b border-violet-100/60 bg-gradient-to-r from-white via-violet-50/40 to-purple-50/30 transition-all hover:from-violet-100 hover:via-purple-50/70 hover:to-fuchsia-50/60 hover:shadow-[inset_0_-2px_0_rgba(139,92,246,0.4)]',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="font-mono text-xs font-semibold text-neutral-800"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center font-mono text-xs font-bold uppercase tracking-widest text-violet-500"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-violet-400" />
                  ▸ {emptyMessage}
                </span>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
