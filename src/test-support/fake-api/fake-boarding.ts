/**
 * Puerta de embarque de la API de prueba: reproduce la forma y las reglas de
 * POST /admin/departures/{id}/boarding/scan y GET .../boarding/manifest (400, 422, 404 y 409 con su `code`).
 * Los pasajeros salen de las reservas de la propia API de prueba (mismos pnr y passengerId). El check-in lo hace el
 * dueño de la reserva en el backend real; aquí `controls.checkIn` lo simula. No hace ninguna llamada de red.
 */
import type { BoardingApi } from '@/shared/api/AdminApi';
import type { BoardedPassenger, BoardingManifest, BookingDetail, ManifestSeat } from '@/shared/api/contract';
import { ApiError } from '@/shared/api/errors';
import type { FakeState } from './seed';

type Code = NonNullable<ApiError['code']>;
const fail = (status: number, code?: Code) => new ApiError({ status, code, detail: `fake boarding ${status} ${code ?? ''}`.trim() });

/** Firma de prueba (no es la del backend): 12 hex derivados del texto firmado. */
function sign(payload: string): string {
  let h = 0x811c9dc5;
  let g = 0x1b873593;
  for (let i = 0; i < payload.length; i++) {
    h = Math.imul(h ^ payload.charCodeAt(i), 0x01000193) >>> 0;
    g = Math.imul(g + payload.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return (h.toString(16).padStart(8, '0') + g.toString(16).padStart(8, '0')).slice(0, 12);
}

interface PassState {
  checkedIn: boolean;
  group: string | null;
  position: string | null;
  boardedAt: string | null;
  infants: BoardedPassenger[];
}

export interface FakeBoardingControls {
  /** El texto del código de barras que imprimiría el backend para ese pasajero en esa salida (firma válida). */
  passFor(pnr: string, passengerId?: string): string;
  /** Simula el check-in (lo hace el dueño de la reserva en el backend real). */
  checkIn(pnr: string, passengerId?: string, group?: string): void;
  /** Un infante en brazos del pasajero: cuenta en el manifiesto y sale en la respuesta del escaneo. */
  attachInfant(pnr: string, passengerId: string, infant: BoardedPassenger): void;
}

export function createFakeBoarding(deps: {
  now: () => Date;
  wait: () => Promise<void>;
  state: FakeState;
  bookings: () => BookingDetail[];
}): { api: BoardingApi; controls: FakeBoardingControls } {
  const { now, wait, state } = deps;
  const passes = new Map<string, PassState>();
  let positionSeq = 0;
  const key = (pnr: string, passengerId: string) => `${pnr}|${passengerId}`;
  const stateOf = (pnr: string, passengerId: string): PassState => {
    const k = key(pnr, passengerId);
    let s = passes.get(k);
    if (!s) {
      s = { checkedIn: false, group: null, position: null, boardedAt: null, infants: [] };
      passes.set(k, s);
    }
    return s;
  };

  const departure = (id: string) => {
    const d = state.departures.find((x) => x.id === id);
    if (!d) throw fail(404);
    return d;
  };
  const bookingOf = (pnr: string) => deps.bookings().find((b) => b.pnr === pnr);

  /** Pasajeros con asiento en la salida, de las reservas que no están canceladas. */
  const seatsOf = (departureId: string) =>
    deps
      .bookings()
      .filter((b) => b.status !== 'CANCELLED')
      .flatMap((b) =>
        b.passengers.flatMap((p) => (p.assignedSeats ?? []).filter((s) => s.segmentId === departureId).map((s) => ({ booking: b, passenger: p, seat: s.seatNumber }))),
      );

  const cabinOf = (departureId: string, seat: string): ManifestSeat['cabinClass'] => {
    const map = state.seatMaps.find((m) => m.id === departure(departureId).seatMapId);
    const row = map?.rows.find((r) => r.seats.some((x) => `${r.number}${x.letter}` === seat));
    return row?.cabinClass ?? 'ECONOMY';
  };

  const statusOf = (b: BookingDetail, passengerId: string, s: PassState): ManifestSeat['status'] => {
    if (s.boardedAt) return 'BOARDED';
    if (s.checkedIn) return 'CHECKED_IN';
    return b.tickets.some((t) => t.passengerId === passengerId && t.status === 'ISSUED') ? 'TICKETED' : 'BOOKED';
  };

  const seatOrder = (a: string, b: string) => {
    const pa = /^(\d+)([A-Z])$/.exec(a);
    const pb = /^(\d+)([A-Z])$/.exec(b);
    return pa && pb ? Number(pa[1]) - Number(pb[1]) || pa[2]!.localeCompare(pb[2]!) : a.localeCompare(b);
  };

  const barcode = (pnr: string, d: { flightNumber: string; departureDate: string; origin: string; destination: string }, seat: string, position: string) => {
    const payload = `BP1|${pnr}|0451331201527|${d.flightNumber}|${d.departureDate.replaceAll('-', '')}|${d.origin}${d.destination}|${seat}|${position}`;
    return `${payload}|${sign(payload)}`;
  };

  const controls: FakeBoardingControls = {
    passFor(pnr, passengerId = 'ADU1') {
      const b = bookingOf(pnr);
      const p = b?.passengers.find((x) => x.passengerId === passengerId);
      const seg = b?.itineraries[0]?.segments[0];
      const seat = p?.assignedSeats?.[0]?.seatNumber;
      if (!b || !p || !seg || !seat) throw new Error(`Sin pase para ${pnr}/${passengerId}`);
      return barcode(pnr, departure(seg.segmentId), seat, stateOf(pnr, passengerId).position ?? '001');
    },
    checkIn(pnr, passengerId = 'ADU1', group = '3') {
      const s = stateOf(pnr, passengerId);
      s.checkedIn = true;
      s.group = group;
      s.position = String(++positionSeq).padStart(3, '0');
    },
    attachInfant(pnr, passengerId, infant) {
      stateOf(pnr, passengerId).infants.push(infant);
    },
  };

  const api: BoardingApi = {
    async manifest(departureId) {
      await wait();
      const d = departure(departureId);
      const rows = seatsOf(departureId).map(({ booking, passenger, seat }) => ({ booking, passenger, seat, s: stateOf(booking.pnr, passenger.passengerId) }));
      const seats: ManifestSeat[] = rows
        .sort((a, b) => seatOrder(a.seat, b.seat))
        .map(({ booking, passenger, seat, s }) => ({
          seat,
          cabinClass: cabinOf(departureId, seat),
          pnr: booking.pnr,
          passengerId: passenger.passengerId,
          status: statusOf(booking, passenger.passengerId, s),
          boardingGroup: s.group,
          boardedAt: s.boardedAt,
        }));
      const infants = rows.flatMap((r) => r.s.infants.map(() => r.s));
      const checkedIn = (r: { checkedIn: boolean }) => r.checkedIn;
      const out: BoardingManifest = {
        departureId: d.id,
        flightNumber: d.flightNumber,
        date: d.departureDate,
        origin: d.origin,
        destination: d.destination,
        status: d.status,
        gate: d.departureGate,
        counts: {
          sold: seats.length,
          checkedIn: rows.filter((r) => checkedIn(r.s)).length,
          boarded: rows.filter((r) => r.s.boardedAt).length,
          infants: { sold: infants.length, checkedIn: infants.filter(checkedIn).length, boarded: infants.filter((s) => s.boardedAt).length },
        },
        seats,
      };
      return structuredClone(out);
    },

    async scan(departureId, text) {
      await wait();
      const d = departure(departureId);
      const parts = text.split('|');
      const well = parts[0] === 'BP1' && parts.length === 9 && /^[A-Z0-9]{6}$/.test(parts[1]!) && /^\d{8}$/.test(parts[4]!) && /^\d{1,3}[A-Z]$/.test(parts[6]!);
      if (!well) throw fail(400, 'BOARDING_PASS_MALFORMED');
      if (sign(parts.slice(0, 8).join('|')) !== parts[8]) throw fail(422, 'BOARDING_PASS_SIGNATURE_INVALID');
      if (d.status === 'CANCELLED') throw fail(409, 'FLIGHT_CANCELLED');
      if (d.status === 'DEPARTED' || d.status === 'ARRIVED') throw fail(409, 'FLIGHT_ALREADY_DEPARTED');
      if (parts[3] !== d.flightNumber || parts[4] !== d.departureDate.replaceAll('-', '')) throw fail(409, 'BOARDING_PASS_WRONG_FLIGHT');
      const booking = bookingOf(parts[1]!);
      if (!booking) throw fail(404, 'BOARDING_PASS_NOT_FOUND');
      if (booking.status === 'CANCELLED') throw fail(409, 'BOARDING_PASS_NOT_VALID');
      const hit = seatsOf(departureId).find((x) => x.booking.pnr === booking.pnr && x.seat === parts[6]);
      if (!hit) throw fail(409, 'BOARDING_PASS_NOT_VALID');
      const s = stateOf(booking.pnr, hit.passenger.passengerId);
      if (s.boardedAt) throw fail(409, 'ALREADY_BOARDED');
      if (!s.checkedIn) throw fail(409, 'PASSENGER_NOT_CHECKED_IN');
      s.boardedAt = now().toISOString();
      return {
        result: 'BOARDED',
        departureId: d.id,
        flightNumber: d.flightNumber,
        seat: hit.seat,
        boardingGroup: s.group,
        boardingPosition: s.position,
        boardedAt: s.boardedAt,
        passenger: { passengerId: hit.passenger.passengerId, firstName: hit.passenger.firstName, lastName: hit.passenger.lastName },
        infants: s.infants.map((i) => ({ ...i })),
      };
    },
  };

  return { api, controls };
}
