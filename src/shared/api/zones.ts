import { useMemo } from 'react';
import { ECUADOR_ZONE } from '@/shared/lib/dates';
import { useAllItems } from './queries';

/**
 * Zona horaria de cada aeropuerto (la de su ciudad: America/Guayaquil o Pacific/Galapagos).
 * Mientras cargan los catálogos se usa la de Ecuador continental.
 */
export function useAirportZones() {
  const airports = useAllItems('airports');
  const cities = useAllItems('cities');
  return useMemo(() => {
    const zoneByCity = new Map((cities.data?.items ?? []).map((c) => [c.id, c.timeZone]));
    const zoneByAirport = new Map((airports.data?.items ?? []).map((a) => [a.code, zoneByCity.get(a.cityId) ?? ECUADOR_ZONE]));
    return {
      ready: !!airports.data && !!cities.data,
      zoneOf: (airportCode: string): string => zoneByAirport.get(airportCode) ?? ECUADOR_ZONE,
    };
  }, [airports.data, cities.data]);
}
