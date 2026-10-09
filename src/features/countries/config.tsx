import type { ResourceConfig } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { ActiveBadge } from '@/shared/ui';
import { CountryCreateSchema, CountryEditSchema, type CountryValues } from './schemas';

const t = es.entities.countries;

export const countriesConfig: ResourceConfig<'countries', CountryValues> = {
  resource: 'countries',
  noun: t.noun,
  title: t.title,
  idOf: (c) => c.code,
  isActive: (c) => c.active,
  invalidates: ['cities'],
  columns: [
    { id: 'code', header: t.cols.code, cell: (c) => <span className="font-mono font-bold">{c.code}</span>, sortValue: (c) => c.code },
    { id: 'iso3', header: t.cols.iso3, cell: (c) => <span className="font-mono">{c.iso3}</span>, sortValue: (c) => c.iso3 },
    { id: 'name', header: t.cols.name, cell: (c) => c.name, sortValue: (c) => c.name },
    { id: 'state', header: es.common.state, cell: (c) => <ActiveBadge active={c.active} />, sortValue: (c) => (c.active ? 0 : 1) },
  ],
  searchText: (c) => `${c.code} ${c.iso3} ${c.name}`,
  detail: {
    rows: (c) => [
      { label: t.detail.code, value: <span className="font-mono">{c.code}</span> },
      { label: t.detail.iso3, value: <span className="font-mono">{c.iso3}</span> },
      { label: t.detail.name, value: c.name },
      { label: t.detail.state, value: <ActiveBadge active={c.active} /> },
    ],
  },
  form: {
    fields: [
      { kind: 'text', name: 'code', label: t.fields.code, upper: true, maxLength: 2, createOnly: true },
      { kind: 'text', name: 'iso3', label: t.fields.iso3, upper: true, maxLength: 3, createOnly: true },
      { kind: 'text', name: 'name', label: t.fields.name, maxLength: 100 },
    ],
    createSchema: CountryCreateSchema,
    editSchema: CountryEditSchema as never,
    defaults: (c) => ({ code: c?.code ?? '', iso3: c?.iso3 ?? '', name: c?.name ?? '' }),
    toCreate: (v) => ({ code: v.code, iso3: v.iso3, name: v.name }),
    toUpdate: (v, c) => (v.name !== c.name ? { name: v.name } : null),
  },
};
