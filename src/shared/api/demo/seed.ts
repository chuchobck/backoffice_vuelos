import type {
  AircraftModel, Airline, CabinClass, City, Country, Departure, Fare, FareFamily, FlightNumber, SeatMap, SeatRow,
} from '../contract';
import { nextUuid } from './ids';

/** Fila interna de un aeropuerto: la ciudad se resuelve al responder (cityName y country). */
export interface AirportRow {
  code: string;
  name: string;
  cityId: string;
  active: boolean;
}

export interface DemoState {
  countries: Country[];
  cities: City[];
  airports: AirportRow[];
  airlines: Airline[];
  aircraftModels: AircraftModel[];
  fareFamilies: FareFamily[];
  seatMaps: SeatMap[];
  flightNumbers: FlightNumber[];
  departures: Departure[];
  fares: Fare[];
}

const money = (n: number) => n.toFixed(2);

/** Diseño de cabinas por equipo, como la semilla del backend (db/semilla_vuelos.sql). */
const DESIGNS: Record<string, { cabin: CabinClass; from: number; to: number; letters: string; window: string; aisle: string; exits: number[] }[]> = {
  '320': [
    { cabin: 'BUSINESS', from: 1, to: 3, letters: 'ACDF', window: 'AF', aisle: 'CD', exits: [] },
    { cabin: 'ECONOMY', from: 10, to: 30, letters: 'ABCDEF', window: 'AF', aisle: 'CD', exits: [12, 13] },
  ],
  '319': [
    { cabin: 'BUSINESS', from: 1, to: 2, letters: 'ACDF', window: 'AF', aisle: 'CD', exits: [] },
    { cabin: 'ECONOMY', from: 7, to: 26, letters: 'ABCDEF', window: 'AF', aisle: 'CD', exits: [12, 13] },
  ],
  AT7: [{ cabin: 'ECONOMY', from: 1, to: 18, letters: 'ACDF', window: 'AF', aisle: 'CD', exits: [9, 10] }],
};

export function buildRows(model: string): SeatRow[] {
  const rows: SeatRow[] = [];
  for (const d of DESIGNS[model] ?? []) {
    for (let n = d.from; n <= d.to; n++) {
      rows.push({
        number: n,
        cabinClass: d.cabin,
        extraLegroom: d.cabin === 'ECONOMY' && n === d.from,
        emergencyExit: d.exits.includes(n),
        seats: [...d.letters].map((letter) => ({
          letter,
          position: d.window.includes(letter) ? 'WINDOW' : d.aisle.includes(letter) ? 'AISLE' : 'MIDDLE',
        })),
      });
    }
  }
  return rows;
}

export function summarizeCabins(rows: SeatRow[]): { cabinClass: CabinClass; seats: number }[] {
  const totals = new Map<CabinClass, number>();
  for (const r of rows) totals.set(r.cabinClass, (totals.get(r.cabinClass) ?? 0) + r.seats.length);
  return [...totals.entries()].map(([cabinClass, seats]) => ({ cabinClass, seats }));
}

/** Instante UTC de una fecha local de Ecuador continental (UTC−5) o de Galápagos (UTC−6). */
function localToUtc(day: string, hhmm: string, offsetHours: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hh! + offsetHours, mm!)).toISOString().replace('.000Z', 'Z');
}

