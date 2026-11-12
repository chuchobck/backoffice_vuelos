import type { BoardingManifest, BookingPassenger, BookingSegment } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { Badge, ZonedTime } from '@/shared/ui';
import { checkInState, type CheckInState } from './checkIn';

const t = es.bookings.checkIn;

interface ManifestQuery {
  isPending: boolean;
  isError: boolean;
  data?: BoardingManifest;
}

const TONES = { boarded: 'success', checkedIn: 'info', notCheckedIn: 'warning', noSeat: 'neutral', unavailable: 'neutral' } as const;
const LABELS = { boarded: t.boarded, checkedIn: t.checkedIn, notCheckedIn: t.notCheckedIn, noSeat: t.noSeat, unavailable: t.unavailable } as const;

function StateBadge({ state, flight, origin, withFlight }: { state: Exclude<CheckInState, { kind: 'loading' }>; flight: string; origin: string; withFlight: boolean }) {
  const label = LABELS[state.kind];
  const time = state.kind === 'boarded' && state.at ? <> · <ZonedTime iso={state.at} airport={origin} timeOnly /></> : null;
  return (
    <Badge tone={TONES[state.kind]}>
      <span>
        {withFlight ? `${fmt(t.segment, { flight, status: label })}` : label}
        {time}
      </span>
    </Badge>
  );
}

interface Props {
  passenger: BookingPassenger;
  pnr: string;
  segments: BookingSegment[];
  /** Consulta del manifiesto de cada salida, por `segmentId`. Cada una falla o carga por su cuenta. */
  manifests: Map<string, ManifestQuery>;
}

/** Estado de check-in de un pasajero: un valor por segmento ("LA1402: Check-in hecho"), siempre con icono y texto. */
export function PassengerCheckIn({ passenger, pnr, segments, manifests }: Props) {
  const several = segments.length > 1;
  return (
    <ul className="flex flex-col items-start gap-1">
      {segments.map((seg) => {
        const state = checkInState({
          hasSeat: (passenger.assignedSeats ?? []).some((s) => s.segmentId === seg.segmentId),
          manifest: manifests.get(seg.segmentId),
          pnr,
          passengerId: passenger.passengerId,
        });
        return (
          <li key={seg.segmentId}>
            {state.kind === 'loading' ? (
              <span className="text-muted">{several ? fmt(t.segment, { flight: seg.flightNumber, status: t.loading }) : t.loading}</span>
            ) : (
              <StateBadge state={state} flight={seg.flightNumber} origin={seg.departure.iataCode} withFlight={several} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
