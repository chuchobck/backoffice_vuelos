import { useMemo, useState } from 'react';
import { useBookings, type BookingSummary } from '@/shared/api';
import { ResourceFilters, type FilterSpec } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/money';
import { Badge, Button, DataTable, EmptyState, ErrorState, type Column } from '@/shared/ui';
import { BookingDetailDialog } from './BookingDetailDialog';
import { CancelBookingDialog } from './CancelBookingDialog';
import { canCancel, STATUS_TONE, statusLabel } from './labels';

const t = es.bookings;

const STATUS_OPTIONS = (Object.keys(t.status) as (keyof typeof t.status)[]).map((s) => ({ value: s, label: t.status[s] }));

const FILTERS: FilterSpec[] = [
  { name: 'pnr', label: t.filters.pnr, kind: 'text', upper: true, maxLength: 6, pattern: /^[A-Za-z0-9]{6}$/, patternMessage: t.pnrInvalid, placeholder: 'K7M2QX' },
  { name: 'status', label: t.filters.status, kind: 'select', options: STATUS_OPTIONS },
  { name: 'createdFrom', label: t.filters.createdFrom, kind: 'date' },
  { name: 'createdTo', label: t.filters.createdTo, kind: 'date' },
  { name: 'ownerEmail', label: t.filters.ownerEmail, kind: 'text', maxLength: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: t.emailInvalid, placeholder: 'cliente@correo.com' },
  { name: 'flightNumber', label: t.filters.flightNumber, kind: 'text', upper: true, maxLength: 6, pattern: /^[A-Z0-9]{2}[1-9][0-9]{0,3}$/, patternMessage: t.flightInvalid, placeholder: 'LA2410' },
];

/** Reservas de todos los clientes: filtros del servidor, "Cargar más" por cursor, detalle y cancelación con confirmación. */
export function BookingsScreen() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<{ bookingId: string; pnr: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ bookingId: string; pnr: string } | null>(null);
  const query = useBookings(filters);
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  const columns: Column<BookingSummary>[] = [
    { id: 'pnr', header: t.cols.pnr, cell: (b) => <span className="font-mono font-bold">{b.pnr}</span> },
    { id: 'status', header: t.cols.status, cell: (b) => <Badge tone={STATUS_TONE[b.status]}>{statusLabel(b.status)}</Badge> },
    { id: 'route', header: t.cols.route, cell: (b) => <span className="whitespace-nowrap">{b.origin} → {b.destination}</span> },
    { id: 'date', header: t.cols.date, cell: (b) => <time dateTime={b.departureDate}>{b.departureDate}</time>, className: 'whitespace-nowrap' },
    { id: 'total', header: t.cols.total, cell: (b) => formatMoney(b.grandTotal.total, b.grandTotal.currency), className: 'whitespace-nowrap tabular-nums' },
    { id: 'owner', header: t.cols.owner, cell: (b) => <span className="break-all">{b.owner.email ?? t.noOwner}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ResourceFilters filters={FILTERS} applied={filters} onApply={setFilters} />

      <p className="text-sm text-muted" role="status">
        {query.isSuccess ? fmt(t.loadedInfo, { count: rows.length }) : ''}
      </p>

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isSuccess && rows.length === 0 ? (
        <EmptyState title={t.emptyTitle} text={t.emptyText} />
      ) : (
        <>
          <DataTable
            caption={t.tableCaption}
            columns={columns}
            rows={rows}
            getRowId={(b) => b.bookingId}
            loading={query.isLoading}
            isRowMuted={(b) => b.status === 'CANCELLED'}
            actions={(b) => (
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" aria-label={fmt(t.viewAria, { pnr: b.pnr })} onClick={() => setDetail({ bookingId: b.bookingId, pnr: b.pnr })}>
                  {t.view}
                </Button>
                {canCancel(b.status) ? (
                  <Button size="sm" variant="danger-outline" aria-label={fmt(t.cancelAria, { pnr: b.pnr })} onClick={() => setCancelTarget({ bookingId: b.bookingId, pnr: b.pnr })}>
                    {t.cancel}
                  </Button>
                ) : null}
              </div>
            )}
          />
          {query.error ? <ErrorState error={query.error} onRetry={() => void query.fetchNextPage()} /> : null}
          {query.hasNextPage ? (
            <div>
              <Button variant="secondary" onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage} loadingText={es.a11y.loading}>
                {es.common.loadMore}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <BookingDetailDialog
        bookingId={detail?.bookingId ?? null}
        pnr={detail?.pnr ?? ''}
        onClose={() => setDetail(null)}
        onCancel={(b) => {
          setDetail(null);
          setCancelTarget(b);
        }}
      />
      <CancelBookingDialog booking={cancelTarget} onOpenChange={(open) => (open ? undefined : setCancelTarget(null))} />
    </div>
  );
}