export function buildSeed(now: Date): DemoState {
  const ec: Country = { code: 'EC', iso3: 'ECU', name: 'Ecuador', active: true };
  const city = (name: string, tz = 'America/Guayaquil'): City => ({ id: nextUuid(), country: 'EC', name, timeZone: tz, active: true });
  const cities = [
    city('Quito'), city('Guayaquil'), city('Cuenca'), city('Loja'), city('Manta'), city('Esmeraldas'), city('Nueva Loja'), city('Coca'),
    city('Baltra', 'Pacific/Galapagos'), city('San Cristóbal', 'Pacific/Galapagos'),
  ];
  const cid = (n: string) => cities.find((c) => c.name === n)!.id;
  const airports: AirportRow[] = [
    ['UIO', 'Aeropuerto Internacional Mariscal Sucre', 'Quito'], ['GYE', 'Aeropuerto Internacional José Joaquín de Olmedo', 'Guayaquil'],
    ['CUE', 'Aeropuerto Mariscal Lamar', 'Cuenca'], ['LOH', 'Aeropuerto Camilo Ponce Enríquez', 'Loja'],
    ['MEC', 'Aeropuerto Internacional Eloy Alfaro', 'Manta'], ['ESM', 'Aeropuerto Carlos Concha Torres', 'Esmeraldas'],
    ['LGQ', 'Aeropuerto Lago Agrio', 'Nueva Loja'], ['OCC', 'Aeropuerto Francisco de Orellana', 'Coca'],
    ['GPS', 'Aeropuerto Seymour', 'Baltra'], ['SCY', 'Aeropuerto San Cristóbal', 'San Cristóbal'],
  ].map(([code, name, c]) => ({ code: code!, name: name!, cityId: cid(c!), active: true }));

  const airlines: Airline[] = [
    { code: 'AV', name: 'Avianca', ticketPrefix: '134', active: true },
    { code: 'LA', name: 'LATAM Airlines', ticketPrefix: '045', active: true },
  ];
  const aircraftModels: AircraftModel[] = [
    { code: '320', name: 'Airbus A320', active: true }, { code: '319', name: 'Airbus A319', active: true }, { code: 'AT7', name: 'ATR 72-600', active: true },
  ];

  const family = (airline: string, cabinClass: CabinClass, code: string, name: string, changeable: boolean, pen: number, carry: number, bags: number, extra: number): FareFamily => ({
    id: nextUuid(), airline, cabinClass, code, name, changeable, cancellationPenaltyPercent: money(pen), refundable: pen < 100, personalItemIncluded: true,
    carryOnBagsIncluded: carry, checkedBagsIncluded: bags, maxExtraBags: extra, active: true,
  });
  const fareFamilies: FareFamily[] = ['AV', 'LA'].flatMap((a) => [
    family(a, 'ECONOMY', 'BASIC', 'Basic', false, 100, 0, 0, 2), family(a, 'ECONOMY', 'CLASSIC', 'Classic', true, 35, 1, 1, 2),
    family(a, 'ECONOMY', 'FLEX', 'Flex', true, 10, 1, 2, 3), family(a, 'BUSINESS', 'BUSINESS_FLEX', 'Business Flex', true, 0, 2, 2, 4),
  ]);

  const seatMap = (airline: string, model: string, name: string): SeatMap => {
    const rows = buildRows(model);
    return { id: nextUuid(), airline, aircraftModel: model, name, cabins: summarizeCabins(rows), active: true, rows };
  };
  const seatMaps = [
    seatMap('LA', '320', 'LATAM A320 · Ejecutiva + Económica'), seatMap('LA', '319', 'LATAM A319 · Ejecutiva + Económica'),
    seatMap('AV', '320', 'Avianca A320 · Ejecutiva + Económica'), seatMap('AV', '319', 'Avianca A319 · Ejecutiva + Económica'),
    seatMap('AV', 'AT7', 'Avianca ATR 72-600 · Económica'),
  ];

  const flightRows: [string, string, string, string, string, number, string, number][] = [
    ['LA', '1400', 'UIO', 'GYE', '06:00', 55, '320', 55], ['LA', '1401', 'GYE', 'UIO', '07:30', 55, '320', 55],
    ['AV', '1500', 'UIO', 'GYE', '07:30', 55, '320', 58], ['AV', '1501', 'GYE', 'UIO', '09:00', 55, '320', 58],
    ['LA', '1430', 'UIO', 'CUE', '07:00', 55, '319', 60], ['AV', '1542', 'GYE', 'CUE', '09:30', 35, '319', 40],
    ['AV', '1550', 'UIO', 'LOH', '09:00', 65, 'AT7', 65], ['LA', '2410', 'GYE', 'GPS', '08:00', 115, '320', 190],
    ['LA', '2411', 'GPS', 'GYE', '10:30', 115, '320', 190], ['AV', '2520', 'GYE', 'SCY', '10:00', 110, '319', 200],
  ];
  const flightNumbers: FlightNumber[] = flightRows.map(([al, n, o, d]) => ({
    flightNumber: al + n, marketingCarrier: al, operatingCarrier: al, origin: o, destination: d, active: true,
  }));

  const zoneOffset = (code: string) => (code === 'GPS' || code === 'SCY' ? 6 : 5);
  const departures: Departure[] = [];
  const fares: Fare[] = [];
  const day0 = new Date(now.getTime() - 5 * 3600_000);
  flightRows.forEach(([al, n, o, d, hhmm, dur, model, base]) => {
    const sm = seatMaps.find((m) => m.airline === al && m.aircraftModel === model)!;
    for (let k = 1; k <= 3; k++) {
      const day = new Date(Date.UTC(day0.getUTCFullYear(), day0.getUTCMonth(), day0.getUTCDate() + k)).toISOString().slice(0, 10);
      const dep = localToUtc(day, hhmm!, zoneOffset(o!));
      const arr = new Date(new Date(dep).getTime() + dur! * 60_000).toISOString().replace('.000Z', 'Z');
      const dp: Departure = {
        id: nextUuid(), flightNumber: al! + n!, origin: o!, destination: d!, departureDate: day, scheduledDeparture: dep, scheduledArrival: arr,
        estimatedDeparture: null, estimatedArrival: null, actualDeparture: null, actualArrival: null, departureTerminal: null, arrivalTerminal: null,
        status: 'SCHEDULED', seatMapId: sm.id, aircraftModel: model!,
        cabins: sm.cabins.map((c) => ({ cabinClass: c.cabinClass, totalSeats: c.seats, availableSeats: c.seats })), active: true,
      };
      departures.push(dp);
      if (k > 1) continue; // tarifas solo en la primera salida de cada vuelo para mantener ligera la demo
      for (const [code, factor, cabin] of [['BASIC', 1, 'ECONOMY'], ['CLASSIC', 1.2, 'ECONOMY'], ['FLEX', 1.55, 'ECONOMY'], ['BUSINESS_FLEX', 2.6, 'BUSINESS']] as const) {
        const fm = fareFamilies.find((f) => f.airline === al && f.code === code)!;
        if (!dp.cabins.some((c) => c.cabinClass === cabin)) continue;
        const adult = base! * factor;
        const taxes = adult * 0.2;
        fares.push({
          id: nextUuid(), departureId: dp.id, flightNumber: dp.flightNumber, fareFamilyId: fm.id, fareBrand: fm.code, cabinClass: cabin, currency: 'USD',
          extraBagPrice: '15.00', changeFee: money(adult * 0.2),
          prices: [{ passengerType: 'ADULT', baseFare: money(adult), taxes: money(taxes), total: money(adult + taxes) }], active: true,
        });
      }
    }
  });

  return { countries: [ec], cities, airports, airlines, aircraftModels, fareFamilies, seatMaps, flightNumbers, departures, fares };
}
