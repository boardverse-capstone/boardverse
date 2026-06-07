'use client';

import { PaginationMeta } from '@/shared/types/pagination.interface';
import { Button } from '@/components/ui/button';

interface CommonPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function CommonPagination({ meta, onPageChange }: CommonPaginationProps) {
  const { currentPage, totalPages, hasPrevious, hasNext } = meta;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Trang <span className="font-medium text-foreground">{currentPage}</span> /{' '}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
