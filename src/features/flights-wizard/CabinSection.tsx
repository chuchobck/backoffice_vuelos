import { useMemo } from 'react';
import { Controller, type Control, type FieldErrors, type FieldValues, type UseFormRegister } from 'react-hook-form';
import type { CabinClass, FareFamily } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { checkCabinDuplicates, checkFare, type FareWarning } from '@/shared/lib/fareChecks';
import { cabinLabel } from '@/shared/lib/labels';
import { addMoney, toCents } from '@/shared/lib/money';
import { Alert, Checkbox, FareWarningList, Field, Input } from '@/shared/ui';
import { FamilyPricing } from './FamilyPricing';

const t = es.wizard.cabins;

interface Props {
  cabin: { cabinClass: CabinClass; seats: number };
  families: FareFamily[];
  register: UseFormRegister<FieldValues>;
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  /** Todo lo escrito en el paso (watch). */
  values: { currency?: string; cabins?: Record<string, { on: boolean }>; families?: Record<string, Record<string, string> & { on?: boolean }> };
  galapagos: boolean;
  idOf: (name: string) => string;
}

/** Una cabina del mapa: casilla para venderla, cupo y las familias tarifarias de su aerolínea con sus precios. */
export function CabinSection({ cabin, families, register, control, errors, values, galapagos, idOf }: Props) {
  const on = values.cabins?.[cabin.cabinClass]?.on === true;
  const seatsError = ((errors.cabins as Record<string, { seats?: { message?: string } }> | undefined)?.[cabin.cabinClass]?.seats?.message) ?? undefined;
  const currency = values.currency ?? 'USD';

  // Avisos de cordura (no bloquean): monto fuera de rango y familias de la misma cabina con el mismo precio.
  const warnings = useMemo<FareWarning[]>(() => {
    if (!on) return [];
    const rows = families
      .filter((fam) => values.families?.[fam.id]?.on)
      .map((fam) => {
        const fv = values.families![fam.id]!;
        const total = addMoney((fv.adultBase ?? '').trim(), (fv.adultTaxes ?? '').trim());
        return { name: fam.code, adultTotalCents: total === null ? null : toCents(total) };
      });
    const ranges = rows.flatMap((r) => (r.adultTotalCents === null ? [] : checkFare({ adultTotalCents: r.adultTotalCents, currency, galapagos, cabin: cabin.cabinClass, name: r.name, peers: [] })));
    return [...ranges, ...checkCabinDuplicates(cabin.cabinClass, rows)];
  }, [on, families, values, currency, galapagos, cabin.cabinClass]);

  return (
    <fieldset className="flex flex-col gap-4 rounded border-2 border-border p-4">
      <legend className="px-2 font-bold">{fmt(t.cabinLegend, { cabin: cabinLabel(cabin.cabinClass), seats: cabin.seats })}</legend>
      <Controller
        control={control}
        name={`cabins.${cabin.cabinClass}.on`}
        render={({ field }) => <Checkbox ref={field.ref} label={t.include} checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} />}
      />
      {on ? (
        <>
          <Field id={idOf(`${cabin.cabinClass}-seats`)} label={fmt(t.seats, { max: cabin.seats })} error={seatsError} required className="max-w-60">
            <Input {...register(`cabins.${cabin.cabinClass}.seats`)} inputMode="numeric" maxLength={3} autoComplete="off" />
          </Field>
          {families.length === 0 ? <Alert variant="warning"><p>{t.noFamilies}</p></Alert> : null}
          {families.map((fam) => (
            <FamilyPricing
              key={fam.id}
              family={fam}
              on={values.families?.[fam.id]?.on === true}
              register={register}
              control={control}
              errors={errors}
              values={(values.families?.[fam.id] ?? {}) as Record<string, string>}
              idOf={idOf}
            />
          ))}
          <FareWarningList warnings={warnings} currency={currency} />
        </>
      ) : null}
    </fieldset>
  );
}
