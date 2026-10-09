import { optionSource, type ResourceConfig } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { cabinLabel, passengerLabel } from '@/shared/lib/labels';
import { ActiveBadge } from '@/shared/ui';
import { FareFormDialog } from './FareFormDialog';

const t = es.entities.fares;
const families = optionSource('fareFamilies', { value: (f) => f.id, label: (f) => `${f.airline} · ${f.name} (${f.code}) · ${cabinLabel(f.cabinClass)}` });

export const faresConfig: ResourceConfig<'fares'> = {
  resource: 'fares',
  noun: t.noun,
  feminine: true,
  title: t.title,
  idOf: (f) => f.id,
  isActive: (f) => f.active,
  createDialog: FareFormDialog,
  editDialog: FareFormDialog,
  columns: [
    { id: 'flight', header: t.cols.flight, cell: (f) => <span className="font-mono font-bold">{f.flightNumber}</span>, sortValue: (f) => f.flightNumber },
    { id: 'family', header: t.cols.family, cell: (f) => f.fareBrand, sortValue: (f) => f.fareBrand },
    { id: 'cabin', header: t.cols.cabin, cell: (f) => cabinLabel(f.cabinClass), sortValue: (f) => f.cabinClass },
    { id: 'currency', header: t.cols.currency, cell: (f) => f.currency, sortValue: (f) => f.currency },
    {
      id: 'adultTotal',
      header: t.cols.adultTotal,
      cell: (f) => <span className="tabular-nums">{f.prices.find((p) => p.passengerType === 'ADULT')?.total ?? es.common.dash}</span>,
      sortValue: (f) => Number(f.prices.find((p) => p.passengerType === 'ADULT')?.total ?? 0),
      className: 'text-right',
    },
    { id: 'bag', header: t.cols.bag, cell: (f) => <span className="tabular-nums">{f.extraBagPrice}</span>, sortValue: (f) => Number(f.extraBagPrice), className: 'text-right' },
    { id: 'change', header: t.cols.change, cell: (f) => <span className="tabular-nums">{f.changeFee}</span>, sortValue: (f) => Number(f.changeFee), className: 'text-right' },
    { id: 'state', header: es.common.state, cell: (f) => <ActiveBadge active={f.active} />, sortValue: (f) => (f.active ? 0 : 1) },
  ],
  searchText: (f) => `${f.flightNumber} ${f.fareBrand} ${cabinLabel(f.cabinClass)} ${f.currency} ${f.departureId}`,
  filters: [{ name: 'fareFamilyId', label: t.filters.family, kind: 'select', source: families }],
  detail: {
    rows: (f) => [
      { label: t.detail.flight, value: <span className="font-mono">{f.flightNumber}</span> },
      { label: t.detail.departure, value: <span className="font-mono break-all">{f.departureId}</span> },
      { label: t.detail.family, value: f.fareBrand },
      { label: t.detail.cabin, value: cabinLabel(f.cabinClass) },
      { label: t.detail.currency, value: f.currency },
      { label: t.detail.bag, value: f.extraBagPrice },
      { label: t.detail.change, value: f.changeFee },
      {
        label: t.detail.prices,
        value: (
          <ul>
            {f.prices.map((p) => (
              <li key={p.passengerType}>{fmt(t.priceLine, { type: passengerLabel(p.passengerType), base: p.baseFare, taxes: p.taxes, total: p.total })}</li>
            ))}
          </ul>
        ),
      },
      { label: t.detail.state, value: <ActiveBadge active={f.active} /> },
    ],
  },
};
