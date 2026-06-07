'use client';

import { useSearchParams } from 'next/navigation';
import { resolveListBackUrl } from '@/shared/utils/list-query.util';

export function useListBackUrl(
  fallbackPath: string,
  allowedPrefixes?: string[],
): string {
  const searchParams = useSearchParams();
  return resolveListBackUrl(searchParams, fallbackPath, allowedPrefixes ?? [fallbackPath]);
}
