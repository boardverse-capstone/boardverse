'use client';

import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaginationMeta } from '@/shared/types/pagination.interface';
import { getPaginationRange, getVisiblePages } from '@/shared/utils/pagination.util';
import { cn } from '@/lib/utils';

interface CommonPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function CommonPagination({
  meta,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [5, 10, 20],
  className,
}: CommonPaginationProps) {
  const { currentPage, totalPages, totalItems, limit, hasPrevious, hasNext } = meta;
  const { start, end } = getPaginationRange(meta);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Hiển thị{' '}
        <span className="font-medium text-foreground">{start}</span>–
        <span className="font-medium text-foreground">{end}</span> trong{' '}
        <span className="font-medium text-foreground">{totalItems}</span> đơn
      </p>

      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        {onLimitChange && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Số dòng</span>
            <Select
              value={String(limit)}
              onValueChange={(value) => onLimitChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[72px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="Trước"
                  href="#"
                  className={cn(!hasPrevious && 'pointer-events-none opacity-50')}
                  onClick={(event) => {
                    event.preventDefault();
                    if (hasPrevious) onPageChange(currentPage - 1);
                  }}
                />
              </PaginationItem>

              {visiblePages.map((page, index) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <Button
                      variant={page === currentPage ? 'outline' : 'ghost'}
                      size="icon"
                      className={cn(
                        'size-9',
                        page === currentPage && 'border-amber-300 bg-amber-100 text-amber-900',
                      )}
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  text="Sau"
                  href="#"
                  className={cn(!hasNext && 'pointer-events-none opacity-50')}
                  onClick={(event) => {
                    event.preventDefault();
                    if (hasNext) onPageChange(currentPage + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
