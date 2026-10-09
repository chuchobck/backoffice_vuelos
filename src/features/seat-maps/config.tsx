import { optionSource, type ResourceConfig } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { cabinLabel } from '@/shared/lib/labels';
import { ActiveBadge } from '@/shared/ui';
import type { SeatMap, SeatMapSummary } from '@/shared/api';
import { SeatMapCreateDialog } from './SeatMapCreateDialog';
import { SeatMapEditSchema, type SeatMapValues } from './schemas';

const t = es.entities.seatMaps;
const airlines = optionSource('airlines', { value: (a) => a.code, label: (a) => `${a.code} — ${a.name}` });
const models = optionSource('aircraftModels', { value: (m) => m.code, label: (m) => `${m.name} (${m.code})` });

const cabinsText = (m: SeatMapSummary) => m.cabins.map((c) => `${cabinLabel(c.cabinClass)} ${c.seats}`).join(' · ');

function rowLines(map: SeatMap) {
  return map.rows.map((r) =>
    fmt(t.rowLine, {
      number: r.number,
      cabin: cabinLabel(r.cabinClass),
      letters: r.seats.map((s) => s.letter).join(''),
      flags: `${r.extraLegroom ? t.extraLegroom : ''}${r.emergencyExit ? t.emergencyExit : ''}`,
    }),
  );
}

/** Mapas de asientos: lista, detalle (con filas y asientos, GET /{id}), renombrar y baja. El alta tiene su propio diálogo. */
export const seatMapsConfig: ResourceConfig<'seatMaps', SeatMapValues> = {
  resource: 'seatMaps',
  noun: t.noun,
  title: t.title,
  idOf: (m) => m.id,
  isActive: (m) => m.active,
  invalidates: ['departures'],
  noCreate: true,
  createDialog: SeatMapCreateDialog,
  columns: [
    { id: 'name', header: t.cols.name, cell: (m) => m.name, sortValue: (m) => m.name },
    { id: 'airline', header: t.cols.airline, cell: (m) => m.airline, sortValue: (m) => m.airline },
    { id: 'model', header: t.cols.model, cell: (m) => m.aircraftModel, sortValue: (m) => m.aircraftModel },
    { id: 'cabins', header: t.cols.cabins, cell: (m) => cabinsText(m), sortValue: (m) => m.cabins.reduce((n, c) => n + c.seats, 0) },
    { id: 'state', header: es.common.state, cell: (m) => <ActiveBadge active={m.active} />, sortValue: (m) => (m.active ? 0 : 1) },
  ],
  searchText: (m) => `${m.name} ${m.airline} ${m.aircraftModel} ${cabinsText(m)}`,
  filters: [
    { name: 'airline', label: t.filters.airline, kind: 'select', source: airlines },
    { name: 'aircraftModel', label: t.filters.model, kind: 'select', source: models },
  ],
  detail: {
    fetch: true,
    rows: (m) => [
      { label: t.detail.name, value: m.name },
      { label: t.detail.airline, value: m.airline },
      { label: t.detail.model, value: m.aircraftModel },
      { label: t.detail.cabins, value: cabinsText(m) },
      {
        label: t.detail.rows,
        value: (
          <div role="region" aria-label={t.detail.rows} tabIndex={0} className="relative max-h-60 overflow-y-auto">
            <ul className="font-mono text-sm">
              {rowLines(m).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ),
      },
      { label: t.detail.state, value: <ActiveBadge active={m.active} /> },
    ],
  },
  form: {
    fields: [{ kind: 'text', name: 'name', label: t.fields.name, maxLength: 150 }],
    createSchema: SeatMapEditSchema,
    editSchema: SeatMapEditSchema,
    defaults: (m) => ({ name: m?.name ?? '' }),
    toCreate: () => {
      throw new Error('El alta de mapas usa su propio diálogo');
    },
    toUpdate: (v, m) => (v.name !== m.name ? { name: v.name } : null),
  },
};
