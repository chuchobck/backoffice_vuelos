import { describe, expect, it, vi } from 'vitest';
import type { ListQuery, Page } from './AdminApi';
import { fetchAllPages, MAX_PAGES, PAGE_SIZE_MAX } from './queries';

/** Lista falsa paginada por cursor, como la API: `limit` y `cursor` → `{ items, nextCursor }`. */
function fakeList(total: number) {
  const rows = Array.from({ length: total }, (_, i) => i + 1);
  return vi.fn(async (q: ListQuery): Promise<Page<number>> => {
    const start = q.cursor ? Number(q.cursor) : 0;
    const limit = q.limit ?? 10;
    const items = rows.slice(start, start + limit);
    return start + limit < total ? { items, nextCursor: String(start + limit) } : { items };
  });
}

describe('fetchAllPages (buscar en todo y conteos reales)', () => {
  it('recorre todas las páginas por cursor y no marca truncado', async () => {
    const list = fakeList(120);
    const result = await fetchAllPages(list);
    expect(result.items).toHaveLength(120);
    expect(result.truncated).toBe(false);
    expect(list).toHaveBeenCalledTimes(3);
    expect(list.mock.calls[0]![0]).toMatchObject({ limit: PAGE_SIZE_MAX });
  });

  it('con una sola página hace una sola llamada', async () => {
    const list = fakeList(7);
    expect((await fetchAllPages(list)).items).toHaveLength(7);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('respeta el tope de páginas e indica que hay más', async () => {
    const list = fakeList(PAGE_SIZE_MAX * MAX_PAGES + 10);
    const result = await fetchAllPages(list);
    expect(result.items).toHaveLength(PAGE_SIZE_MAX * MAX_PAGES);
    expect(result.truncated).toBe(true);
    expect(list).toHaveBeenCalledTimes(MAX_PAGES);
  });

  it('exactamente en el tope no se marca truncado', async () => {
    const result = await fetchAllPages(fakeList(PAGE_SIZE_MAX * MAX_PAGES));
    expect(result.items).toHaveLength(PAGE_SIZE_MAX * MAX_PAGES);
    expect(result.truncated).toBe(false);
  });

  it('mantiene los filtros de la consulta base', async () => {
    const list = fakeList(60);
    await fetchAllPages(list, { includeInactive: true, filters: { country: 'EC' } });
    expect(list.mock.calls.every(([q]) => q.includeInactive === true && q.filters?.country === 'EC')).toBe(true);
  });
});
