import type { CabinClass, CreateDeparture, CreateFare, CreateFlightNumber } from '@/shared/api';
import { addDaysToDate, localToUtcIso, weekdayOf } from '@/shared/lib/dates';
import { valuesToPrices } from '@/shared/lib/farePrices';
import { MAX_DEPARTURES, type WizardState } from './types';

/** Fechas de salida: de la primera a "repetir hasta", solo los días marcados (sin fecha final, una sola). */
export function wizardDates(s: Pick<WizardState, 'startDate' | 'endDate' | 'days'>): string[] {
  if (!s.startDate) return [];
  const last = s.endDate && s.endDate >= s.startDate ? s.endDate : s.startDate;
  const repeating = !!s.endDate;
  const out: string[] = [];
  for (let d = s.startDate; d <= last && out.length <= MAX_DEPARTURES + 1; d = addDaysToDate(d, 1)) {
    if (!repeating || s.days[weekdayOf(d)]) out.push(d);
  }
  return out;
}

export const flightNumberOf = (s: Pick<WizardState, 'flightMode' | 'airline' | 'number' | 'existingFlight'>): string =>
  s.flightMode === 'existing' ? s.existingFlight : `${s.airline}${s.number}`;

export interface PlannedFare {
  cabinClass: CabinClass;
  familyId: string;
  name: string;
  code: string;
  body: Omit<CreateFare, 'departureId'>;
}

export interface PlannedDeparture {
  date: string;
  body: CreateDeparture;
}

export interface Plan {
  flightNumber: string;
  /** Solo si el número de vuelo es nuevo. */
  flightToCreate: CreateFlightNumber | null;
  departures: PlannedDeparture[];
  fares: PlannedFare[];
  cabins: { cabinClass: CabinClass; totalSeats: number }[];
}

/**
 * Plan de creación: qué se manda a la API y en qué orden. Las horas se escriben en la hora local del
 * aeropuerto (la salida en la zona del origen; la llegada, en la del destino) y se mandan en UTC.
 */
export function buildPlan(s: WizardState, zoneOf: (airport: string) => string): Plan {
  const flightNumber = flightNumberOf(s);
  const originZone = zoneOf(s.origin);
  const destinationZone = zoneOf(s.destination);

  const cabins = Object.entries(s.cabins)
    .filter(([, c]) => c?.on)
    .map(([cabinClass, c]) => ({ cabinClass: cabinClass as CabinClass, totalSeats: Number(c!.seats) }));

  const fares: PlannedFare[] = [];
  for (const [familyId, f] of Object.entries(s.families)) {
    const meta = s.familyMeta[familyId];
    if (!f.on || !meta || !cabins.some((c) => c.cabinClass === meta.cabinClass)) continue;
    const body: Omit<CreateFare, 'departureId'> = {
      fareFamilyId: familyId,
      currency: s.currency.toUpperCase(),
      extraBagPrice: f.extraBag,
      prices: valuesToPrices(f),
      ...(f.changeFee ? { changeFee: f.changeFee } : {}),
    };
    fares.push({ cabinClass: meta.cabinClass, familyId, name: meta.name, code: meta.code, body });
  }

  const departures = wizardDates(s).map((date) => {
    const body: CreateDeparture = {
      flightNumber,
      seatMapId: s.seatMap?.id ?? '',
      scheduledDeparture: localToUtcIso({ date, time: s.depTime }, originZone),
      scheduledArrival: localToUtcIso({ date, time: s.arrTime }, destinationZone, Number(s.arrPlus)),
      cabins,
      ...(s.depTerminal ? { departureTerminal: s.depTerminal } : {}),
      ...(s.arrTerminal ? { arrivalTerminal: s.arrTerminal } : {}),
    };
    return { date, body };
  });

  const flightToCreate: CreateFlightNumber | null =
    s.flightMode === 'new'
      ? { marketingCarrier: s.airline, number: s.number, origin: s.origin, destination: s.destination }
      : null;

  return { flightNumber, flightToCreate, departures, fares, cabins };
}
