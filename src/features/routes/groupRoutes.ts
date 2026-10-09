import type { FlightNumber } from '@/shared/api';

export interface RouteRow {
  key: string;
  origin: string;
  destination: string;
  flights: string[];
}

/** Agrupa los números de vuelo activos por par origen → destino. */
export function groupRoutes(flights: FlightNumber[]): RouteRow[] {
  const map = new Map<string, RouteRow>();
  for (const f of flights) {
    if (!f.active) continue;
    const key = `${f.origin}-${f.destination}`;
    const row = map.get(key) ?? { key, origin: f.origin, destination: f.destination, flights: [] };
    row.flights.push(f.flightNumber);
    map.set(key, row);
  }
  return [...map.values()].map((r) => ({ ...r, flights: r.flights.sort() })).sort((a, b) => a.key.localeCompare(b.key));
}
