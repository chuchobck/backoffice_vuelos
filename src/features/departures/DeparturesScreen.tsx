import { useMemo } from 'react';
import { useAirportZones } from '@/shared/api';
import { ResourceScreen } from '@/shared/crud';
import { buildDeparturesConfig } from './config';

/** Salidas programadas. `initialFlight` llega del enlace "Ver en la lista" del asistente. */
export function DeparturesScreen({ initialFlight }: { initialFlight?: string }) {
  const { zoneOf } = useAirportZones();
  const config = useMemo(() => buildDeparturesConfig(zoneOf, initialFlight), [zoneOf, initialFlight]);
  return <ResourceScreen config={config} />;
}
