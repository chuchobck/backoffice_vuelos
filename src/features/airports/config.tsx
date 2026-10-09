import { optionSource, type ResourceConfig } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { ActiveBadge } from '@/shared/ui';
import { AirportCreateSchema, AirportEditSchema, type AirportValues } from './schemas';

const t = es.entities.airports;

const cities = optionSource('cities', { value: (c) => c.id, label: (c) => `${c.name} (${c.country})` });
const countries = optionSource('countries', { value: (c) => c.code, label: (c) => `${c.code} — ${c.name}` });

/** Aeropuertos: el modelo de CRUD (los demás listados siguen esta misma forma). */
export const airportsConfig: ResourceConfig<'airports', AirportValues> = {
  resource: 'airports',
  noun: t.noun,
  title: t.title,
  idOf: (a) => a.code,
  isActive: (a) => a.active,
  invalidates: ['flightNumbers'],
  columns: [
    { id: 'code', header: t.cols.code, cell: (a) => <span className="font-mono font-bold">{a.code}</span>, sortValue: (a) => a.code },
    { id: 'name', header: t.cols.name, cell: (a) => a.name, sortValue: (a) => a.name },
    { id: 'city', header: t.cols.city, cell: (a) => a.cityName, sortValue: (a) => a.cityName },
    { id: 'country', header: t.cols.country, cell: (a) => a.country, sortValue: (a) => a.country },
    { id: 'state', header: es.common.state, cell: (a) => <ActiveBadge active={a.active} />, sortValue: (a) => (a.active ? 0 : 1) },
  ],
  searchText: (a) => `${a.code} ${a.name} ${a.cityName} ${a.country}`,
  filters: [{ name: 'country', label: t.filters.country, kind: 'select', source: countries }],
  detail: {
    rows: (a) => [
      { label: t.detail.code, value: <span className="font-mono">{a.code}</span> },
      { label: t.detail.name, value: a.name },
      { label: t.detail.city, value: `${a.cityName} (${a.cityId})` },
      { label: t.detail.country, value: a.country },
      { label: t.detail.state, value: <ActiveBadge active={a.active} /> },
    ],
  },
  form: {
    fields: [
      { kind: 'text', name: 'code', label: t.fields.code, upper: true, maxLength: 3, createOnly: true },
      { kind: 'text', name: 'name', label: t.fields.name, maxLength: 150 },
      { kind: 'select', name: 'cityId', label: t.fields.cityId, source: cities },
    ],
    createSchema: AirportCreateSchema,
    editSchema: AirportEditSchema as never,
    defaults: (a) => ({ code: a?.code ?? '', name: a?.name ?? '', cityId: a?.cityId ?? '' }),
    toCreate: (v) => ({ code: v.code, name: v.name, cityId: v.cityId }),
    toUpdate: (v, a) => {
      const body: { name?: string; cityId?: string } = {};
      if (v.name !== a.name) body.name = v.name;
      if (v.cityId !== a.cityId) body.cityId = v.cityId;
      return Object.keys(body).length ? body : null;
    },
  },
};
