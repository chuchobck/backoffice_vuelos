import { useBooking, type BookingDetail } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { ECUADOR_ZONE, formatLocal } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogTitle, ErrorState, LoadingState, ZonedTime } from '@/shared/ui';
import { canCancel, STATUS_TONE, statusLabel, ticketStatusLabel } from './labels';

const t = es.bookings;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="text-lg font-bold">{title}</h3>
      {children}
    </section>
  );
}

function Detail({ booking }: { booking: BookingDetail }) {
  const created = formatLocal(booking.createdAt, ECUADOR_ZONE);
  return (
    <div className="flex flex-col gap-6">
      <Section id="bk-summary" title={t.sections.summary}>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          <dt className="font-bold">{t.labels.status}</dt>
          <dd><Badge tone={STATUS_TONE[booking.status]}>{statusLabel(booking.status)}</Badge></dd>
          <dt className="font-bold">{t.labels.owner}</dt>
          <dd className="break-all">{booking.owner.email ?? t.noOwner}</dd>
          <dt className="font-bold">{t.labels.total}</dt>
          <dd>{formatMoney(booking.grandTotal.total, booking.grandTotal.currency)}</dd>
          <dt className="font-bold">{t.labels.created}</dt>
          <dd>{created}</dd>
          <dt className="font-bold">{t.labels.bookingId}</dt>
          <dd className="font-mono text-xs break-all">{booking.bookingId}</dd>
        </dl>
      </Section>

      <Section id="bk-itineraries" title={t.sections.itineraries}>
        <ul className="flex flex-col gap-3">
          {booking.itineraries.map((it) => (
            <li key={it.itineraryId} className="flex flex-col gap-2">
              {it.segments.map((seg) => (
                <div key={seg.segmentId} className="rounded border border-border p-3">
                  <p className="font-bold">{fmt(t.segment, { flight: seg.flightNumber, origin: seg.departure.iataCode, destination: seg.arrival.iataCode })}</p>
                  <p className="text-sm text-muted">
                    {t.departs} <ZonedTime iso={seg.departure.at} airport={seg.departure.iataCode} />
                    {' · '}
                    {t.arrives} <ZonedTime iso={seg.arrival.at} airport={seg.arrival.iataCode} /> {t.localNote}
                  </p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="bk-passengers" title={t.sections.passengers}>
        <div className="relative overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
            <caption className="sr-only">{t.sections.passengers}</caption>
            <thead>
              <tr className="bg-primary-tint">
                <th scope="col" className="px-3 py-2">{t.passengerCols.name}</th>
                <th scope="col" className="px-3 py-2">{t.passengerCols.type}</th>
                <th scope="col" className="px-3 py-2">{t.passengerCols.document}</th>
                <th scope="col" className="px-3 py-2">{t.passengerCols.seats}</th>
                <th scope="col" className="px-3 py-2">{t.passengerCols.bags}</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p) => (
                <tr key={p.passengerId} className="border-t border-border align-top">
                  <th scope="row" className="px-3 py-2 font-bold">{p.firstName} {p.lastName}</th>
                  <td className="px-3 py-2">{es.enums.passenger[p.passengerType]}</td>
                  <td className="px-3 py-2 font-mono">{p.documentNumber}</td>
                  <td className="px-3 py-2">{p.assignedSeats && p.assignedSeats.length > 0 ? p.assignedSeats.map((s) => s.seatNumber).join(', ') : t.noSeats}</td>
                  <td className="px-3 py-2">{(p.extraBaggage ?? []).reduce((n, b) => n + b.quantity, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="bk-tickets" title={t.sections.tickets}>
        {booking.tickets.length === 0 ? (
          <p className="text-muted">{t.noTickets}</p>
        ) : (
          <div className="relative overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
              <caption className="sr-only">{t.sections.tickets}</caption>
              <thead>
                <tr className="bg-primary-tint">
                  <th scope="col" className="px-3 py-2">{t.ticketCols.number}</th>
                  <th scope="col" className="px-3 py-2">{t.ticketCols.passenger}</th>
                  <th scope="col" className="px-3 py-2">{t.ticketCols.status}</th>
                  <th scope="col" className="px-3 py-2">{t.ticketCols.issued}</th>
                </tr>
              </thead>
              <tbody>
                {booking.tickets.map((tk) => (
                  <tr key={tk.ticketId} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 font-mono">{tk.eTicketNumber ?? es.common.dash}</th>
                    <td className="px-3 py-2">{tk.passengerId}</td>
                    <td className="px-3 py-2">{ticketStatusLabel(tk.status)}</td>
                    <td className="px-3 py-2">{tk.issuedAt ? formatLocal(tk.issuedAt, ECUADOR_ZONE) : es.common.dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="bk-history" title={t.sections.history}>
        <ol className="flex flex-col gap-1 text-sm">
          {booking.changes.map((c, i) => (
            <li key={`${c.changedAt}-${i}`}>
              <time dateTime={c.changedAt} className="font-bold">{formatLocal(c.changedAt, ECUADOR_ZONE)}</time>: {c.description}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

interface Props {
  bookingId: string | null;
  pnr: string;
  onClose: () => void;
  /** Pide cancelar esta reserva (el padre cierra este diálogo y abre la confirmación). */
  onCancel: (booking: { bookingId: string; pnr: string }) => void;
}

/** Detalle de cualquier reserva: resumen, itinerarios, pasajeros, boletos e historial. */
export function BookingDetailDialog({ bookingId, pnr, onClose, onCancel }: Props) {
  const query = useBooking(bookingId ?? undefined);
  const booking = query.data;
  return (
    <Dialog open={bookingId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent aria-describedby={undefined} className="max-w-3xl">
        <DialogTitle>{fmt(t.detailTitle, { pnr })}</DialogTitle>
        <DialogDescription className="sr-only">{fmt(t.detailTitle, { pnr })}</DialogDescription>
        {query.isLoading ? <LoadingState label={t.detailLoading} skeletons={3} /> : null}
        {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h3" /> : null}
        {booking ? <Detail booking={booking} /> : null}
        {booking && canCancel(booking.status) ? (
          <div className="flex justify-end">
            <Button variant="danger-outline" onClick={() => onCancel({ bookingId: booking.bookingId, pnr: booking.pnr })}>{t.cancel}</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
