/**
 * Implementación en memoria de `AdminApi` para pruebas. Reproduce la forma de las respuestas de
 * /flights/v1/admin y sus reglas principales (paginación por cursor, baja lógica, 409 por uso, 422 por
 * referencias, 400 por cuerpo inválido). No hace ninguna llamada de red.
 */
import type {
  AdminApi, AuthApi, ListQuery, Page, Resource,
} from '@/shared/api/AdminApi';
import type {
  AircraftModel, Airline, Airport, City, Country, CreateAircraftModel, CreateAirline, CreateCity, CreateCountry, CreateDeparture, CreateFare,
  CreateFareFamily, CreateFlightNumber, CreateSeatMap, Departure, Fare, FareFamily, FlightNumber, SeatMap, SeatMapSummary, UpdateAircraftModel,
  UpdateAirline, UpdateCity, UpdateCountry, UpdateDeparture, UpdateFare, UpdateFareFamily, UpdateFlightNumber, UpdateSeatMap,
} from '@/shared/api/contract';
import { ApiError } from '@/shared/api/errors';
import { nextUuid } from './ids';
import { buildSeed, summarizeCabins, type AirportRow, type FakeState } from './seed';

export interface FakeOptions {
  now?: () => Date;
  /** Espera simulada por llamada, en ms (0 en las pruebas). */
  latencyMs?: number;
}

/** Cuentas de prueba (no son credenciales reales): una con permiso de administración y una sin él. */
export const FAKE_ACCOUNTS = {
  admin: { email: 'admin@quinde.test', password: 'prueba-admin-123', scopes: ['flights:admin'] },
  customer: { email: 'cliente@quinde.test', password: 'prueba-cliente-123', scopes: [] as string[] },
} as const;

function problem(status: number, detail: string, params: { name: string; reason: string }[] = []): ApiError {
  return new ApiError({
    status,
    code: 'VALIDATION_FAILED',
    detail,
    fieldErrors: params.map((p) => ({ field: p.name, message: p.reason })),
  });
}
const badBody = (field: string, detail: string) => problem(400, detail, [{ name: field, reason: detail }]);
const badRef = (field: string, detail: string) => problem(422, detail, [{ name: field, reason: detail }]);

