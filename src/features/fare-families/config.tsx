import { optionSource, type ResourceConfig } from '@/shared/crud';
import { CABIN_CLASSES, type FareFamily } from '@/shared/api';
import { es } from '@/shared/i18n';
import { cabinLabel } from '@/shared/lib/labels';
import { ActiveBadge } from '@/shared/ui';
import { FareFamilyCreateSchema, FareFamilyEditSchema, type FareFamilyValues } from './schemas';

const t = es.entities.fareFamilies;
const airlines = optionSource('airlines', { value: (a) => a.code, label: (a) => `${a.code} — ${a.name}` });
const cabinOptions = CABIN_CLASSES.map((c) => ({ value: c, label: cabinLabel(c) }));
const yesNo = (b: boolean) => (b ? es.common.yes : es.common.no);

const toValues = (f?: FareFamily): FareFamilyValues => ({
  airline: f?.airline ?? '',
  cabinClass: f?.cabinClass ?? '',
  code: f?.code ?? '',
  name: f?.name ?? '',
  changeable: f?.changeable ?? false,
  cancellationPenaltyPercent: f?.cancellationPenaltyPercent ?? '0',
  personalItemIncluded: f?.personalItemIncluded ?? true,
  carryOnBagsIncluded: String(f?.carryOnBagsIncluded ?? 1),
  checkedBagsIncluded: String(f?.checkedBagsIncluded ?? 0),
  maxExtraBags: String(f?.maxExtraBags ?? 2),
});

export const fareFamiliesConfig: ResourceConfig<'fareFamilies', FareFamilyValues> = {
  resource: 'fareFamilies',
  noun: t.noun,
  feminine: true,
  title: t.title,
  idOf: (f) => f.id,
  isActive: (f) => f.active,
  invalidates: ['fares'],
  columns: [
    { id: 'airline', header: t.cols.airline, cell: (f) => f.airline, sortValue: (f) => f.airline },
    { id: 'cabin', header: t.cols.cabin, cell: (f) => cabinLabel(f.cabinClass), sortValue: (f) => f.cabinClass },
    { id: 'code', header: t.cols.code, cell: (f) => <span className="font-mono font-bold">{f.code}</span>, sortValue: (f) => f.code },
    { id: 'name', header: t.cols.name, cell: (f) => f.name, sortValue: (f) => f.name },
    { id: 'changeable', header: t.cols.changeable, cell: (f) => yesNo(f.changeable), sortValue: (f) => (f.changeable ? 1 : 0) },
    { id: 'penalty', header: t.cols.penalty, cell: (f) => `${f.cancellationPenaltyPercent} %`, sortValue: (f) => Number(f.cancellationPenaltyPercent) },
    { id: 'bags', header: t.cols.bags, cell: (f) => f.checkedBagsIncluded, sortValue: (f) => f.checkedBagsIncluded },
    { id: 'state', header: es.common.state, cell: (f) => <ActiveBadge active={f.active} />, sortValue: (f) => (f.active ? 0 : 1) },
  ],
  searchText: (f) => `${f.airline} ${cabinLabel(f.cabinClass)} ${f.cabinClass} ${f.code} ${f.name}`,
  filters: [
    { name: 'airline', label: t.filters.airline, kind: 'select', source: airlines },
    { name: 'cabinClass', label: t.filters.cabin, kind: 'select', options: cabinOptions },
  ],
  detail: {
    rows: (f) => [
      { label: t.detail.airline, value: f.airline },
      { label: t.detail.cabin, value: cabinLabel(f.cabinClass) },
      { label: t.detail.code, value: <span className="font-mono">{f.code}</span> },
      { label: t.detail.name, value: f.name },
      { label: t.detail.changeable, value: yesNo(f.changeable) },
      { label: t.detail.penalty, value: `${f.cancellationPenaltyPercent} %` },
      { label: t.detail.refundable, value: yesNo(f.refundable) },
      { label: t.detail.personal, value: yesNo(f.personalItemIncluded) },
      { label: t.detail.carryOn, value: f.carryOnBagsIncluded },
      { label: t.detail.checked, value: f.checkedBagsIncluded },
      { label: t.detail.maxExtra, value: f.maxExtraBags },
      { label: t.detail.state, value: <ActiveBadge active={f.active} /> },
    ],
  },
  form: {
    fields: [
      { kind: 'select', name: 'airline', label: t.fields.airline, source: airlines, createOnly: true },
      { kind: 'select', name: 'cabinClass', label: t.fields.cabinClass, options: cabinOptions, createOnly: true },
      { kind: 'text', name: 'code', label: t.fields.code, upper: true, maxLength: 20, createOnly: true },
      { kind: 'text', name: 'name', label: t.fields.name, maxLength: 100 },
      { kind: 'checkbox', name: 'changeable', label: t.fields.changeable },
      { kind: 'text', name: 'cancellationPenaltyPercent', label: t.fields.cancellationPenaltyPercent, inputMode: 'decimal', maxLength: 6 },
      { kind: 'checkbox', name: 'personalItemIncluded', label: t.fields.personalItemIncluded },
      { kind: 'text', name: 'carryOnBagsIncluded', label: t.fields.carryOnBagsIncluded, inputMode: 'numeric', maxLength: 1 },
      { kind: 'text', name: 'checkedBagsIncluded', label: t.fields.checkedBagsIncluded, inputMode: 'numeric', maxLength: 1 },
      { kind: 'text', name: 'maxExtraBags', label: t.fields.maxExtraBags, inputMode: 'numeric', maxLength: 2 },
    ],
    createSchema: FareFamilyCreateSchema,
    editSchema: FareFamilyEditSchema as never,
    defaults: toValues,
    toCreate: (v) => ({
      airline: v.airline,
      cabinClass: v.cabinClass as FareFamily['cabinClass'],
      code: v.code,
      name: v.name,
      changeable: v.changeable,
      cancellationPenaltyPercent: v.cancellationPenaltyPercent,
      personalItemIncluded: v.personalItemIncluded,
      carryOnBagsIncluded: Number(v.carryOnBagsIncluded),
      checkedBagsIncluded: Number(v.checkedBagsIncluded),
      maxExtraBags: Number(v.maxExtraBags),
    }),
    toUpdate: (v, f) => {
      const body: Record<string, string | number | boolean> = {};
      if (v.name !== f.name) body.name = v.name;
      if (v.changeable !== f.changeable) body.changeable = v.changeable;
      if (Number(v.cancellationPenaltyPercent) !== Number(f.cancellationPenaltyPercent)) body.cancellationPenaltyPercent = v.cancellationPenaltyPercent;
      if (v.personalItemIncluded !== f.personalItemIncluded) body.personalItemIncluded = v.personalItemIncluded;
      if (Number(v.carryOnBagsIncluded) !== f.carryOnBagsIncluded) body.carryOnBagsIncluded = Number(v.carryOnBagsIncluded);
      if (Number(v.checkedBagsIncluded) !== f.checkedBagsIncluded) body.checkedBagsIncluded = Number(v.checkedBagsIncluded);
      if (Number(v.maxExtraBags) !== f.maxExtraBags) body.maxExtraBags = Number(v.maxExtraBags);
      return Object.keys(body).length ? body : null;
    },
  },
};
