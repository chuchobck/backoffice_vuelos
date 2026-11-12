import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { MANIFEST_SEAT_STATUSES, type BoardingManifest, type ManifestSeat } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { cabinLabel } from '@/shared/lib/labels';
import { Badge, Button, DataTable, EmptyState, Field, Select, ZonedTime, type Column } from '@/shared/ui';
import { SEAT_STATUS_TONE } from './seatStatus';

const t = es.boarding.manifest;

const STATUS_OPTIONS = MANIFEST_SEAT_STATUSES.map((s) => ({ value: s, label: es.boarding.seatStatus[s] }));

/** Tabla del manifiesto (sin nombres ni documentos) con filtro por estado y el atajo "Ver reserva". */
export function ManifestTable({ manifest }: { manifest: BoardingManifest }) {
  const [status, setStatus] = useState('');
  const rows = useMemo(() => (status ? manifest.seats.filter((s) => s.status === status) : manifest.seats), [manifest.seats, status]);

  const columns: Column<ManifestSeat>[] = [
    { id: 'seat', header: t.cols.seat, cell: (s) => <span className="font-mono font-bold">{s.seat}</span> },
    { id: 'cabin', header: t.cols.cabin, cell: (s) => cabinLabel(s.cabinClass) },
    { id: 'pnr', header: t.cols.pnr, cell: (s) => <span className="font-mono">{s.pnr}</span> },
    { id: 'status', header: t.cols.status, cell: (s) => <Badge tone={SEAT_STATUS_TONE[s.status]}>{es.boarding.seatStatus[s.status]}</Badge> },
    { id: 'group', header: t.cols.group, cell: (s) => s.boardingGroup ?? es.common.dash },
    { id: 'boardedAt', header: t.cols.boardedAt, cell: (s) => (s.boardedAt ? <ZonedTime iso={s.boardedAt} airport={manifest.origin} timeOnly /> : es.common.dash) },
  ];

  return (
    <section aria-labelledby="gate-manifest" className="flex flex-col gap-3">
      <h2 id="gate-manifest" className="text-2xl">{t.title}</h2>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Field label={t.filter} required className="w-full sm:w-72">
          <Select value={status} options={STATUS_OPTIONS} placeholder={t.filterAll} onChange={(e) => setStatus(e.target.value)} />
        </Field>
        <p className="text-sm text-muted">{fmt(t.count, { shown: rows.length, total: manifest.seats.length })}</p>
      </div>
      <p className="text-sm text-muted">{t.refresh}</p>
      {manifest.seats.length === 0 ? (
        <EmptyState title={t.emptyTitle} text={t.noSeats} />
      ) : rows.length === 0 ? (
        <EmptyState title={t.emptyTitle} text={t.emptyText} />
      ) : (
        <DataTable
          caption={fmt(t.caption, { flight: manifest.flightNumber })}
          columns={columns}
          rows={rows}
          getRowId={(s) => `${s.pnr}-${s.passengerId}-${s.seat}`}
          actions={(s) => (
            <Button asChild size="sm" variant="ghost">
              <Link to={routes.bookings(s.pnr)} aria-label={fmt(t.viewBookingAria, { pnr: s.pnr, seat: s.seat })}>
                {t.viewBooking}
              </Link>
            </Button>
          )}
        />
      )}
    </section>
  );
}
