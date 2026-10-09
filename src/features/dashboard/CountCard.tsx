import { Link } from 'react-router-dom';
import { ALL_PAGES_CAP, useAllItems, type ResourceName } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { Button, Skeleton } from '@/shared/ui';

/**
 * Conteo REAL de registros activos de un recurso: recorre las páginas de la API (cursor) hasta el tope.
 * Solo muestra "1000+" si hay más registros que el tope.
 */
export function CountCard({ resource, label, to }: { resource: ResourceName; label: string; to: string }) {
  const query = useAllItems(resource);
  const data = query.data;
  const value = data ? `${data.items.length}${data.truncated ? '+' : ''}` : null;
  return (
    <li className="flex">
      <div className="flex w-full flex-col justify-between gap-2 rounded border-2 border-border bg-surface p-4 shadow-card">
        {/* El nombre accesible sale del contenido (sin aria-label): "Vuelos (salidas) 30 activos". El orden visual (número arriba) lo da flex-col-reverse. */}
        <Link to={to} className="flex flex-col-reverse gap-1 no-underline hover:underline">
          <span className="font-bold text-foreground">{label}</span>{' '}
          {query.isLoading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <span className="text-3xl font-bold text-primary tabular-nums">
              {value ?? es.common.dash}
              {value ? (
                <>
                  {' '}
                  <span className="sr-only">{es.dashboard.active}</span>
                </>
              ) : null}
            </span>
          )}
        </Link>
        {query.error ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-error">
            <span>{es.dashboard.countError}</span>
            <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
              {es.common.retry}
            </Button>
          </div>
        ) : null}
        {data?.truncated ? <p className="text-sm text-muted">{fmt(es.dashboard.capShort, { cap: ALL_PAGES_CAP })}</p> : null}
      </div>
    </li>
  );
}
