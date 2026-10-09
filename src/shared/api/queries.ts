/**
 * Estado del servidor con TanStack Query: un hook por operación de `AdminApi`. Toda escritura
 * invalida las consultas del recurso (y las de los recursos que dependen de él, si se indican).
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { AdminApi, ListQuery, Page, Resource, ResourceName } from './AdminApi';
import { adminApi } from './instance';

export type ItemOf<N extends ResourceName> = AdminApi[N] extends Resource<infer T, never, never, unknown> ? T : never;
export type CreateOf<N extends ResourceName> = AdminApi[N] extends Resource<unknown, infer C, never, unknown> ? C : never;
export type UpdateOf<N extends ResourceName> = AdminApi[N] extends Resource<unknown, never, infer U, unknown> ? U : never;
export type DetailOf<N extends ResourceName> = AdminApi[N] extends Resource<unknown, never, never, infer D> ? D : never;

/** Tope de la búsqueda "en todo" y de los conteos: 20 páginas de 50 = 1000 registros. */
export const PAGE_SIZE_MAX = 50;
export const MAX_PAGES = 20;
export const ALL_PAGES_CAP = PAGE_SIZE_MAX * MAX_PAGES;

export const adminKeys = {
  resource: (name: ResourceName) => ['admin', name] as const,
  list: (name: ResourceName, q: ListQuery) => ['admin', name, 'list', q] as const,
  all: (name: ResourceName, q: ListQuery) => ['admin', name, 'all', q] as const,
  detail: (name: ResourceName, id: string) => ['admin', name, 'detail', id] as const,
};

function resourceOf<N extends ResourceName>(name: N) {
  return adminApi[name] as unknown as Resource<ItemOf<N>, CreateOf<N>, UpdateOf<N>, DetailOf<N>>;
}

export interface AllPages<T> {
  items: T[];
  /** `true` si había más páginas que el tope. */
  truncated: boolean;
}

/** Recorre las páginas por cursor hasta `maxPages`. Es lo que hace posible "buscar en todo" y los conteos reales. */
export async function fetchAllPages<T>(list: (q: ListQuery) => Promise<Page<T>>, base: ListQuery = {}, maxPages = MAX_PAGES): Promise<AllPages<T>> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await list({ ...base, limit: PAGE_SIZE_MAX, cursor });
    items.push(...page.items);
    if (!page.nextCursor) return { items, truncated: false };
    cursor = page.nextCursor;
  }
  return { items, truncated: true };
}

/** Una página de un listado. `keepPrevious` evita parpadeos al cambiar de página o de filtro. */
export function useList<N extends ResourceName>(name: N, query: ListQuery, enabled = true): UseQueryResult<Page<ItemOf<N>>> {
  return useQuery({
    queryKey: adminKeys.list(name, query),
    queryFn: () => resourceOf(name).list(query),
    enabled,
    placeholderData: (previous) => previous,
  });
}

/** Todas las páginas (hasta el tope), para buscar en todo y ordenar sobre el conjunto completo. */
export function useAllPages<N extends ResourceName>(name: N, base: ListQuery, enabled = true): UseQueryResult<AllPages<ItemOf<N>>> {
  return useQuery({
    queryKey: adminKeys.all(name, base),
    queryFn: () => fetchAllPages(resourceOf(name).list, base),
    enabled,
  });
}

export function useDetail<N extends ResourceName>(name: N, id: string | undefined): UseQueryResult<DetailOf<N>> {
  return useQuery({
    queryKey: adminKeys.detail(name, id ?? ''),
    queryFn: () => resourceOf(name).get(id ?? ''),
    enabled: !!id,
  });
}

/** Todos los activos de un recurso, para llenar listas desplegables (cacheado 5 min). */
export function useAllItems<N extends ResourceName>(name: N, filters?: Record<string, string | undefined>, enabled = true): UseQueryResult<AllPages<ItemOf<N>>> {
  return useQuery({
    queryKey: adminKeys.all(name, { filters }),
    queryFn: () => fetchAllPages(resourceOf(name).list, { filters }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

function useInvalidate(name: ResourceName, also: ResourceName[] = []) {
  const qc = useQueryClient();
  return () => Promise.all([name, ...also].map((n) => qc.invalidateQueries({ queryKey: adminKeys.resource(n) })));
}

export function useCreateMutation<N extends ResourceName>(name: N, also: ResourceName[] = []) {
  const invalidate = useInvalidate(name, also);
  return useMutation({ mutationFn: (body: CreateOf<N>) => resourceOf(name).create(body), onSuccess: invalidate });
}

export function useUpdateMutation<N extends ResourceName>(name: N, also: ResourceName[] = []) {
  const invalidate = useInvalidate(name, also);
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: UpdateOf<N> }) => resourceOf(name).update(id, body), onSuccess: invalidate });
}

export function useDeactivateMutation<N extends ResourceName>(name: N, also: ResourceName[] = []) {
  const invalidate = useInvalidate(name, also);
  return useMutation({ mutationFn: (id: string) => resourceOf(name).deactivate(id), onSuccess: invalidate });
}

export function useReactivateMutation<N extends ResourceName>(name: N, also: ResourceName[] = []) {
  const invalidate = useInvalidate(name, also);
  return useMutation({ mutationFn: (id: string) => resourceOf(name).reactivate(id), onSuccess: invalidate });
}
