import { optionSource, type ResourceConfig } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { ActiveBadge } from '@/shared/ui';
import { CityCreateSchema, CityEditSchema, type CityValues } from './schemas';

const t = es.entities.cities;
const countries = optionSource('countries', { value: (c) => c.code, label: (c) => `${c.code} — ${c.name}` });

export const citiesConfig: ResourceConfig<'cities', CityValues> = {
  resource: 'cities',
  noun: t.noun,
  feminine: true,
  title: t.title,
  idOf: (c) => c.id,
  isActive: (c) => c.active,
  invalidates: ['airports'],
  columns: [
    { id: 'name', header: t.cols.name, cell: (c) => c.name, sortValue: (c) => c.name },
    { id: 'country', header: t.cols.country, cell: (c) => c.country, sortValue: (c) => c.country },
    { id: 'timeZone', header: t.cols.timeZone, cell: (c) => <span className="font-mono">{c.timeZone}</span>, sortValue: (c) => c.timeZone },
    { id: 'state', header: es.common.state, cell: (c) => <ActiveBadge active={c.active} />, sortValue: (c) => (c.active ? 0 : 1) },
  ],
  searchText: (c) => `${c.name} ${c.country} ${c.timeZone} ${c.id}`,
  filters: [{ name: 'country', label: t.filters.country, kind: 'select', source: countries }],
  detail: {
    rows: (c) => [
      { label: t.detail.name, value: c.name },
      { label: t.detail.country, value: c.country },
      { label: t.detail.timeZone, value: <span className="font-mono">{c.timeZone}</span> },
      { label: t.detail.id, value: <span className="font-mono">{c.id}</span> },
      { label: t.detail.state, value: <ActiveBadge active={c.active} /> },
    ],
  },
  form: {
    fields: [
      { kind: 'select', name: 'country', label: t.fields.country, source: countries, createOnly: true },
      { kind: 'text', name: 'name', label: t.fields.name, maxLength: 100 },
      { kind: 'text', name: 'timeZone', label: t.fields.timeZone, maxLength: 60, hint: t.fieldHints.timeZone, placeholder: 'America/Guayaquil', optional: true },
    ],
    createSchema: CityCreateSchema,
    editSchema: CityEditSchema as never,
    defaults: (c) => ({ country: c?.country ?? '', name: c?.name ?? '', timeZone: c?.timeZone ?? '' }),
    toCreate: (v) => ({ country: v.country, name: v.name, ...(v.timeZone ? { timeZone: v.timeZone } : {}) }),
    toUpdate: (v, c) => {
      const body: { name?: string; timeZone?: string } = {};
      if (v.name !== c.name) body.name = v.name;
      if (v.timeZone && v.timeZone !== c.timeZone) body.timeZone = v.timeZone;
      return Object.keys(body).length ? body : null;
    },
  },
};
