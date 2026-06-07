export interface ListQueryState {
  page: number;
  limit: number;
  search: string;
  role: string;
}

export interface ListQueryDefaults {
  limit: number;
  role: string;
}

export function parseListQuery(
  params: URLSearchParams,
  defaults: ListQueryDefaults,
): ListQueryState {
  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = Math.max(1, Number(params.get('limit')) || defaults.limit);
  const search = params.get('q') ?? '';
  const role = params.get('role') ?? defaults.role;

  return { page, limit, search, role };
}

export function buildListQueryString(
  state: ListQueryState,
  defaults: ListQueryDefaults,
): string {
  const params = new URLSearchParams();

  if (state.page > 1) params.set('page', String(state.page));
  if (state.limit !== defaults.limit) params.set('limit', String(state.limit));
  if (state.search) params.set('q', state.search);
  if (state.role !== defaults.role) params.set('role', state.role);

  return params.toString();
}

export function buildListHref(
  basePath: string,
  state: ListQueryState,
  defaults: ListQueryDefaults,
): string {
  const queryString = buildListQueryString(state, defaults);
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function buildDetailHref(
  detailPath: string,
  listBasePath: string,
  state: ListQueryState,
  defaults: ListQueryDefaults,
): string {
  const returnTo = buildListHref(listBasePath, state, defaults);
  if (returnTo === listBasePath) return detailPath;

  const params = new URLSearchParams({ returnTo });
  return `${detailPath}?${params.toString()}`;
}

export function isValidListReturnUrl(returnTo: string, allowedPrefixes: string[]): boolean {
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return false;
  return allowedPrefixes.some(
    (prefix) => returnTo === prefix || returnTo.startsWith(`${prefix}?`),
  );
}

export function resolveListBackUrl(
  searchParams: URLSearchParams,
  fallbackPath: string,
  allowedPrefixes: string[] = [fallbackPath],
): string {
  const returnTo = searchParams.get('returnTo');
  if (!returnTo || !isValidListReturnUrl(returnTo, allowedPrefixes)) {
    return fallbackPath;
  }
  return returnTo;
}
