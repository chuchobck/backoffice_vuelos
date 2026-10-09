import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { es, fmt } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from './skeleton';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Si existe, la columna se puede ordenar con este valor (texto o número). */
  sortValue?: (row: T) => string | number;
  className?: string;
}

export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Nombre de la tabla: el lector de pantalla lo anuncia (caption). */
  caption: string;
  sort?: SortState | null;
  onSort?: (columnId: string) => void;
  loading?: boolean;
  skeletonRows?: number;
  isRowMuted?: (row: T) => boolean;
  /** Última columna (botones de cada fila). */
  actions?: (row: T) => ReactNode;
}

/** Orden de una columna: ascendente, descendente y sin orden. */
export function nextSort(current: SortState | null | undefined, columnId: string): SortState | null {
  if (!current || current.columnId !== columnId) return { columnId, direction: 'asc' };
  return current.direction === 'asc' ? { columnId, direction: 'desc' } : null;
}

export function sortRows<T>(rows: T[], columns: Column<T>[], sort: SortState | null | undefined): T[] {
  const column = sort ? columns.find((c) => c.id === sort.columnId) : undefined;
  if (!sort || !column?.sortValue) return rows;
  const value = column.sortValue;
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor;
    return String(x).localeCompare(String(y), 'es', { numeric: true, sensitivity: 'base' }) * factor;
  });
}

/**
 * Tabla accesible: caption, th con scope, encabezados ordenables con aria-sort y botón de 44 px,
 * esqueletos mientras carga y desplazamiento horizontal DENTRO de su contenedor (la región se
 * puede enfocar para desplazarla con el teclado).
 */
export function DataTable<T>({ columns, rows, getRowId, caption, sort, onSort, loading = false, skeletonRows = 5, isRowMuted, actions }: DataTableProps<T>) {
  const colCount = columns.length + (actions ? 1 : 0);
  return (
    <div role="region" aria-label={fmt(es.a11y.tableRegion, { name: caption })} tabIndex={0} className="max-w-full overflow-x-auto rounded border-2 border-border bg-surface">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-primary-tint">
            {columns.map((c) => {
              const sorted = sort?.columnId === c.id ? sort.direction : null;
              return (
                <th
                  key={c.id}
                  scope="col"
                  aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : c.sortValue ? 'none' : undefined}
                  className={cn('whitespace-nowrap px-3 py-1 font-bold text-foreground', c.className)}
                >
                  {c.sortValue && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.id)}
                      aria-label={fmt(es.a11y.sortBy, { column: c.header })}
                      className="-mx-2 inline-flex min-h-11 items-center gap-1 rounded px-2 font-bold hover:bg-primary-tint hover:underline"
                    >
                      {c.header}
                      {sorted === 'asc' ? <ArrowUp aria-hidden="true" className="size-4" /> : sorted === 'desc' ? <ArrowDown aria-hidden="true" className="size-4" /> : <ArrowUpDown aria-hidden="true" className="size-4 text-muted" />}
                      {sorted ? <span className="sr-only">, {sorted === 'asc' ? es.a11y.sortedAsc : es.a11y.sortedDesc}</span> : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
            {actions ? (
              <th scope="col" className="whitespace-nowrap px-3 py-2 font-bold text-foreground">
                {es.common.actions}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={`sk-${i}`} className="border-t border-border" aria-hidden="true">
                  <td colSpan={colCount} className="px-3 py-2">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            : rows.map((row) => {
                const muted = isRowMuted?.(row) ?? false;
                return (
                  <tr key={getRowId(row)} className={cn('border-t border-border align-middle', muted && 'bg-background text-muted')}>
                    {columns.map((c) => (
                      <td key={c.id} className={cn('px-3 py-2', c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {actions ? <td className="px-3 py-2">{actions(row)}</td> : null}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
