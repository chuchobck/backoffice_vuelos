import { optionSource, type ResourceConfig } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { ActiveBadge } from '@/shared/ui';
import { FlightNumberCreateSchema, FlightNumberEditSchema, type FlightNumberValues } from './schemas';

const t = es.entities.flightNumbers;
const airlines = optionSource('airlines', { value: (a) => a.code, label: (a) => `${a.code} — ${a.name}` });
const operating = optionSource('airlines', { value: (a) => a.code, label: (a) => `${a.code} — ${a.name}`, placeholder: t.sameAsMarketing });
const airports = optionSource('airports', { value: (a) => a.code, label: (a) => `${a.code} — ${a.cityName}` });

export const flightNumbersConfig: ResourceConfig<'flightNumbers', FlightNumberValues> = {
  resource: 'flightNumbers',
  noun: t.noun,
  title: t.title,
  idOf: (f) => f.flightNumber,
  isActive: (f) => f.active,
  invalidates: ['departures'],
  columns: [
    { id: 'flight', header: t.cols.flight, cell: (f) => <span className="font-mono font-bold">{f.flightNumber}</span>, sortValue: (f) => f.flightNumber },
    { id: 'marketing', header: t.cols.marketing, cell: (f) => f.marketingCarrier, sortValue: (f) => f.marketingCarrier },
    { id: 'operating', header: t.cols.operating, cell: (f) => f.operatingCarrier, sortValue: (f) => f.operatingCarrier },
    { id: 'origin', header: t.cols.origin, cell: (f) => f.origin, sortValue: (f) => f.origin },
    { id: 'destination', header: t.cols.destination, cell: (f) => f.destination, sortValue: (f) => f.destination },
    { id: 'state', header: es.common.state, cell: (f) => <ActiveBadge active={f.active} />, sortValue: (f) => (f.active ? 0 : 1) },
  ],
  searchText: (f) => `${f.flightNumber} ${f.marketingCarrier} ${f.operatingCarrier} ${f.origin} ${f.destination}`,
  filters: [
    { name: 'airline', label: t.filters.airline, kind: 'select', source: airlines },
    { name: 'origin', label: t.filters.origin, kind: 'select', source: airports },
    { name: 'destination', label: t.filters.destination, kind: 'select', source: airports },
  ],
  detail: {
    rows: (f) => [
      { label: t.detail.flight, value: <span className="font-mono">{f.flightNumber}</span> },
      { label: t.detail.marketing, value: f.marketingCarrier },
      { label: t.detail.operating, value: f.operatingCarrier },
      { label: t.detail.route, value: `${f.origin} → ${f.destination}` },
      { label: t.detail.state, value: <ActiveBadge active={f.active} /> },
    ],
  },
  form: {
    fields: [
      { kind: 'select', name: 'marketingCarrier', label: t.fields.marketingCarrier, source: airlines, createOnly: true },
      { kind: 'text', name: 'number', label: t.fields.number, hint: t.fieldHints.number, inputMode: 'numeric', maxLength: 4, createOnly: true },
      { kind: 'select', name: 'origin', label: t.fields.origin, source: airports, createOnly: true },
      { kind: 'select', name: 'destination', label: t.fields.destination, source: airports, createOnly: true },
      { kind: 'select', name: 'operatingCarrier', label: t.fields.operatingCarrier, hint: t.fieldHints.operatingCarrier, source: operating, optional: true },
    ],
    createSchema: FlightNumberCreateSchema,
    editSchema: FlightNumberEditSchema as never,
    defaults: (f) => ({
      marketingCarrier: f?.marketingCarrier ?? '',
      number: f ? f.flightNumber.slice(f.marketingCarrier.length) : '',
      operatingCarrier: f?.operatingCarrier ?? '',
      origin: f?.origin ?? '',
      destination: f?.destination ?? '',
    }),
    toCreate: (v) => ({
      marketingCarrier: v.marketingCarrier,
      number: v.number,
      origin: v.origin,
      destination: v.destination,
      ...(v.operatingCarrier ? { operatingCarrier: v.operatingCarrier } : {}),
    }),
    toUpdate: (v, f) => (v.operatingCarrier && v.operatingCarrier !== f.operatingCarrier ? { operatingCarrier: v.operatingCarrier } : null),
  },
};
