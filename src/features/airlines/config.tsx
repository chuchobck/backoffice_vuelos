import type { ResourceConfig } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { ActiveBadge } from '@/shared/ui';
import { AirlineCreateSchema, AirlineEditSchema, type AirlineValues } from './schemas';

const t = es.entities.airlines;

export const airlinesConfig: ResourceConfig<'airlines', AirlineValues> = {
  resource: 'airlines',
  noun: t.noun,
  feminine: true,
  title: t.title,
  idOf: (a) => a.code,
  isActive: (a) => a.active,
  invalidates: ['flightNumbers', 'fareFamilies', 'seatMaps'],
  columns: [
    { id: 'code', header: t.cols.code, cell: (a) => <span className="font-mono font-bold">{a.code}</span>, sortValue: (a) => a.code },
    { id: 'name', header: t.cols.name, cell: (a) => a.name, sortValue: (a) => a.name },
    { id: 'ticketPrefix', header: t.cols.ticketPrefix, cell: (a) => a.ticketPrefix ?? es.common.dash, sortValue: (a) => a.ticketPrefix ?? '' },
    { id: 'state', header: es.common.state, cell: (a) => <ActiveBadge active={a.active} />, sortValue: (a) => (a.active ? 0 : 1) },
  ],
  searchText: (a) => `${a.code} ${a.name} ${a.ticketPrefix ?? ''}`,
  detail: {
    rows: (a) => [
      { label: t.detail.code, value: <span className="font-mono">{a.code}</span> },
      { label: t.detail.name, value: a.name },
      { label: t.detail.ticketPrefix, value: a.ticketPrefix ?? es.common.dash },
      { label: t.detail.state, value: <ActiveBadge active={a.active} /> },
    ],
  },
  form: {
    fields: [
      { kind: 'text', name: 'code', label: t.fields.code, upper: true, maxLength: 2, createOnly: true },
      { kind: 'text', name: 'name', label: t.fields.name, maxLength: 100 },
      { kind: 'text', name: 'ticketPrefix', label: t.fields.ticketPrefix, maxLength: 3, inputMode: 'numeric', optional: true },
    ],
    createSchema: AirlineCreateSchema,
    editSchema: AirlineEditSchema as never,
    defaults: (a) => ({ code: a?.code ?? '', name: a?.name ?? '', ticketPrefix: a?.ticketPrefix ?? '' }),
    toCreate: (v) => ({ code: v.code, name: v.name, ...(v.ticketPrefix ? { ticketPrefix: v.ticketPrefix } : {}) }),
    toUpdate: (v, a) => {
      const body: { name?: string; ticketPrefix?: string | null } = {};
      if (v.name !== a.name) body.name = v.name;
      if (v.ticketPrefix !== (a.ticketPrefix ?? '')) body.ticketPrefix = v.ticketPrefix === '' ? null : v.ticketPrefix;
      return Object.keys(body).length ? body : null;
    },
  },
};
