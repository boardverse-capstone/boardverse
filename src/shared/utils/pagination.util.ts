export function getVisiblePages(
  currentPage: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  for (let page = rangeStart; page <= rangeEnd; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);
  return pages;
}

export function getPaginationRange(meta: {
  currentPage: number;
  limit: number;
  totalItems: number;
}) {
  if (meta.totalItems === 0) {
    return { start: 0, end: 0 };
  }

  const start = (meta.currentPage - 1) * meta.limit + 1;
  const end = Math.min(meta.currentPage * meta.limit, meta.totalItems);
  return { start, end };
}
