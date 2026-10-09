import { useAirportZones } from '@/shared/api';
import { formatLocal, zoneLabel } from '@/shared/lib/dates';

/** Hora local del aeropuerto, con la zona en el tooltip y para lectores de pantalla. */
export function ZonedTime({ iso, airport }: { iso: string | null; airport: string }) {
  const { zoneOf } = useAirportZones();
  const zone = zoneOf(airport);
  return (
    <time dateTime={iso ?? undefined} title={`${zoneLabel(zone)} · ${iso ?? ''}`} className="whitespace-nowrap">
      {formatLocal(iso, zone)}
      <span className="sr-only"> ({zoneLabel(zone)})</span>
    </time>
  );
}
