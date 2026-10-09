import type { ResourceConfig } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { ActiveBadge } from '@/shared/ui';
import { AircraftModelCreateSchema, AircraftModelEditSchema, type AircraftModelValues } from './schemas';

const t = es.entities.aircraftModels;

export const aircraftModelsConfig: ResourceConfig<'aircraftModels', AircraftModelValues> = {
  resource: 'aircraftModels',
  noun: t.noun,
  title: t.title,
  idOf: (m) => m.code,
  isActive: (m) => m.active,
  invalidates: ['seatMaps'],
  columns: [
    { id: 'code', header: t.cols.code, cell: (m) => <span className="font-mono font-bold">{m.code}</span>, sortValue: (m) => m.code },
    { id: 'name', header: t.cols.name, cell: (m) => m.name, sortValue: (m) => m.name },
    { id: 'state', header: es.common.state, cell: (m) => <ActiveBadge active={m.active} />, sortValue: (m) => (m.active ? 0 : 1) },
  ],
  searchText: (m) => `${m.code} ${m.name}`,
  detail: {
    rows: (m) => [
      { label: t.detail.code, value: <span className="font-mono">{m.code}</span> },
      { label: t.detail.name, value: m.name },
      { label: t.detail.state, value: <ActiveBadge active={m.active} /> },
    ],
  },
  form: {
    fields: [
      { kind: 'text', name: 'code', label: t.fields.code, upper: true, maxLength: 3, createOnly: true },
      { kind: 'text', name: 'name', label: t.fields.name, maxLength: 100 },
    ],
    createSchema: AircraftModelCreateSchema,
    editSchema: AircraftModelEditSchema as never,
    defaults: (m) => ({ code: m?.code ?? '', name: m?.name ?? '' }),
    toCreate: (v) => ({ code: v.code, name: v.name }),
    toUpdate: (v, m) => (v.name !== m.name ? { name: v.name } : null),
  },
};
