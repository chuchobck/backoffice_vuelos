import { routes } from '@/app/routes';
import { DEPARTURE_STATUSES, type Departure } from '@/shared/api';
import type { ResourceConfig } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { datetimeLocalToUtc, utcToDatetimeLocal, zoneLabel } from '@/shared/lib/dates';
import { cabinLabel, statusLabel } from '@/shared/lib/labels';
import { ZonedTime } from '@/shared/ui';
import { DepartureStatusBadge } from './DepartureStatusBadge';
import { departureEditSchema, type DepartureValues } from './schemas';

const t = es.entities.departures;
const FLIGHT_PATTERN = /^[A-Z0-9]{2}[1-9][0-9]{0,3}$/;
const EDITABLE_STATUSES = DEPARTURE_STATUSES.filter((s) => s !== 'CANCELLED');
const cabinsText = (d: Departure) => d.cabins.map((c) => `${cabinLabel(c.cabinClass)} ${c.availableSeats}/${c.totalSeats}`).join(' · ');

/** Sin la zona real de los aeropuertos (aún cargando) se usa la de Ecuador continental. */
export function buildDeparturesConfig(zoneOf: (airport: string) => string, initialFlight?: string): ResourceConfig<'departures', DepartureValues> {
  return {
    resource: 'departures',
    noun: t.noun,
    title: t.title,
    idOf: (d) => d.id,
    isActive: (d) => d.active,
    invalidates: ['fares'],
    columns: [
      { id: 'flight', header: t.cols.flight, cell: (d) => <span className="font-mono font-bold">{d.flightNumber}</span>, sortValue: (d) => d.flightNumber },
      { id: 'route', header: t.cols.route, cell: (d) => `${d.origin} → ${d.destination}`, sortValue: (d) => `${d.origin}${d.destination}` },
      { id: 'departure', header: t.cols.departure, cell: (d) => <ZonedTime iso={d.scheduledDeparture} airport={d.origin} />, sortValue: (d) => d.scheduledDeparture },
      { id: 'arrival', header: t.cols.arrival, cell: (d) => <ZonedTime iso={d.scheduledArrival} airport={d.destination} />, sortValue: (d) => d.scheduledArrival },
      { id: 'cabins', header: t.cols.cabins, cell: (d) => cabinsText(d) },
      { id: 'status', header: t.cols.status, cell: (d) => <DepartureStatusBadge status={d.status} />, sortValue: (d) => d.status },
    ],
    searchText: (d) => `${d.flightNumber} ${d.origin} ${d.destination} ${d.departureDate} ${statusLabel(d.status)} ${d.aircraftModel} ${d.id}`,
    createLink: { to: routes.createFlight(), label: t.createFlight },
    deactivation: {
      label: t.cancel.label,
      title: es.crud.cancelDepartureTitle,
      text: es.crud.cancelDepartureText,
      ariaLabel: `${t.cancel.label} {id}`,
    },
    initialFilters: initialFlight ? { flightNumber: initialFlight } : undefined,
    filters: [
      { name: 'flightNumber', label: t.filters.flightNumber, kind: 'text', upper: true, maxLength: 6, pattern: FLIGHT_PATTERN, patternMessage: es.validation.flightNumber, placeholder: 'AV1500' },
      { name: 'dateFrom', label: t.filters.dateFrom, kind: 'date' },
      { name: 'dateTo', label: t.filters.dateTo, kind: 'date' },
      { name: 'status', label: t.filters.status, kind: 'select', options: DEPARTURE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) },
    ],
    detail: {
      rows: (d) => [
        { label: t.detail.flight, value: <span className="font-mono">{d.flightNumber}</span> },
        { label: t.detail.route, value: `${d.origin} → ${d.destination}` },
        { label: t.detail.departure, value: <ZonedTime iso={d.scheduledDeparture} airport={d.origin} /> },
        { label: t.detail.arrival, value: <ZonedTime iso={d.scheduledArrival} airport={d.destination} /> },
        { label: t.detail.departureUtc, value: <span className="font-mono">{d.scheduledDeparture}</span> },
        { label: t.detail.arrivalUtc, value: <span className="font-mono">{d.scheduledArrival}</span> },
        { label: t.detail.terminals, value: `${d.departureTerminal ?? es.common.dash} → ${d.arrivalTerminal ?? es.common.dash}` },
        { label: t.detail.aircraft, value: d.aircraftModel },
        { label: t.detail.seatMap, value: <span className="font-mono">{d.seatMapId}</span> },
        { label: t.detail.cabins, value: cabinsText(d) },
        { label: t.detail.status, value: <DepartureStatusBadge status={d.status} /> },
        { label: t.detail.state, value: d.active ? es.crud.stateActive : es.crud.stateInactive },
      ],
    },
    form: {
      fields: (d) => {
        const dep = d ? zoneLabel(zoneOf(d.origin)) : '';
        const arr = d ? zoneLabel(zoneOf(d.destination)) : '';
        return [
          { kind: 'text', inputType: 'datetime-local', name: 'scheduledDeparture', label: t.fields.scheduledDeparture, hint: d ? fmt(t.fieldHints.scheduledDeparture, { airport: d.origin, zone: dep }) : undefined },
          { kind: 'text', inputType: 'datetime-local', name: 'scheduledArrival', label: t.fields.scheduledArrival, hint: d ? fmt(t.fieldHints.scheduledArrival, { airport: d.destination, zone: arr }) : undefined },
          { kind: 'text', name: 'departureTerminal', label: t.fields.departureTerminal, maxLength: 10, optional: true },
          { kind: 'text', name: 'arrivalTerminal', label: t.fields.arrivalTerminal, maxLength: 10, optional: true },
          { kind: 'select', name: 'status', label: t.fields.status, hint: t.fieldHints.status, options: EDITABLE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) },
        ];
      },
      // No se crea con este formulario: las salidas se crean con el asistente (createLink).
      createSchema: departureEditSchema('America/Guayaquil', 'America/Guayaquil'),
      editSchema: (d) => departureEditSchema(zoneOf(d.origin), zoneOf(d.destination)),
      defaults: (d) => ({
        scheduledDeparture: d ? utcToDatetimeLocal(d.scheduledDeparture, zoneOf(d.origin)) : '',
        scheduledArrival: d ? utcToDatetimeLocal(d.scheduledArrival, zoneOf(d.destination)) : '',
        departureTerminal: d?.departureTerminal ?? '',
        arrivalTerminal: d?.arrivalTerminal ?? '',
        status: d?.status ?? 'SCHEDULED',
      }),
      toCreate: () => {
        throw new Error('Las salidas se crean con el asistente');
      },
      toUpdate: (v, d) => {
        const body: Record<string, string | null> = {};
        const dep = datetimeLocalToUtc(v.scheduledDeparture, zoneOf(d.origin));
        const arr = datetimeLocalToUtc(v.scheduledArrival, zoneOf(d.destination));
        if (dep !== d.scheduledDeparture) body.scheduledDeparture = dep;
        if (arr !== d.scheduledArrival) body.scheduledArrival = arr;
        if (v.departureTerminal !== (d.departureTerminal ?? '')) body.departureTerminal = v.departureTerminal === '' ? null : v.departureTerminal;
        if (v.arrivalTerminal !== (d.arrivalTerminal ?? '')) body.arrivalTerminal = v.arrivalTerminal === '' ? null : v.arrivalTerminal;
        if (v.status !== d.status) body.status = v.status;
        return Object.keys(body).length ? (body as never) : null;
      },
    },
    noCreate: true,
  };
}
