import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ALL_PAGES_CAP, useAllItems } from '@/shared/api';
import { normalizeText } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { Button, DataTable, EmptyState, ErrorState, Field, Input, LoadingState, nextSort, sortRows, type Column, type SortState } from '@/shared/ui';
import { groupRoutes, type RouteRow } from './groupRoutes';

const t = es.entities.routes;

/**
 * Rutas: vista de solo lectura calculada con los números de vuelo (la API no tiene un recurso de
 * rutas; cada ruta es un par origen → destino). Cada número enlaza a sus salidas.
 */
export function RoutesScreen() {
  const flights = useAllItems('flightNumbers');
  const airports = useAllItems('airports');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);

  const names = useMemo(() => new Map((airports.data?.items ?? []).map((a) => [a.code, `${a.cityName}`])), [airports.data]);
  const rows = useMemo(() => groupRoutes(flights.data?.items ?? []), [flights.data]);

  const columns: Column<RouteRow>[] = [
    { id: 'route', header: t.cols.route, cell: (r) => <span className="font-mono font-bold">{`${r.origin} → ${r.destination}`}</span>, sortValue: (r) => r.key },
    { id: 'airports', header: t.cols.airports, cell: (r) => `${names.get(r.origin) ?? r.origin} → ${names.get(r.destination) ?? r.destination}`, sortValue: (r) => `${names.get(r.origin) ?? r.origin}` },
    {
      id: 'flights',
      header: t.cols.flights,
      cell: (r) => (
        <ul className="flex flex-wrap gap-2">
          {r.flights.map((n) => (
            <li key={n}>
              <Link to={routes.departures(n)} aria-label={fmt(t.seeDepartures, { flight: n })} className="inline-flex min-h-11 items-center font-mono font-bold">
                {n}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
    { id: 'count', header: t.cols.count, cell: (r) => r.flights.length, sortValue: (r) => r.flights.length, className: 'text-right' },
  ];

  if (flights.isLoading) return <LoadingState label={t.loading} skeletons={4} />;
  if (flights.error) return <ErrorState error={flights.error} onRetry={() => void flights.refetch()} />;
  if (rows.length === 0) {
    return (
      <EmptyState
        title={t.emptyTitle}
        text={t.emptyText}
        action={
          <Button asChild>
            <Link to={routes.createFlight()}>{t.createLink}</Link>
          </Button>
        }
      />
    );
  }

  const needle = normalizeText(search.trim());
  const filtered = needle ? rows.filter((r) => normalizeText(`${r.key} ${r.flights.join(' ')} ${names.get(r.origin) ?? ''} ${names.get(r.destination) ?? ''}`).includes(needle)) : rows;
  const sorted = sortRows(filtered, columns, sort);

  return (
    <div className="flex flex-col gap-4">
      <Field id="routes-search" label={es.table.searchLabel} required className="max-w-md">
        <Input type="search" value={search} placeholder={es.table.searchPlaceholder} autoComplete="off" spellCheck={false} onChange={(e) => setSearch(e.target.value)} />
      </Field>
      {flights.data?.truncated ? <p className="text-sm text-muted">{fmt(t.truncated, { count: flights.data.items.length, cap: ALL_PAGES_CAP })}</p> : null}
      <p className="text-sm text-muted" role="status">
        {fmt(es.table.resultsCount, { count: sorted.length })}
      </p>
      <DataTable caption={t.caption} columns={columns} rows={sorted} getRowId={(r) => r.key} sort={sort} onSort={(id) => setSort((s) => nextSort(s, id))} />
    </div>
  );
}
