import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ALL_PAGES_CAP } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { CountCard } from './CountCard';

const t = es.dashboard;

/** Panel inicial: conteos reales de registros activos (todas las páginas, hasta el tope) y atajos. */
export function DashboardScreen() {
  const cards = [
    { resource: 'departures', label: es.nav.departures, to: routes.departures() },
    { resource: 'flightNumbers', label: es.nav.flightNumbers, to: routes.flightNumbers() },
    { resource: 'fares', label: es.nav.fares, to: routes.fares() },
    { resource: 'airports', label: es.nav.airports, to: routes.airports() },
    { resource: 'airlines', label: es.nav.airlines, to: routes.airlines() },
    { resource: 'aircraftModels', label: es.nav.aircraftModels, to: routes.aircraftModels() },
    { resource: 'fareFamilies', label: es.nav.fareFamilies, to: routes.fareFamilies() },
    { resource: 'seatMaps', label: es.nav.seatMaps, to: routes.seatMaps() },
    { resource: 'cities', label: es.nav.cities, to: routes.cities() },
    { resource: 'countries', label: es.nav.countries, to: routes.countries() },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="dash-counts" className="flex flex-col gap-3">
        <h2 id="dash-counts" className="text-xl">{t.countsTitle}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((c) => (
            <CountCard key={c.resource} resource={c.resource} label={c.label} to={c.to} />
          ))}
        </ul>
        <p className="text-sm text-muted">{fmt(t.capNote, { cap: ALL_PAGES_CAP })}</p>
      </section>

      <section aria-labelledby="dash-control" className="flex flex-col gap-3">
        <h2 id="dash-control" className="text-xl">{t.controlTitle}</h2>
        <p className="text-muted">{t.controlText}</p>
        <ul className="flex flex-wrap gap-4">
          <li><Link to={routes.bookings()} className="inline-flex min-h-11 items-center">{es.nav.bookings}</Link></li>
          <li><Link to={routes.admins()} className="inline-flex min-h-11 items-center">{es.nav.admins}</Link></li>
          <li><Link to={routes.audit()} className="inline-flex min-h-11 items-center">{es.nav.audit}</Link></li>
        </ul>
      </section>

      <div>
        <Button asChild>
          <Link to={routes.createFlight()}>{t.createFlight}</Link>
        </Button>
      </div>
    </div>
  );
}
