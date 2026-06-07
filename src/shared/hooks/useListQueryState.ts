'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildDetailHref,
  buildListHref,
  buildListQueryString,
  parseListQuery,
  type ListQueryDefaults,
  type ListQueryState,
} from '@/shared/utils/list-query.util';

interface UseListQueryStateOptions {
  defaultLimit: number;
  defaultRole?: string;
}

export function useListQueryState({
  defaultLimit,
  defaultRole = 'all',
}: UseListQueryStateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaults = useMemo<ListQueryDefaults>(
    () => ({ limit: defaultLimit, role: defaultRole }),
    [defaultLimit, defaultRole],
  );

  const queryState = useMemo(
    () => parseListQuery(searchParams, defaults),
    [searchParams, defaults],
  );

  const [searchInput, setSearchInput] = useState(queryState.search);

  useEffect(() => {
    setSearchInput(queryState.search);
  }, [queryState.search]);

  const pushQuery = useCallback(
    (patch: Partial<ListQueryState>) => {
      const next = { ...queryState, ...patch };
      const queryString = buildListQueryString(next, defaults);
      const href = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(href, { scroll: false });
    },
    [queryState, defaults, pathname, router],
  );

  useEffect(() => {
    if (searchInput === queryState.search) return;

    const timer = window.setTimeout(() => {
      pushQuery({ search: searchInput, page: 1 });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput, queryState.search, pushQuery]);

  return {
    page: queryState.page,
    limit: queryState.limit,
    search: searchInput,
    role: queryState.role,
    setPage: (page: number) => pushQuery({ page }),
    setLimit: (limit: number) => pushQuery({ limit, page: 1 }),
    setSearch: setSearchInput,
    setRole: (role: string) => pushQuery({ role, page: 1 }),
    listHref: (basePath: string) => buildListHref(basePath, queryState, defaults),
    detailHref: (detailPath: string, listBasePath: string) =>
      buildDetailHref(detailPath, listBasePath, queryState, defaults),
  };
}
