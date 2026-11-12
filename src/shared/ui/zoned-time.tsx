import { useAirportZones } from '@/shared/api';
import { formatLocal, formatLocalTime, zoneLabel } from '@/shared/lib/dates';

/** Hora local del aeropuerto, con la zona en el tooltip y para lectores de pantalla. */
/** `timeOnly` muestra solo la hora (p. ej. la de abordaje en una tabla de un solo día). */
export function ZonedTime({ iso, airport, timeOnly = false }: { iso: string | null; airport: string; timeOnly?: boolean }) {
  const { zoneOf } = useAirportZones();
  const zone = zoneOf(airport);
  return (
    <time dateTime={iso ?? undefined} title={`${zoneLabel(zone)} · ${iso ?? ''}`} className="whitespace-nowrap">
      {timeOnly ? formatLocalTime(iso, zone) : formatLocal(iso, zone)}
      <span className="sr-only"> ({zoneLabel(zone)})</span>
    </time>
  );
}