const toCursor = (key: string) => btoa(unescape(encodeURIComponent(key))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function fromCursor(cursor: string): string | undefined {
  try {
    return decodeURIComponent(escape(atob(cursor.replace(/-/g, '+').replace(/_/g, '/'))));
  } catch {
    return undefined;
  }
}

interface Active {
  active: boolean;
}

interface Spec<Row extends Active, Out, C, U, D = Out> {
  rows: () => Row[];
  key: (r: Row) => string;
  sort?: (a: Row, b: Row) => number;
  out: (r: Row) => Out;
  detail?: (r: Row) => D;
  matches?: (r: Row, f: Record<string, string>) => boolean;
  create: (body: C) => Row;
  patch: (row: Row, body: U) => void;
  /** Texto en inglés de lo que impide la baja (como el backend), o undefined si se puede. */
  inUse?: (row: Row) => string | undefined;
  onDeactivate?: (row: Row) => void;
  /** Por qué no se puede reactivar (422). */
  blocksReactivate?: (row: Row) => [string, string] | undefined;
  onReactivate?: (row: Row) => void;
  noun: string;
}

export function createFakeAdminApi(options: FakeOptions = {}): AdminApi {
  const now = options.now ?? (() => new Date());
  const latency = options.latencyMs ?? 80;
  const wait = () => (latency > 0 ? new Promise<void>((r) => setTimeout(r, latency)) : Promise.resolve());
  const s: FakeState = buildSeed(now());
  let account: { email: string; scopes: readonly string[] } = FAKE_ACCOUNTS.admin;
  // Tokens únicos como los reales: el SessionManager recuerda los ya rotados y no debe confundirlos tras recargar.
  const random = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const issueTokens = () => ({ accessToken: `fake.access.${random()}`, refreshToken: `fake-refresh-${random()}`, expiresIn: 900, scope: account.scopes.join(' ') });

  const asAirport = (r: AirportRow): Airport => {
    const c = s.cities.find((x) => x.id === r.cityId);
    return { code: r.code, name: r.name, cityId: r.cityId, cityName: c?.name ?? '—', country: c?.country ?? '—', active: r.active };
  };
  const activeOf = <T extends Active>(list: T[], pred: (x: T) => boolean) => list.find((x) => x.active && pred(x));
  const flightOf = (n: string): FlightNumber | undefined => s.flightNumbers.find((f) => f.flightNumber === n);
  const summary = (m: SeatMap): SeatMapSummary => ({ id: m.id, airline: m.airline, aircraftModel: m.aircraftModel, name: m.name, cabins: m.cabins, active: m.active });

  function build<Row extends Active, Out, C, U, D = Out>(spec: Spec<Row, Out, C, U, D>): Resource<Out, C, U, D> {
    const find = (id: string) => spec.rows().find((r) => spec.key(r) === id);
    const need = (id: string) => {
      const row = find(id);
      if (!row) throw problem(404, `${spec.noun} ${id} not found`);
      return row;
    };
    const outD = (r: Row): D => (spec.detail ? spec.detail(r) : (spec.out(r) as unknown as D));
    return {
      async list(q: ListQuery = {}): Promise<Page<Out>> {
        await wait();
        const limit = Math.min(Math.max(q.limit ?? 10, 1), 50);
        const filters = Object.fromEntries(Object.entries(q.filters ?? {}).filter(([, v]) => v)) as Record<string, string>;
        const sorted = spec.rows()
          .filter((r) => (q.includeInactive || r.active) && (spec.matches ? spec.matches(r, filters) : true))
          .sort(spec.sort ?? ((a, b) => spec.key(a).localeCompare(spec.key(b))));
        let start = 0;
        if (q.cursor) {
          const key = fromCursor(q.cursor);
          const i = key === undefined ? -1 : sorted.findIndex((r) => spec.key(r) === key);
          if (i < 0) throw badBody('cursor', 'cursor is not valid');
          start = i + 1;
        }
        const page = sorted.slice(start, start + limit);
        const more = start + limit < sorted.length;
        return more ? { items: page.map(spec.out), nextCursor: toCursor(spec.key(page[page.length - 1]!)) } : { items: page.map(spec.out) };
      },
      async get(id) {
        await wait();
        return outD(need(id));
      },
      async create(body) {
        await wait();
        const row = spec.create(body);
        if (spec.rows().some((r) => spec.key(r) === spec.key(row))) throw problem(409, `${spec.noun} already exists`);
        spec.rows().push(row);
        return outD(row);
      },
      async update(id, body) {
        await wait();
        const row = need(id);
        spec.patch(row, body);
        return outD(row);
      },
      async deactivate(id) {
        await wait();
        const row = need(id);
        if (!row.active) return;
        const use = spec.inUse?.(row);
        if (use) throw problem(409, `${spec.noun} ${id} is still used by ${use}`);
        spec.onDeactivate?.(row);
        row.active = false;
      },
      async reactivate(id) {
        await wait();
        const row = need(id);
        if (!row.active) {
          const block = spec.blocksReactivate?.(row);
          if (block) throw badRef(block[0], block[1]);
          spec.onReactivate?.(row);
          row.active = true;
        }
        return outD(row);
      },
    };
  }

  const cabinMap = (m: SeatMap) => new Map(m.cabins.map((c) => [c.cabinClass, c.seats]));
  const sameKeys = (body: object, allowed: string[]) => {
    for (const k of Object.keys(body)) if (!allowed.includes(k)) throw badBody(k, `property ${k} should not exist`);
  };
  const assign = <T extends object>(row: T, body: Partial<T>) => Object.assign(row, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));

  const countries = build<Country, Country, CreateCountry, UpdateCountry>({
    noun: 'Country', rows: () => s.countries, key: (r) => r.code, out: (r) => ({ ...r }),
    create: (b) => ({ code: b.code, iso3: b.iso3, name: b.name, active: true }),
    patch: (r, b) => assign(r, b),
    inUse: (r) => (s.cities.some((c) => c.active && c.country === r.code) ? 'active cities' : undefined),
  });
  const cities = build<City, City, CreateCity, UpdateCity>({
    noun: 'City', rows: () => s.cities, key: (r) => r.id, out: (r) => ({ ...r }),
    matches: (r, f) => !f.country || r.country === f.country,
    create: (b) => {
      if (!activeOf(s.countries, (c) => c.code === b.country)) throw badRef('country', `Country ${b.country} does not exist or is inactive`);
      return { id: nextUuid(), country: b.country, name: b.name, timeZone: b.timeZone ?? 'America/Guayaquil', active: true };
    },
    patch: (r, b) => assign(r, b),
    inUse: (r) => (s.airports.some((a) => a.active && a.cityId === r.id) ? 'active airports' : undefined),
    blocksReactivate: (r) => (activeOf(s.countries, (c) => c.code === r.country) ? undefined : ['country', `Country ${r.country} is inactive; reactivate it first`]),
  });
  const airports = build<AirportRow, Airport, { code: string; name: string; cityId: string }, { name?: string; cityId?: string }>({
    noun: 'Airport', rows: () => s.airports, key: (r) => r.code, out: asAirport,
    matches: (r, f) => {
      const c = s.cities.find((x) => x.id === r.cityId);
      return (!f.cityId || r.cityId === f.cityId) && (!f.country || c?.country === f.country);
    },
    create: (b) => {
      if (!activeOf(s.cities, (c) => c.id === b.cityId)) throw badRef('cityId', `City ${b.cityId} does not exist or is inactive`);
      return { code: b.code, name: b.name, cityId: b.cityId, active: true };
    },
    patch: (r, b) => {
      if (b.cityId && !activeOf(s.cities, (c) => c.id === b.cityId)) throw badRef('cityId', `City ${b.cityId} does not exist or is inactive`);
      assign(r, b);
    },
    inUse: (r) => (s.flightNumbers.some((f) => f.active && (f.origin === r.code || f.destination === r.code)) ? 'active flights' : undefined),
    blocksReactivate: (r) => (activeOf(s.cities, (c) => c.id === r.cityId) ? undefined : ['cityId', 'City is inactive; reactivate it first']),
  });
  const airlines = build<Airline, Airline, CreateAirline, UpdateAirline>({
    noun: 'Airline', rows: () => s.airlines, key: (r) => r.code, out: (r) => ({ ...r }),
    create: (b) => ({ code: b.code, name: b.name, ticketPrefix: b.ticketPrefix ?? null, active: true }),
    patch: (r, b) => {
      if (b.name !== undefined) r.name = b.name;
      if (b.ticketPrefix !== undefined) r.ticketPrefix = b.ticketPrefix;
    },
    inUse: (r) => (s.flightNumbers.some((f) => f.active && f.marketingCarrier === r.code) ? 'active flights' : undefined),
  });
  const aircraftModels = build<AircraftModel, AircraftModel, CreateAircraftModel, UpdateAircraftModel>({
    noun: 'Aircraft model', rows: () => s.aircraftModels, key: (r) => r.code, out: (r) => ({ ...r }),
    create: (b) => ({ code: b.code, name: b.name, active: true }),
    patch: (r, b) => assign(r, b),
    inUse: (r) => (s.seatMaps.some((m) => m.active && m.aircraftModel === r.code) ? 'active seat maps' : undefined),
  });
  const fareFamilies = build<FareFamily, FareFamily, CreateFareFamily, UpdateFareFamily>({
    noun: 'Fare family', rows: () => s.fareFamilies, key: (r) => r.id, out: (r) => ({ ...r }),
    sort: (a, b) => a.airline.localeCompare(b.airline) || a.cabinClass.localeCompare(b.cabinClass) || a.code.localeCompare(b.code),
    matches: (r, f) => (!f.airline || r.airline === f.airline) && (!f.cabinClass || r.cabinClass === f.cabinClass),
    create: (b) => {
      if (!activeOf(s.airlines, (a) => a.code === b.airline)) throw badRef('airline', `Airline ${b.airline} does not exist or is inactive`);
      if (s.fareFamilies.some((f) => f.airline === b.airline && f.code === b.code)) throw problem(409, 'Fare family already exists');
      const pen = Number(b.cancellationPenaltyPercent ?? '0');
      return {
        id: nextUuid(), airline: b.airline, cabinClass: b.cabinClass, code: b.code, name: b.name ?? b.code, changeable: b.changeable ?? false,
        cancellationPenaltyPercent: pen.toFixed(2), refundable: pen < 100, personalItemIncluded: b.personalItemIncluded ?? true,
        carryOnBagsIncluded: b.carryOnBagsIncluded ?? 1, checkedBagsIncluded: b.checkedBagsIncluded ?? 0, maxExtraBags: b.maxExtraBags ?? 2, active: true,
      };
    },
    patch: (r, b) => {
      const { cancellationPenaltyPercent, ...rest } = b;
      assign(r, rest);
      if (cancellationPenaltyPercent !== undefined) {
        r.cancellationPenaltyPercent = Number(cancellationPenaltyPercent).toFixed(2);
        r.refundable = Number(cancellationPenaltyPercent) < 100;
      }
    },
    inUse: (r) => (s.fares.some((f) => f.active && f.fareFamilyId === r.id) ? 'active fares' : undefined),
  });
  const seatMaps = build<SeatMap, SeatMapSummary, CreateSeatMap, UpdateSeatMap, SeatMap>({
    noun: 'Seat map', rows: () => s.seatMaps, key: (r) => r.id, out: summary, detail: (r) => ({ ...r, rows: r.rows.map((x) => ({ ...x, seats: x.seats.map((y) => ({ ...y })) })) }),
    sort: (a, b) => a.airline.localeCompare(b.airline) || a.aircraftModel.localeCompare(b.aircraftModel) || a.name.localeCompare(b.name),
    matches: (r, f) => (!f.airline || r.airline === f.airline) && (!f.aircraftModel || r.aircraftModel === f.aircraftModel),
    create: (b) => {
      const numbers = new Set<number>();
      b.rows.forEach((row, i) => {
        if (numbers.has(row.number)) throw badBody(`rows[${i}].number`, `row ${row.number} is repeated`);
        numbers.add(row.number);
        const letters = new Set<string>();
        row.seats.forEach((seat, j) => {
          if (letters.has(seat.letter)) throw badBody(`rows[${i}].seats[${j}].letter`, `seat ${row.number}${seat.letter} is repeated`);
          letters.add(seat.letter);
        });
      });
      if (!activeOf(s.airlines, (a) => a.code === b.airline)) throw badRef('airline', `Airline ${b.airline} does not exist or is inactive`);
      if (!activeOf(s.aircraftModels, (m) => m.code === b.aircraftModel)) throw badRef('aircraftModel', `Aircraft model ${b.aircraftModel} does not exist or is inactive`);
      if (s.seatMaps.some((m) => m.airline === b.airline && m.aircraftModel === b.aircraftModel && m.name === b.name)) throw problem(409, 'Seat map already exists');
      const rows = [...b.rows].sort((x, y) => x.number - y.number).map((r) => ({ ...r, extraLegroom: r.extraLegroom ?? false, emergencyExit: r.emergencyExit ?? false }));
      return { id: nextUuid(), airline: b.airline, aircraftModel: b.aircraftModel, name: b.name, cabins: summarizeCabins(rows), active: true, rows };
    },
    patch: (r, b) => assign(r, b),
    inUse: (r) => (s.departures.some((d) => d.active && d.seatMapId === r.id) ? 'upcoming departures' : undefined),
    blocksReactivate: (r) => (activeOf(s.airlines, (a) => a.code === r.airline) ? undefined : ['airline', `Airline ${r.airline} is inactive; reactivate it first`]),
  });
  const flightNumbers = build<FlightNumber, FlightNumber, CreateFlightNumber, UpdateFlightNumber>({
    noun: 'Flight', rows: () => s.flightNumbers, key: (r) => r.flightNumber, out: (r) => ({ ...r }),
    matches: (r, f) => (!f.airline || r.marketingCarrier === f.airline) && (!f.origin || r.origin === f.origin) && (!f.destination || r.destination === f.destination),
    create: (b) => {
      if (b.origin === b.destination) throw badBody('destination', 'destination must be different from origin');
      const checks: [string, boolean][] = [
        ['marketingCarrier', !!activeOf(s.airlines, (a) => a.code === b.marketingCarrier)],
        ['origin', !!activeOf(s.airports, (a) => a.code === b.origin)],
        ['destination', !!activeOf(s.airports, (a) => a.code === b.destination)],
      ];
      for (const [field, ok] of checks) if (!ok) throw badRef(field, `${field} does not exist or is inactive`);
      if (b.operatingCarrier && !activeOf(s.airlines, (a) => a.code === b.operatingCarrier)) throw badRef('operatingCarrier', 'Airline does not exist or is inactive');
      return { flightNumber: b.marketingCarrier + b.number, marketingCarrier: b.marketingCarrier, operatingCarrier: b.operatingCarrier ?? b.marketingCarrier, origin: b.origin, destination: b.destination, active: true };
    },
    patch: (r, b) => {
      sameKeys(b, ['operatingCarrier']);
      if (b.operatingCarrier) {
        if (!activeOf(s.airlines, (a) => a.code === b.operatingCarrier)) throw badRef('operatingCarrier', 'Airline does not exist or is inactive');
        r.operatingCarrier = b.operatingCarrier;
      }
    },
    inUse: (r) => (s.departures.some((d) => d.active && d.flightNumber === r.flightNumber) ? 'active departures' : undefined),
  });
  const departures = build<Departure, Departure, CreateDeparture, UpdateDeparture>({
    noun: 'Departure', rows: () => s.departures, key: (r) => r.id, out: (r) => ({ ...r, cabins: r.cabins.map((c) => ({ ...c })) }),
    sort: (a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture) || a.id.localeCompare(b.id),
    matches: (r, f) => (!f.flightNumber || r.flightNumber === f.flightNumber) && (!f.dateFrom || r.departureDate >= f.dateFrom) && (!f.dateTo || r.departureDate <= f.dateTo) && (!f.status || r.status === f.status),
    create: (b) => {
      const dep = new Date(b.scheduledDeparture);
      const arr = new Date(b.scheduledArrival);
      if (!(arr > dep)) throw badBody('scheduledArrival', 'scheduledArrival must be after scheduledDeparture');
      if (dep <= now()) throw badRef('scheduledDeparture', 'The departure must be in the future');
      const f = activeOf(s.flightNumbers, (x) => x.flightNumber === b.flightNumber);
      if (!f) throw badRef('flightNumber', `Flight ${b.flightNumber} does not exist or is inactive`);
      const sm = activeOf(s.seatMaps, (m) => m.id === b.seatMapId);
      if (!sm) throw badRef('seatMapId', `Seat map ${b.seatMapId} does not exist or is inactive`);
      if (sm.airline !== f.operatingCarrier) throw badRef('seatMapId', 'The seat map belongs to airline ' + sm.airline + ', but flight is operated by another');
      const phys = cabinMap(sm);
      const cabins = b.cabins && b.cabins.length ? b.cabins : sm.cabins.map((c) => ({ cabinClass: c.cabinClass, totalSeats: c.seats }));
      const seen = new Set<string>();
      cabins.forEach((c, i) => {
        if (seen.has(c.cabinClass)) throw badBody(`cabins[${i}].cabinClass`, `${c.cabinClass} is repeated`);
        seen.add(c.cabinClass);
        const seats = phys.get(c.cabinClass);
        if (seats === undefined) throw badRef(`cabins[${i}].cabinClass`, `The seat map has no ${c.cabinClass} cabin`);
        if (c.totalSeats > seats) throw badRef(`cabins[${i}].totalSeats`, `The cabin has ${seats} seats; the quota cannot exceed them`);
      });
      const zoneOffset = s.cities.find((c) => c.id === s.airports.find((a) => a.code === f.origin)?.cityId)?.timeZone === 'Pacific/Galapagos' ? 6 : 5;
      return {
        id: nextUuid(), flightNumber: f.flightNumber, origin: f.origin, destination: f.destination,
        departureDate: new Date(dep.getTime() - zoneOffset * 3600_000).toISOString().slice(0, 10),
        scheduledDeparture: b.scheduledDeparture, scheduledArrival: b.scheduledArrival,
        estimatedDeparture: null, estimatedArrival: null, actualDeparture: null, actualArrival: null,
        departureTerminal: b.departureTerminal ?? null, arrivalTerminal: b.arrivalTerminal ?? null, status: 'SCHEDULED', seatMapId: sm.id, aircraftModel: sm.aircraftModel,
        cabins: cabins.map((c) => ({ cabinClass: c.cabinClass, totalSeats: c.totalSeats, availableSeats: c.totalSeats })), active: true,
      };
    },
    patch: (r, b) => {
      const dep = new Date(b.scheduledDeparture ?? r.scheduledDeparture);
      const arr = new Date(b.scheduledArrival ?? r.scheduledArrival);
      if (!(arr > dep)) throw badBody('scheduledArrival', 'scheduledArrival must be after scheduledDeparture');
      if ((b.status as string | undefined) === 'CANCELLED') throw badBody('status', 'status must be one of: ... (to cancel, use DELETE)');
      assign(r, b as Partial<Departure>);
      if (b.scheduledDeparture) {
        r.departureDate = new Date(dep.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
      }
    },
    onDeactivate: (r) => {
      if (new Date(r.scheduledDeparture) < now()) throw problem(409, `Departure ${r.id} has already departed and cannot be cancelled`);
      r.status = 'CANCELLED';
    },
    blocksReactivate: (r) => (new Date(r.scheduledDeparture) <= now() ? ['id', `Departure ${r.id} was scheduled in the past and cannot be reactivated`] : undefined),
    onReactivate: (r) => {
      r.status = 'SCHEDULED';
    },
  });
  const fares = build<Fare, Fare, CreateFare, UpdateFare>({
    noun: 'Fare', rows: () => s.fares, key: (r) => r.id, out: (r) => ({ ...r, prices: r.prices.map((p) => ({ ...p })) }),
    sort: (a, b) => a.flightNumber.localeCompare(b.flightNumber) || a.departureId.localeCompare(b.departureId) || a.fareBrand.localeCompare(b.fareBrand),
    matches: (r, f) => (!f.departureId || r.departureId === f.departureId) && (!f.fareFamilyId || r.fareFamilyId === f.fareFamilyId),
    create: (b) => {
      if (!(b.prices ?? []).some((p) => p.passengerType === 'ADULT')) throw badBody('prices', 'prices must include the ADULT price');
      const dep = activeOf(s.departures, (d) => d.id === b.departureId);
      if (!dep) throw badRef('departureId', `Departure ${b.departureId} does not exist or is no longer on sale`);
      const fm = activeOf(s.fareFamilies, (f) => f.id === b.fareFamilyId);
      if (!fm) throw badRef('fareFamilyId', `Fare family ${b.fareFamilyId} does not exist or is inactive`);
      const fl = flightOf(dep.flightNumber);
      if (fl && fm.airline !== fl.marketingCarrier) throw badRef('fareFamilyId', `The fare family belongs to airline ${fm.airline}, but flight is marketed by ${fl.marketingCarrier}`);
      if (!dep.cabins.some((c) => c.cabinClass === fm.cabinClass)) throw badRef('fareFamilyId', `The departure has no ${fm.cabinClass} cabin`);
      if (s.fares.some((f) => f.departureId === dep.id && f.fareFamilyId === fm.id)) throw problem(409, 'Fare already exists for that departure and family');
      return {
        id: nextUuid(), departureId: dep.id, flightNumber: dep.flightNumber, fareFamilyId: fm.id, fareBrand: fm.code, cabinClass: fm.cabinClass, currency: b.currency,
        extraBagPrice: b.extraBagPrice, changeFee: b.changeFee ?? '0.00',
        prices: b.prices.map((p) => ({ ...p, total: (Number(p.baseFare) + Number(p.taxes)).toFixed(2) })), active: true,
      };
    },
    patch: (r, b) => {
      if (b.extraBagPrice !== undefined) r.extraBagPrice = b.extraBagPrice;
      if (b.changeFee !== undefined) r.changeFee = b.changeFee;
      if (b.prices) {
        if (!b.prices.some((p) => p.passengerType === 'ADULT')) throw badBody('prices', 'prices must include the ADULT price');
        r.prices = b.prices.map((p) => ({ ...p, total: (Number(p.baseFare) + Number(p.taxes)).toFixed(2) }));
      }
    },
    blocksReactivate: (r) => (activeOf(s.departures, (d) => d.id === r.departureId) ? undefined : ['departureId', 'Departure is no longer on sale']),
  });

  const auth: AuthApi = {
    async login(c) {
      await wait();
      const found = Object.values(FAKE_ACCOUNTS).find((a) => a.email === c.email && a.password === c.password);
      if (!found) throw new ApiError({ status: 401 });
      account = found;
      return issueTokens();
    },
    async refresh(rt) {
      await wait();
      if (!rt.startsWith('fake-refresh-')) throw new ApiError({ status: 401, code: 'VALIDATION_FAILED' });
      return issueTokens();
    },
    async logout() {
      await wait();
    },
    async me() {
      await wait();
      return { id: '00000000-0000-4000-8000-00000000ad01', email: account.email, roles: account.scopes.length ? ['administrador'] : ['cliente'], scopes: [...account.scopes], createdAt: now().toISOString() };
    },
  };

  return { auth, countries, cities, airports, airlines, aircraftModels, fareFamilies, seatMaps, flightNumbers, departures, fares };
}
